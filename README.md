# Rodokmen JV – web

Statický web (GitHub Pages) bez build závislostí: `template.html` + `geo.js` + `gazetteer.js` + veřejná verze `data.js` → `index.html`.

- Data se mění jen přes `datatool.js`.
- `validate.js --strict` blokuje publikaci při chybě i varování.
- `public_data.js` před sestavením zredukuje žijící osoby podle `publicLiving` v `data.js`. Výchozí je `names` (jen jména).
- Publikace: `./publish.sh "popis změny"`.
