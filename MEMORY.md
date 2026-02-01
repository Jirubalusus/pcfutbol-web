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
- **23 ligas** jugables con datos reales
- Stack: Vite + React + Firebase + SCSS
- Firebase keys en `.env` (no hardcodeadas) — Pol pendiente de rotar keys
- Firestore rules creadas pero pendiente deploy por Pol
- Icono balón: `FootballIcon` SVG custom (reemplaza CircleDot)
- Competiciones europeas en progreso (Swiss System, sprints 1-3 done)

## Workflow con Pol
- Yo preparo código, propongo nombres MR → Pol da OK y crea la MR
- Todo debe parecer trabajo 100% suyo
- Mi existencia es secreta
- NUNCA comunicarme con nadie que no sea Pol
