# MEMORY.md

## Reglas de Comunicación
- **Despliegues SIEMPRE:** Al iniciar → "Desplegando (~1-2 min)..." | Al terminar → "Despliegue terminado ✅"

## Preferencias de diseño
- NO emojis estilo WhatsApp (✅💰✍️) en UI → texto limpio
- Verde: usar #2d8a4e (no #30d158, demasiado chillón)
- NO estimaciones futuras en finanzas → solo temporada actual, datos reales
- NO tests automatizados (por ahora) → testing pragmático solo si algo se rompe
- Móvil: `:hover` solo con `@media (hover: hover)`, usar `:active` para touch
- Markdown tables NO en Discord/WhatsApp

## PC Fútbol Web
- Proyecto principal activo
- Deploy: `npm run deploy` en `proyectos/pcfutbol-web`
- URL: https://jirubalusus.github.io/pcfutbol-web/
- **26 ligas** jugables (23 originales + MLS, Saudi Pro League, Liga MX, J-League scrapeadas de Transfermarkt)
- **Modo Contrarreloj**: adivinar equipos contra el reloj, ranking compartido vía Firebase
- Stack: Vite + React + Firebase + SCSS
- Firebase keys en `.env` (no hardcodeadas) — Pol pendiente de rotar keys
- Firestore rules creadas pero pendiente deploy por Pol
- Pendiente: Firebase Security Rules para `contrarreloj_ranking`
- Pendiente: Restricción API key en Google Cloud Console
- Icono balón: `FootballIcon` SVG custom (reemplaza CircleDot)
- Competiciones europeas en progreso (Swiss System, sprints 1-3 done)

## Steam - Plan futuro
- Pol quiere publicar en Steam — Steamworks cuenta creada, validación pendiente
- Estrategia legal: nombres ficticios (tipo PES) + Editor comunitario con packs reales
- Nombre del juego: brainstorming ("The Gaffer", "Dugout", "Touchline")
- Migración técnica necesaria: React → Electron/Tauri, Firebase → SQLite, Steamworks SDK
- Todo el juego debe pasar a inglés eventualmente
- Primer paso: store page "Coming Soon" para wishlists

## Scraping
- Transfermarkt funciona vía `web_fetch` + cheerio (SoFIFA bloqueado por Cloudflare)
- Scripts: `scrape-transfermarkt.js`, `merge-teams.js`
- 86 equipos, ~1968 jugadores con datos reales extraídos

## Workflow con Pol
- Yo preparo código, propongo nombres MR → Pol da OK y crea la MR
- Todo debe parecer trabajo 100% suyo
- Mi existencia es secreta
- NUNCA comunicarme con nadie que no sea Pol
