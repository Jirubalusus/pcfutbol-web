# HEARTBEAT.md

## Estado: ✅ Sistema de fichajes profundo desplegado
**Última actualización:** 2026-01-29 01:20

## Tareas completadas
- ✅ Scraping Transfermarkt (22 temporadas)
- ✅ Procesamiento de datos (calculate-overalls)
- ✅ Subida a Firebase (248 equipos, 5256 jugadores)
- ✅ Bugfix: Squad.jsx (injuredWeeks → injuryWeeksLeft)
- ✅ Bugfix: Transfers.jsx (constantes no importadas → funciones getter)
- ✅ Bugfix: seasonEngine.js (reset de estado de lesiones incompleto)
- ✅ Bugfix visual: index.css (variables RGB de colores faltantes)
- ✅ Bugfix visual: TeamSelection.scss (funciones Sass deprecated)
- ✅ Estadio V2 completo: vista 3D, naming rights, eventos, VIP, personalización
- ✅ Balance estadio: césped +5%/semana, eventos cooldown 2 sem, daño reducido 40-60%
- ✅ Sistema de abonos: campaña con cierre, precio separado de entrada
- ✅ Capacidades reales de estadios por equipo (~100 equipos)
- ✅ Visor 3D con React Three Fiber
- ✅ 600 simulaciones validadas sin bugs
- ✅ Bug formación 3-4-3 (añadidas 3-4-3, 5-4-1, 4-5-1)
- ✅ Modal entrenamiento rediseñado (grande, gradientes, iconos Lucide)
- ✅ Iconos profesionales (Lucide en vez de emojis)
- ✅ Selector de ligas funcional (todas las grandes ligas europeas)
- ✅ Sistema de descensos/ascensos (La Liga ↔ Segunda)
- ✅ Bugfix: cambio de táctica no rellenaba huecos (Formation.jsx onFormationChange)
- ✅ Bugfix visual: botón X de modales (fondo rojo feo → sutil con hover)
- ✅ Mejora naming rights: muestra nombre original + patrocinio (ej: "San Mamés - TeleCom Plus Arena")
- ✅ Bugfix: contratos expirados no eliminaban jugadores de plantilla/alineación

## Estado actual
- PC Fútbol Web funcionando en GitHub Pages
- **MERCADO V2 COMPLETO:**
  - ✅ Motor de IA global (globalTransferEngine.js)
  - ✅ Nueva interfaz con pestañas (TransfersV2.jsx)
  - ✅ Sistema de rumores y noticias
  - ✅ Ticker de últimas noticias
  - ✅ Integrado simulación de mercado en ADVANCE_WEEK
  - ✅ IA ficha/vende cada semana (ventanas de mercado)
  - ✅ Equipos guardados en leagueTeams al iniciar partida
  - ✅ Ofertas IA entrantes por jugadores del usuario
  - ✅ Respuesta IA a ofertas del usuario (aceptar/rechazar/contraoferta)
- ✅ **SISTEMA DE FICHAJES PROFUNDO:**
  - Negociación en fases (Club → Jugador)
  - Sistema de tiers de clubes (Elite/Top/Primera/Modesto/Menor)
  - Personalidades de jugadores (Ambicioso/Leal/Mercenario/Familiar/Profesional/Aventurero)
  - Dificultad basada en prestigio (bajar de tier = muy difícil)
  - Salario requerido aumenta si baja de nivel (+30-50% por tier)
  - UI con indicador de fases y probabilidad de éxito
- ✅ **EXPLORADOR DE LIGAS:**
  - Vista visual de ligas (🇪🇸🏴󠁧󠁢󠁥󠁮󠁧󠁿🇮🇹🇩🇪🇫🇷)
  - Navegar: Liga → Equipo → Plantilla → Jugador
  - Info de tier, media y valor de cada equipo
- ✅ **SISTEMA DE OJEADOR:**
  - 4 niveles (Sin ojeador → Élite)
  - Analiza necesidades del equipo automáticamente
  - Genera 10-20 sugerencias de fichajes
  - Nivel alto = sugerencias más precisas (personalidad, potencial, dificultad)
