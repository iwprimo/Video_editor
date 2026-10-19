#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instale o Node.js 22+ em https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install
npm run dev
