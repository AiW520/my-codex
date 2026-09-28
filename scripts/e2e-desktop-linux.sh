#!/usr/bin/env bash
# Run inside Xvfb with a real window manager so maximize IPC can be verified.
set -euo pipefail

openbox &
desktop_wm_pid=$!
trap 'kill "$desktop_wm_pid" 2>/dev/null || true' EXIT

desktop_wm_ready=false
for ((attempt = 0; attempt < 100; attempt++)); do
  if [[ "$(xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null)" == *"window id # 0x"* ]]; then
    desktop_wm_ready=true
    break
  fi
  kill -0 "$desktop_wm_pid"
  sleep 0.1
done
if [[ "$desktop_wm_ready" != true ]]; then
  echo "Window manager did not become ready" >&2
  exit 1
fi

node scripts/e2e-electron-boot.mjs
node scripts/e2e-provider-api-style.mjs --task-tuzi
