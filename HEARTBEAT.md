# HEARTBEAT.md

## Estado: ✅ Modo Contrarreloj desplegado
**Última actualización:** 2026-02-02 23:02

## Pendiente
- 🔲 Firebase Security Rules para la colección `contrarreloj_ranking` (allow read: all, write: authenticated) — Pol debe añadirlas en la consola de Firebase
- 🔲 Restricción API key de Firebase (Pol debe hacerlo en Google Cloud Console)

## Completado hoy (2 febrero)
- ✅ Scraping Transfermarkt: 86 equipos, ~1968 jugadores reales (MLS 30, Saudi 18, Liga MX 18, J-League 20)
- ✅ Posiciones unificadas al español en TODAS las 26 ligas
- ✅ Modo Contrarreloj: setup, end screen, ranking Firebase compartido, win/lose detection
- ✅ Garantía 1 equipo Europa + 1 Sudamérica en selección contrarreloj
- ✅ Bug fix: "Nuevos equipos" ya no recarga la página (React state en vez de window.location.reload)
- ✅ Testing completo + deploy a GitHub Pages
