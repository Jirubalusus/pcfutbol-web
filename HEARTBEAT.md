# HEARTBEAT.md

## Estado: ✅ Sesión tarde 3 febrero
**Última actualización:** 2026-02-03 17:15

## Pendiente
- 🔲 Firebase Security Rules para `contrarreloj_ranking` (allow read: all, write: authenticated) — Pol debe añadirlas
- 🔲 Restricción API key de Firebase (Google Cloud Console)
- 🔲 Firebase index para `getCountFromServer` con `where` en ranking position queries
- 🔲 SoFIFA: Elche, Levante, Oviedo, Getafe, Alavés aparecen en LaLiga pero deberían estar en Segunda — viene del scrape de SoFIFA que los pone en lg=53

## Completado tarde 3 febrero
- ✅ Scrape completo SoFIFA EA FC 26: 33 ligas, 456 equipos, 12.654 jugadores
- ✅ Premier League scrapeada (faltaba del primer scrape)
- ✅ Firebase limpiado (919 teams + 36 leagues borrados) y re-subido desde cero
- ✅ Ratings EA FC 26 oficiales (Isco 84, Alaba 81, Cancelo 84, Huijsen 82, Güler 82...)
- ✅ Valores de mercado realistas (Mbappé €153M, Bellingham €182M, Courtois €24M)
- ✅ Sin duplicados en Firebase (ATM/Madrid resuelto)
- ✅ Sin equipos fantasma (Leganés/Las Palmas eliminados de LaLiga)
- ✅ MLS y Saudi Pro League añadidas como ligas nuevas
- ✅ Barrido traducciones: Score→Puntuación, GAME OVER→FIN DEL JUEGO, Naming Rights→Derechos de Nombre, W/D/L→V/E/D, stats Squad en español, Unknown→Desconocido
