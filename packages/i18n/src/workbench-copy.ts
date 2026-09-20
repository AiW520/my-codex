const english = {
  switcherLabel: "Switch workbench",
  switcherTitle: "Workbenches",
  workspaceLabel: "Workspace",
  savedLocally: "Saved locally when you leave the field.",
  launcherTitle: "Workbenches",
  launcherHint: "Choose a space",
  appearance: "Appearance",
  theme: "Theme",
  followGlobalTheme: "Follow global theme",
  motion: "Motion",
  motionIntensity: "Motion intensity",
  wallpaperOpacity: "Background intensity",
  themes: {
    "polar-night": "Polar Night",
    "sakura-day": "Sakura Day",
    "fortune-gold": "Fortune Gold",
    "deep-study": "Deep Study",
  },
  new: "New workbench",
  create: "Create",
  rename: "Rename workbench",
  moveUp: "Move earlier",
  delete: "Delete workbench",
  deleteConfirm: "Delete {{name}}? Projects and chats will be kept.",
  nameLabel: "Workbench name",
  namePlaceholder: "Name this workbench",
  templateLabel: "Template",
  templates: { coding: "Coding", daily: "Daily", creative: "Creative", research: "Research", custom: "Custom" },
  daily: {
    subtitle: "Tasks and notes for the day", progress: "{{completed}} of {{total}} done",
    tasks: "Today's tasks", tasksHint: "A focused local list without sample or cloud data.",
    taskPlaceholder: "Add a task", addTask: "Add", emptyTasks: "No tasks yet",
    markOpen: "Mark task open", markDone: "Mark task done", deleteTask: "Delete task",
    notes: "Notes", notesHint: "Capture context that belongs to this workbench.",
    notesPlaceholder: "Write notes for today…",
  },
  creative: {
    subtitle: "Prompts, model bindings, and generated assets", notConfigured: "Media runtime not configured",
    prompt: "Prompt", promptHint: "Prepare a brief while the generation adapter is unavailable.",
    promptPlaceholder: "Describe the image or video you want to create…", generate: "Generate",
    configureToGenerate: "Generation stays disabled until a real media adapter is configured.",
    settings: "Model bindings", settingsHint: "Bindings are saved to this workbench; they do not change a running chat.",
    imageModel: "Image model", videoModel: "Video model", unassigned: "Not assigned",
    assets: "Assets", assetsHint: "Completed media jobs will appear here when the media runtime exists.",
    emptyAssets: "No generated assets", emptyAssetsHint: "PI-Desktop will not display placeholder output as a successful generation.",
  },
  research: {
    subtitle: "Local sources and research notes", localOnly: "Local workspace", sources: "Sources",
    sourcesHint: "Keep an explicit reading list without fabricated citations.", sourceTitle: "Source title",
    sourceUrl: "https://example.com/source", addSource: "Add source", emptySources: "No sources added",
    deleteSource: "Delete source", notes: "Research notes", notesHint: "Synthesize findings in your own words.",
    notesPlaceholder: "Record questions, evidence, and conclusions…",
  },
};

export const workbenchEn = english;
export const workbenchZhCN = {
  ...english,
  switcherLabel: "切换工作台", switcherTitle: "工作台", workspaceLabel: "工作空间",
  savedLocally: "离开输入框时保存到本机。", new: "新建工作台", create: "创建",
  launcherTitle: "工作台", launcherHint: "选择一个专注空间", appearance: "外观",
  theme: "主题", followGlobalTheme: "跟随全局主题", motion: "动效",
  motionIntensity: "动效强度", wallpaperOpacity: "背景强度",
  themes: { "polar-night": "极夜", "sakura-day": "樱日", "fortune-gold": "鎏金", "deep-study": "深研" },
  rename: "重命名工作台", moveUp: "向前移动", delete: "删除工作台",
  deleteConfirm: "删除 {{name}}？项目和对话会保留。", nameLabel: "工作台名称",
  namePlaceholder: "输入工作台名称", templateLabel: "模板",
  templates: { coding: "编程", daily: "日常", creative: "创作", research: "研究", custom: "自定义" },
  daily: {
    subtitle: "管理当天的任务与笔记", progress: "已完成 {{completed}} / {{total}}", tasks: "今日任务",
    tasksHint: "仅保存在本机的专注任务列表，不含示例数据。", taskPlaceholder: "添加任务", addTask: "添加",
    emptyTasks: "还没有任务", markOpen: "标记为未完成", markDone: "标记为已完成", deleteTask: "删除任务",
    notes: "笔记", notesHint: "记录属于这个工作台的上下文。", notesPlaceholder: "写下今天的笔记…",
  },
  creative: {
    subtitle: "提示词、模型绑定与生成资产", notConfigured: "媒体运行时未配置", prompt: "提示词",
    promptHint: "媒体适配器不可用时，仍可先准备创作简报。", promptPlaceholder: "描述你想生成的图片或视频…",
    generate: "生成", configureToGenerate: "配置真实媒体适配器后才会启用生成。", settings: "模型绑定",
    settingsHint: "绑定仅属于当前工作台，不会修改运行中的对话。", imageModel: "图片模型", videoModel: "视频模型",
    unassigned: "未分配", assets: "资产", assetsHint: "媒体运行时接入后，已完成的任务会显示在这里。",
    emptyAssets: "暂无生成资产", emptyAssetsHint: "PI-Desktop 不会把占位内容伪装成成功的生成结果。",
  },
  research: {
    subtitle: "本地来源与研究笔记", localOnly: "本地工作空间", sources: "资料来源",
    sourcesHint: "维护明确的阅读清单，不伪造引用。", sourceTitle: "来源标题",
    sourceUrl: "https://example.com/source", addSource: "添加来源", emptySources: "尚未添加来源",
    deleteSource: "删除来源", notes: "研究笔记", notesHint: "用自己的话整理发现。",
    notesPlaceholder: "记录问题、证据和结论…",
  },
};
export const workbenchZhTW = { ...workbenchZhCN, switcherLabel: "切換工作台", savedLocally: "離開輸入框時儲存到本機。", new: "新增工作台", create: "建立", deleteConfirm: "刪除 {{name}}？專案與對話會保留。", templates: { coding: "程式設計", daily: "日常", creative: "創作", research: "研究", custom: "自訂" } };
export const workbenchDe = { ...english, switcherLabel: "Arbeitsbereich wechseln", switcherTitle: "Arbeitsbereiche", workspaceLabel: "Arbeitsbereich", new: "Neuer Arbeitsbereich", create: "Erstellen", rename: "Arbeitsbereich umbenennen", delete: "Arbeitsbereich löschen", nameLabel: "Name des Arbeitsbereichs", templateLabel: "Vorlage", templates: { coding: "Programmieren", daily: "Täglich", creative: "Kreativ", research: "Recherche", custom: "Benutzerdefiniert" } };
export const workbenchEs = { ...english, switcherLabel: "Cambiar espacio de trabajo", switcherTitle: "Espacios de trabajo", workspaceLabel: "Espacio de trabajo", new: "Nuevo espacio", create: "Crear", rename: "Cambiar nombre", delete: "Eliminar espacio", nameLabel: "Nombre del espacio", templateLabel: "Plantilla", templates: { coding: "Código", daily: "Diario", creative: "Creativo", research: "Investigación", custom: "Personalizado" } };
export const workbenchFr = { ...english, switcherLabel: "Changer d’espace de travail", switcherTitle: "Espaces de travail", workspaceLabel: "Espace de travail", new: "Nouvel espace", create: "Créer", rename: "Renommer l’espace", delete: "Supprimer l’espace", nameLabel: "Nom de l’espace", templateLabel: "Modèle", templates: { coding: "Code", daily: "Quotidien", creative: "Créatif", research: "Recherche", custom: "Personnalisé" } };
export const workbenchTr = { ...english, switcherLabel: "Çalışma alanını değiştir", switcherTitle: "Çalışma alanları", workspaceLabel: "Çalışma alanı", new: "Yeni çalışma alanı", create: "Oluştur", rename: "Çalışma alanını yeniden adlandır", delete: "Çalışma alanını sil", nameLabel: "Çalışma alanı adı", templateLabel: "Şablon", templates: { coding: "Kodlama", daily: "Günlük", creative: "Yaratıcı", research: "Araştırma", custom: "Özel" } };
export const workbenchKo = { ...english, switcherLabel: "워크벤치 전환", switcherTitle: "워크벤치", workspaceLabel: "작업 공간", new: "새 워크벤치", create: "만들기", rename: "워크벤치 이름 바꾸기", delete: "워크벤치 삭제", nameLabel: "워크벤치 이름", templateLabel: "템플릿", templates: { coding: "코딩", daily: "일상", creative: "크리에이티브", research: "리서치", custom: "사용자 지정" } };
