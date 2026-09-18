use super::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

const ACTIVE_NAMESPACE: &str = "workbenches";
const ACTIVE_KEY: &str = "active";
const MAX_NAME_CHARS: usize = 48;
const MAX_ICON_CHARS: usize = 48;
const MAX_THEME_CHARS: usize = 160;
const MAX_LAYOUT_CHARS: usize = 48;
const MAX_MODEL_ID_CHARS: usize = 256;
const MAX_JSON_BYTES: usize = 64 * 1024;
const UPDATE_FIELDS: &[&str] = &[
    "name",
    "icon",
    "themeId",
    "motionEnabled",
    "motionIntensity",
    "wallpaperOpacity",
    "layoutPreset",
    "modelRoles",
    "dashboardState",
];
const MODEL_ROLES: &[&str] = &["primary", "assistant", "vision", "image", "video"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkbenchProfile {
    pub id: String,
    pub name: String,
    pub template_id: String,
    pub icon: String,
    pub position: i64,
    pub theme_id: Option<String>,
    pub motion_enabled: bool,
    pub motion_intensity: i64,
    pub wallpaper_opacity: i64,
    pub layout_preset: String,
    pub last_project_path: Option<String>,
    pub last_session_id: Option<String>,
    pub model_roles: Value,
    pub dashboard_state: Value,
    pub project_paths: Vec<String>,
    pub session_ids: Vec<String>,
    pub data_version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkbenchState {
    pub active_workbench_id: String,
    pub workbenches: Vec<WorkbenchProfile>,
}

#[derive(Debug)]
struct WorkbenchRow {
    id: String,
    name: String,
    template_id: String,
    icon: String,
    position: i64,
    theme_id: Option<String>,
    motion_enabled: bool,
    motion_intensity: i64,
    wallpaper_opacity: i64,
    layout_preset: String,
    last_project_path: Option<String>,
    last_session_id: Option<String>,
    model_roles: Value,
    dashboard_state: Value,
    data_version: i64,
    created_at: i64,
    updated_at: i64,
}

fn valid_template(value: &str) -> bool {
    matches!(
        value,
        "coding" | "daily" | "creative" | "research" | "custom"
    )
}

fn validate_name(value: &str) -> Result<String> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > MAX_NAME_CHARS {
        return Err(anyhow!("workbench name is invalid"));
    }
    Ok(name.to_string())
}

fn validate_json(value: &Value, field: &str) -> Result<String> {
    if !value.is_object() {
        return Err(anyhow!("{field} must be an object"));
    }
    let encoded = serde_json::to_string(value)?;
    if encoded.len() > MAX_JSON_BYTES {
        return Err(anyhow!("{field} exceeds {MAX_JSON_BYTES} bytes"));
    }
    Ok(encoded)
}

fn validate_model_roles(value: &Value) -> Result<String> {
    let object = value
        .as_object()
        .ok_or_else(|| anyhow!("modelRoles must be an object"))?;
    for (role, binding) in object {
        if !MODEL_ROLES.contains(&role.as_str()) {
            return Err(anyhow!("modelRoles contains an unknown role"));
        }
        let binding = binding
            .as_object()
            .ok_or_else(|| anyhow!("modelRoles.{role} must be an object"))?;
        if binding
            .keys()
            .any(|key| key != "providerId" && key != "modelId")
        {
            return Err(anyhow!("modelRoles.{role} contains an unknown field"));
        }
        for key in ["providerId", "modelId"] {
            let value = binding
                .get(key)
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| anyhow!("modelRoles.{role}.{key} is invalid"))?;
            if value.chars().count() > MAX_MODEL_ID_CHARS {
                return Err(anyhow!("modelRoles.{role}.{key} is too long"));
            }
        }
    }
    validate_json(value, "modelRoles")
}

fn validate_bounded_text(value: &Value, field: &str, max_chars: usize) -> Result<String> {
    let value = value
        .as_str()
        .ok_or_else(|| anyhow!("{field} must be a string"))?
        .trim();
    if value.is_empty() || value.chars().count() > max_chars {
        return Err(anyhow!("{field} is invalid"));
    }
    Ok(value.to_string())
}

fn validate_theme(value: &Value) -> Result<Option<String>> {
    if value.is_null() {
        return Ok(None);
    }
    let theme = validate_bounded_text(value, "themeId", MAX_THEME_CHARS)?;
    let valid = matches!(
        theme.as_str(),
        "system" | "light" | "dark" | "polar-night" | "sakura-day" | "fortune-gold" | "deep-study"
    ) || theme.starts_with("plugin:");
    if !valid {
        return Err(anyhow!("themeId is invalid"));
    }
    Ok(Some(theme))
}

fn decode_json_object(raw: String, column: usize, field: &str) -> rusqlite::Result<Value> {
    let value: Value = serde_json::from_str(&raw).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            column,
            rusqlite::types::Type::Text,
            Box::new(error),
        )
    })?;
    if !value.is_object() {
        return Err(rusqlite::Error::FromSqlConversionFailure(
            column,
            rusqlite::types::Type::Text,
            anyhow!("{field} must be a JSON object").into(),
        ));
    }
    Ok(value)
}

fn template_defaults(template_id: &str) -> (&'static str, &'static str) {
    match template_id {
        "coding" => ("code-2", "polar-night"),
        "daily" => ("calendar-check-2", "sakura-day"),
        "creative" => ("palette", "fortune-gold"),
        "research" => ("library-big", "deep-study"),
        _ => ("layout-dashboard", "polar-night"),
    }
}

impl Database {
    pub fn ensure_default_workbenches(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM workbenches", [], |row| row.get(0))?;
        if count > 0 {
            return Ok(());
        }
        let now = now_ms();
        let defaults = [
            ("coding", "Coding", "code-2", "polar-night", 0),
            ("daily", "Daily", "calendar-check-2", "sakura-day", 1),
            ("creative", "Creative", "palette", "fortune-gold", 2),
            ("research", "Research", "library-big", "deep-study", 3),
        ];
        let tx = self.conn.unchecked_transaction()?;
        for (id, name, icon, theme, position) in defaults {
            tx.execute(
                "INSERT INTO workbenches (
                    id, name, template_id, icon, position, theme_id,
                    created_at, updated_at
                 ) VALUES (?1, ?2, ?1, ?3, ?4, ?5, ?6, ?6)",
                params![id, name, icon, position, theme, now],
            )?;
        }
        tx.execute(
            "INSERT INTO workbench_projects (workbench_id, project_id, position)
             SELECT 'coding', id, id FROM projects",
            [],
        )?;
        tx.execute(
            "INSERT INTO workbench_sessions (session_id, workbench_id)
             SELECT id, 'coding' FROM sessions WHERE deleted_at IS NULL",
            [],
        )?;
        tx.commit()?;
        self.kv_set(ACTIVE_NAMESPACE, ACTIVE_KEY, &json!("coding"))?;
        Ok(())
    }

    fn workbench_projects(&self, id: &str) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare_cached(
            "SELECT p.path FROM workbench_projects wp
             JOIN projects p ON p.id = wp.project_id
             WHERE wp.workbench_id = ?1 ORDER BY wp.position",
        )?;
        let rows = stmt.query_map(params![id], |row| row.get(0))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    fn workbench_sessions(&self, id: &str) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare_cached(
            "SELECT ws.session_id FROM workbench_sessions ws
             JOIN sessions s ON s.id = ws.session_id
             WHERE ws.workbench_id = ?1 AND s.deleted_at IS NULL
             ORDER BY s.updated_at DESC",
        )?;
        let rows = stmt.query_map(params![id], |row| row.get(0))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    fn row_to_profile(&self, row: WorkbenchRow) -> Result<WorkbenchProfile> {
        Ok(WorkbenchProfile {
            project_paths: self.workbench_projects(&row.id)?,
            session_ids: self.workbench_sessions(&row.id)?,
            id: row.id,
            name: row.name,
            template_id: row.template_id,
            icon: row.icon,
            position: row.position,
            theme_id: row.theme_id,
            motion_enabled: row.motion_enabled,
            motion_intensity: row.motion_intensity,
            wallpaper_opacity: row.wallpaper_opacity,
            layout_preset: row.layout_preset,
            last_project_path: row.last_project_path,
            last_session_id: row.last_session_id,
            model_roles: row.model_roles,
            dashboard_state: row.dashboard_state,
            data_version: row.data_version,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    fn select_workbench_rows(&self, filter_id: Option<&str>) -> Result<Vec<WorkbenchRow>> {
        let sql = if filter_id.is_some() {
            "SELECT id, name, template_id, icon, position, theme_id,
                    motion_enabled, motion_intensity, wallpaper_opacity,
                    layout_preset, last_project_path, last_session_id,
                    model_roles_json, dashboard_state_json, data_version,
                    created_at, updated_at
             FROM workbenches WHERE id = ?1 ORDER BY position, created_at"
        } else {
            "SELECT id, name, template_id, icon, position, theme_id,
                    motion_enabled, motion_intensity, wallpaper_opacity,
                    layout_preset, last_project_path, last_session_id,
                    model_roles_json, dashboard_state_json, data_version,
                    created_at, updated_at
             FROM workbenches ORDER BY position, created_at"
        };
        let mut stmt = self.conn.prepare_cached(sql)?;
        let read = |row: &rusqlite::Row<'_>| -> rusqlite::Result<WorkbenchRow> {
            let model_roles_raw: String = row.get(12)?;
            let dashboard_state_raw: String = row.get(13)?;
            Ok(WorkbenchRow {
                id: row.get(0)?,
                name: row.get(1)?,
                template_id: row.get(2)?,
                icon: row.get(3)?,
                position: row.get(4)?,
                theme_id: row.get(5)?,
                motion_enabled: row.get::<_, i64>(6)? != 0,
                motion_intensity: row.get(7)?,
                wallpaper_opacity: row.get(8)?,
                layout_preset: row.get(9)?,
                last_project_path: row.get(10)?,
                last_session_id: row.get(11)?,
                model_roles: decode_json_object(model_roles_raw, 12, "modelRoles")?,
                dashboard_state: decode_json_object(dashboard_state_raw, 13, "dashboardState")?,
                data_version: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        };
        if let Some(id) = filter_id {
            let rows = stmt.query_map(params![id], read)?;
            return rows
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(Into::into);
        }
        let rows = stmt.query_map([], read)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    }

    pub fn list_workbenches(&self) -> Result<WorkbenchState> {
        self.ensure_default_workbenches()?;
        let workbenches = self
            .select_workbench_rows(None)?
            .into_iter()
            .map(|row| self.row_to_profile(row))
            .collect::<Result<Vec<_>>>()?;
        let stored = self
            .kv_get(ACTIVE_NAMESPACE, ACTIVE_KEY)?
            .and_then(|value| value.as_str().map(str::to_string));
        let active_workbench_id = stored
            .filter(|id| workbenches.iter().any(|workbench| &workbench.id == id))
            .unwrap_or_else(|| workbenches[0].id.clone());
        Ok(WorkbenchState {
            active_workbench_id,
            workbenches,
        })
    }

    pub fn get_workbench(&self, id: &str) -> Result<Option<WorkbenchProfile>> {
        let row = self.select_workbench_rows(Some(id))?.into_iter().next();
        row.map(|value| self.row_to_profile(value)).transpose()
    }

    fn active_workbench_id(&self) -> Result<String> {
        self.ensure_default_workbenches()?;
        let stored = self
            .kv_get(ACTIVE_NAMESPACE, ACTIVE_KEY)?
            .and_then(|value| value.as_str().map(str::to_string));
        if let Some(id) = stored {
            let exists: bool = self.conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM workbenches WHERE id = ?1)",
                params![id],
                |row| row.get(0),
            )?;
            if exists {
                return Ok(id);
            }
        }
        self.conn
            .query_row(
                "SELECT id FROM workbenches ORDER BY position, created_at LIMIT 1",
                [],
                |row| row.get(0),
            )
            .map_err(Into::into)
    }

    pub(crate) fn associate_project_with_active_workbench(&self, project_id: i64) -> Result<()> {
        let workbench_id = self.active_workbench_id()?;
        let position: i64 = self.conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1
             FROM workbench_projects WHERE workbench_id = ?1",
            params![workbench_id],
            |row| row.get(0),
        )?;
        self.conn.execute(
            "INSERT INTO workbench_projects (workbench_id, project_id, position)
             VALUES (?1, ?2, ?3) ON CONFLICT(workbench_id, project_id) DO NOTHING",
            params![workbench_id, project_id, position],
        )?;
        Ok(())
    }

    pub(crate) fn associate_session_with_active_workbench(&self, session_id: &str) -> Result<()> {
        let workbench_id = self.active_workbench_id()?;
        self.conn.execute(
            "INSERT INTO workbench_sessions (session_id, workbench_id) VALUES (?1, ?2)
             ON CONFLICT(session_id) DO UPDATE SET workbench_id = excluded.workbench_id",
            params![session_id, workbench_id],
        )?;
        Ok(())
    }

    pub fn create_workbench(&self, name: &str, template_id: &str) -> Result<WorkbenchProfile> {
        let name = validate_name(name)?;
        if !valid_template(template_id) {
            return Err(anyhow!("workbench template is invalid"));
        }
        let id = Uuid::new_v4().to_string();
        let now = now_ms();
        let position: i64 = self.conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM workbenches",
            [],
            |row| row.get(0),
        )?;
        let (icon, theme) = template_defaults(template_id);
        self.conn.execute(
            "INSERT INTO workbenches (
                id, name, template_id, icon, position, theme_id, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![id, name, template_id, icon, position, theme, now],
        )?;
        self.get_workbench(&id)?
            .ok_or_else(|| anyhow!("workbench not found after create"))
    }

    pub fn update_workbench(&self, id: &str, patch: &Value) -> Result<WorkbenchProfile> {
        let Some(mut current) = self.get_workbench(id)? else {
            return Err(anyhow!("workbench not found"));
        };
        let object = patch
            .as_object()
            .ok_or_else(|| anyhow!("workbench patch must be an object"))?;
        if object
            .keys()
            .any(|key| !UPDATE_FIELDS.contains(&key.as_str()))
        {
            return Err(anyhow!("workbench patch contains an unknown field"));
        }
        if let Some(value) = object.get("name") {
            current.name = validate_name(
                value
                    .as_str()
                    .ok_or_else(|| anyhow!("name must be a string"))?,
            )?;
        }
        if let Some(value) = object.get("icon") {
            current.icon = validate_bounded_text(value, "icon", MAX_ICON_CHARS)?;
        }
        if let Some(value) = object.get("themeId") {
            current.theme_id = validate_theme(value)?;
        }
        if let Some(value) = object.get("motionEnabled") {
            current.motion_enabled = value
                .as_bool()
                .ok_or_else(|| anyhow!("motionEnabled must be a boolean"))?;
        }
        if let Some(value) = object.get("motionIntensity") {
            current.motion_intensity = value
                .as_i64()
                .ok_or_else(|| anyhow!("motionIntensity must be an integer"))?
                .clamp(0, 100);
        }
        if let Some(value) = object.get("wallpaperOpacity") {
            current.wallpaper_opacity = value
                .as_i64()
                .ok_or_else(|| anyhow!("wallpaperOpacity must be an integer"))?
                .clamp(0, 100);
        }
        if let Some(value) = object.get("layoutPreset") {
            current.layout_preset = validate_bounded_text(value, "layoutPreset", MAX_LAYOUT_CHARS)?;
        }
        let model_roles = object.get("modelRoles").unwrap_or(&current.model_roles);
        let dashboard_state = object
            .get("dashboardState")
            .unwrap_or(&current.dashboard_state);
        let model_roles_json = validate_model_roles(model_roles)?;
        let dashboard_state_json = validate_json(dashboard_state, "dashboardState")?;
        self.conn.execute(
            "UPDATE workbenches SET name = ?2, icon = ?3, theme_id = ?4,
                    motion_enabled = ?5, motion_intensity = ?6,
                    wallpaper_opacity = ?7, layout_preset = ?8,
                    model_roles_json = ?9, dashboard_state_json = ?10,
                    updated_at = ?11 WHERE id = ?1",
            params![
                id,
                current.name,
                current.icon,
                current.theme_id,
                current.motion_enabled as i64,
                current.motion_intensity,
                current.wallpaper_opacity,
                current.layout_preset,
                model_roles_json,
                dashboard_state_json,
                now_ms(),
            ],
        )?;
        self.get_workbench(id)?
            .ok_or_else(|| anyhow!("workbench not found after update"))
    }

    pub fn activate_workbench(
        &self,
        id: &str,
        project_path: Option<&str>,
        session_id: Option<&str>,
    ) -> Result<WorkbenchProfile> {
        let Some(current) = self.get_workbench(id)? else {
            return Err(anyhow!("workbench not found"));
        };
        let tx = self.conn.unchecked_transaction()?;
        let normalized_project = project_path.map(str::trim).filter(|path| !path.is_empty());
        if let Some(path) = normalized_project {
            let project_id = upsert_project_row(&tx, path, false)?;
            let position: i64 = tx.query_row(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM workbench_projects WHERE workbench_id = ?1",
                params![id],
                |row| row.get(0),
            )?;
            tx.execute(
                "INSERT INTO workbench_projects (workbench_id, project_id, position)
                 VALUES (?1, ?2, ?3) ON CONFLICT(workbench_id, project_id) DO NOTHING",
                params![id, project_id, position],
            )?;
        }
        let normalized_session = session_id.map(str::trim).filter(|value| !value.is_empty());
        if let Some(session_id) = normalized_session {
            let exists: bool = tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM sessions WHERE id = ?1 AND deleted_at IS NULL)",
                params![session_id],
                |row| row.get(0),
            )?;
            if !exists {
                return Err(anyhow!("session not found"));
            }
            tx.execute(
                "INSERT INTO workbench_sessions (session_id, workbench_id) VALUES (?1, ?2)
                 ON CONFLICT(session_id) DO UPDATE SET workbench_id = excluded.workbench_id",
                params![session_id, id],
            )?;
        }
        let last_project_path = normalized_project.or(current.last_project_path.as_deref());
        let last_session_id = normalized_session.or(current.last_session_id.as_deref());
        tx.execute(
            "UPDATE workbenches SET last_project_path = ?2, last_session_id = ?3,
                    updated_at = ?4 WHERE id = ?1",
            params![id, last_project_path, last_session_id, now_ms()],
        )?;
        tx.commit()?;
        self.kv_set(ACTIVE_NAMESPACE, ACTIVE_KEY, &json!(id))?;
        self.get_workbench(id)?
            .ok_or_else(|| anyhow!("workbench not found after activation"))
    }

    pub fn reorder_workbenches(&self, ids: &[String]) -> Result<Vec<WorkbenchProfile>> {
        let current = self.list_workbenches()?.workbenches;
        if ids.len() != current.len() {
            return Err(anyhow!("workbench order must include every workbench"));
        }
        let expected = current
            .iter()
            .map(|item| item.id.as_str())
            .collect::<std::collections::HashSet<_>>();
        let supplied = ids
            .iter()
            .map(String::as_str)
            .collect::<std::collections::HashSet<_>>();
        if expected != supplied || supplied.len() != ids.len() {
            return Err(anyhow!("workbench order contains unknown or duplicate ids"));
        }
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("UPDATE workbenches SET position = position + 1000000", [])?;
        for (position, id) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE workbenches SET position = ?2, updated_at = ?3 WHERE id = ?1",
                params![id, position as i64, now_ms()],
            )?;
        }
        tx.commit()?;
        Ok(self.list_workbenches()?.workbenches)
    }

    pub fn delete_workbench(&self, id: &str) -> Result<()> {
        let before = self.list_workbenches()?;
        if before.workbenches.len() <= 1 {
            return Err(anyhow!("the last workbench cannot be deleted"));
        }
        let changed = self
            .conn
            .execute("DELETE FROM workbenches WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(anyhow!("workbench not found"));
        }
        if before.active_workbench_id == id {
            let replacement = self.list_workbenches()?.workbenches[0].id.clone();
            self.kv_set(ACTIVE_NAMESPACE, ACTIVE_KEY, &json!(replacement))?;
        }
        Ok(())
    }
}
