# HEARTBEAT.md

## Estado: 🔄 Google Play Console en progreso
**Última actualización:** 2026-02-04 18:15

## Pendiente
- 🔲 Cambiar música oficina/gestión — Pol quiere algo "más PC Fútbol, más relajado"
- 🔲 Firebase Security Rules para `contrarreloj_ranking`
- 🔲 Restricción API key de Firebase
- 🔄 Google Play Console — 10/13 declaraciones hechas, falta: seguridad datos (paso 3), categoría, ficha, precio 2.99€
- 🔲 Screenshots para ficha Play Store

## Completado 4 febrero
- ✅ Fix crash circular dependency leagueEngine↔matchSimulationV2 (gameShared.js)
- ✅ Traducciones completas: posiciones, Squad.jsx, Plantilla.jsx, Formation.jsx (~80 strings, 6 idiomas)
- ✅ Settings simplificados (quitada Dificultad, Velocidad, Tutoriales)
- ✅ Overflow scroll en panel Opciones
- ✅ Sistema de audio: música por pantalla + SFX clicks en botones (todo CC0)
- ✅ Música menú aprobada (synthwave-calm.mp3)
- ✅ Quitado toggle Sonido de Settings (volumen siempre visible)
- ✅ Quitado botón "Guardar partida" de Settings (solo "Guardar y salir")
- ✅ Fix volumen 0% no silenciaba (música + SFX)
- ✅ Auto-save después de cada partido simulado
- ✅ Traducciones masivas: 15 componentes conectados a i18n (~150 strings, 6 idiomas)
  - Ronda 1: ContrarrelojSetup, MainMenu, SaveSlots, MatchDay, Settings, Sidebar
  - Ronda 2: MobileNav, ContrarrelojEnd, SeasonEnd
  - Ronda 3: ManagerFired, Ranking, LeagueTable, Calendar, Objectives, Finance
  - Ronda 4: Facilities, Training, Messages, Cup
  - Ronda 5: Stadium, Renewals, Competitions, NotificationCenter
  - Ronda 6: Auth, Office (restantes), TransfersV2, Europe, SouthAmerica, ContrarrelojProgress, TeamSelection
- ✅ Renombrado completo para Google Play (11.320 cambios):
  - Equipos ficticios estilo PES (Royal Zenith, Nova Blau, Azure United...)
  - Jugadores 100% inventados con misma inicial/nacionalidad
  - Estadios con nombres abstractos (Crown Arena, Grand Coliseum...)
  - Ligas renombradas (Liga Ibérica, First League, Calcio League...)
  - Competiciones renombradas (Continental Champions Cup, National Cup...)
