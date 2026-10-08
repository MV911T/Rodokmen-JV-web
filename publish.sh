#!/bin/bash
# Rebuilds the pages from data.js and pushes to GitHub Pages. Usage: ./publish.sh "change description"
set -e
cd "$(dirname "$0")"
./build.sh
git add .nojekyll .gitignore public_data.js validate.js datatool.js geo.js gazetteer.js data.js template.html index.html build.sh publish.sh README.md img
git commit -q -m "${1:-Aktualizace rodokmenu}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" || { echo "nothing to commit"; exit 0; }
git push -q && echo "pushed"
# then commit + push the private research repo (scans, notes, the web submodule pointer) – nothing stays only local
( cd .. && git add -A && git commit -q -m "Výzkum: ${1:-průběžný stav}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q origin main && echo "research repo pushed" ) || echo "research repo: nothing to commit or push failed"
# verify in the background that GitHub Pages serves the new build (result in .live_check.log, shown by the next publish)
[ -f .live_check.log ] && cat .live_check.log
STAMP=$(grep -o "RODOKMEN_BUILD='[^']*'" index.html | head -1)
( for i in $(seq 1 30); do sleep 20; if curl -s https://mv911t.github.io/Rodokmen-JV-web/ | grep -qF "$STAMP"; then echo "live OK ($STAMP)"; exit 0; fi; done; echo "LIVE NOT UPDATED after 10 min ($STAMP)" ) > .live_check.log 2>&1 &
