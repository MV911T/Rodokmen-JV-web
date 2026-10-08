#!/bin/bash
# Builds index.html (GitHub Pages) by inlining geo.js + data.js into template.html
cd "$(dirname "$0")"
# Consistency gate: stale or contradictory data must never reach the web (errors AND warnings block).
node validate.js --strict || { echo "build.sh: validate.js failed – fix data.js (via datatool.js) first"; exit 1; }
# Privacy gate: living persons are reduced to what the family approved (D.publicLiving) before anything reaches the page.
node public_data.js > .public_data.js || { echo "build.sh: public_data.js failed"; exit 1; }
python3 -I - <<'PY'
import datetime
t=open('template.html',encoding='utf8').read(); d=open('geo.js',encoding='utf8').read()+open('gazetteer.js',encoding='utf8').read()+open('.public_data.js',encoding='utf8').read()
# build stamp: the "updated" date on the page always reflects the last publish
now=datetime.datetime.now(); d+='\nwindow.RODOKMEN_BUILD=%r;\n' % ('%d. %d. %d %d:%02d' % (now.day,now.month,now.year,now.hour,now.minute))
page=t.replace('/*DATA*/',d)
head='''<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}*,*::before,*::after{box-sizing:border-box}img{max-width:100%}[hidden]{display:none!important}</style>
'''
title_end=page.index('</title>')+len('</title>')
style_end=page.index('</style>')+len('</style>')
html=head+page[:style_end]+'\n</head>\n<body>\n'+page[style_end:]+'\n</body>\n</html>\n'
open('index.html','w',encoding='utf8').write(html)
PY
node -e "const fs=require('fs');for(const f of ['index.html']){const h=fs.readFileSync(f,'utf8');const s=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);s.forEach((c,i)=>{try{new Function(c)}catch(e){console.log(f,'script',i,e.message);process.exit(1)}});}global.window={};eval([...fs.readFileSync('index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1]);const P=window.RODOKMEN.people,ids=new Set(P.map(p=>p.id));P.forEach(p=>['father','mother'].forEach(k=>{if(p[k]&&!ids.has(p[k]))console.log('missing',p.id,k,p[k])}));console.log('ok',P.length,'people')"
