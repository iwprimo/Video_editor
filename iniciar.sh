#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instale o Node.js 22+ em https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install
if command -v python3 >/dev/null; then
  python3 -m pip install -r requirements.txt -q --disable-pip-version-check 2>/dev/null || true
elif command -v python >/dev/null; then
  python -m pip install -r requirements.txt -q --disable-pip-version-check 2>/dev/null || true
fi
npm run dev
