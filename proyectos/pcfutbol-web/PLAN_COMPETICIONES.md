# Plan de Acción: Competiciones (Liga + Copa + Europa)

## Estado actual

### Lo que funciona:
- **Liga**: Todas las jornadas se simulan para todos los equipos. Calendario muestra todos los partidos.
- **Champions/Europa/Conference**: Fase de liga (Swiss) simula TODOS los partidos de todos los equipos. Eliminatorias simulan todos los cruces.
- **Copa**: `simulateCupRound` simula TODOS los partidos de cada ronda. El bracket completo se genera.
- **ADVANCE_WEEK**: Detecta si la semana es de liga, copa o europea y simula/genera pendingMatch según corresponda.

### Lo que falta o funciona mal:
1. **Calendario**: Solo muestra partidos de liga en la vista de fixtures. Copa y Champions solo muestran el partido DEL JUGADOR.
2. **Sección "Europa"**: Solo muestra europeas, no copa. Debería unificar todas las competiciones.
3. **Copa no visible en saves antiguos**: El calendario no tiene `cupWeeks` en saves anteriores al sistema.
4. **Labels Champions**: Demasiado largos para botones de navegación.

---

## Plan de cambios (por fases)

### FASE 1: Calendario unificado con todas las competiciones
**Objetivo**: Un carrusel de fechas donde cada semana muestra su competición(es). Al seleccionar, muestra TODOS los partidos de esa competición.

**Cambios:**
1. **Calendar.jsx** — Selector de semanas:
   - Un solo carrusel horizontal con TODAS las semanas del calendario
   - Cada "cajita" coloreada por tipo: blanco=liga, dorado=champions, naranja=copa
   - Al hacer click en una semana de liga → muestra todos los partidos de liga
   - Al hacer click en una semana de Champions → muestra TODOS los partidos de Champions de esa jornada
   - Al hacer click en una semana de Copa → muestra TODOS los partidos de esa ronda de copa

2. **Calendar.jsx** — Vista de partidos europeos:
   - Nuevo: `allEuropeanFixtures` — leer TODOS los partidos de la jornada europea del estado
   - Fase de liga: `competitionState.matchdays[matchday-1]` tiene todos los fixtures
   - Knockout: `competitionState.{phase}Matchups` + `{phase}Results` tienen todos los cruces
   - Renderizar como lista de fixture cards (igual que liga)

3. **Calendar.jsx** — Vista de partidos de copa:
   - Nuevo: `allCupFixtures` — leer TODOS los partidos de esa ronda de copa
   - `state.cupCompetition.rounds[roundIdx].matches` tiene todos los partidos
   - Renderizar como lista de fixture cards

### FASE 2: Sección "Competiciones" (renombrar "Europa")
**Objetivo**: Un apartado unificado con tabs para Copa + Champions/Europa/Conference.

**Cambios:**
1. **Renombrar** `Europe.jsx` → reutilizar como pestaña dentro de un nuevo `Competitions.jsx`
2. **Competitions.jsx** — Tabs:
   - Tab "Copa" → muestra bracket de copa (actual `Cup.jsx`)
   - Tab "Champions" / "Europa" / "Conference" → muestra clasificación Swiss + bracket eliminatorias (actual `Europe.jsx`)
3. **MobileNav.jsx** — Cambiar:
   - Eliminar entrada separada de "Copa" y "Europa"
   - Añadir "Competiciones" con icono Trophy que agrupe ambas

### FASE 3: Simulación correcta al avanzar semana
**Objetivo**: Que ADVANCE_WEEK simule correctamente liga, copa Y champions cuando toque.

**Estado actual de ADVANCE_WEEK:**
- ✅ Liga del jugador: los fixtures se crean al inicio, el jugador juega su partido
- ✅ Otras ligas: `simulateOtherLeaguesWeek()` las simula en paralelo
- ✅ Champions/Europa/Conference: `simulateEuropeanMatchday()` simula TODOS los partidos (Swiss), `advanceEuropeanPhase()` avanza eliminatorias
- ✅ Copa: `simulateCupRound()` simula TODOS los partidos de la ronda
- ✅ Pendientes: genera `pendingEuropeanMatch` / `pendingCupMatch` para que el jugador juegue su partido

**Lo que necesita ajuste:**
- Verificar que las europeas sin `europeanCalendar` (legacy) funcionan con el `effectiveCalendar`
- El ADVANCE_WEEK usa `state.europeanCalendar` directamente (no el effectiveCalendar del componente)
- Para saves antiguos: las semanas de copa no se detectan → hay que migrar o recalcular

---

## Orden de ejecución

1. **FASE 1A**: Mostrar TODOS los partidos de Champions en el calendario (datos ya existen, solo falta renderizarlos)
2. **FASE 1B**: Mostrar TODOS los partidos de Copa en el calendario
3. **FASE 2**: Unificar "Europa" + "Copa" en "Competiciones"
4. **FASE 3**: Verificar/arreglar simulación en ADVANCE_WEEK para saves legacy

## Estimación
- Fase 1: Cambios en Calendar.jsx (render + data) + Calendar.scss
- Fase 2: Nuevo Competitions.jsx + modificar MobileNav + Europe.jsx + Cup.jsx
- Fase 3: Ajustes en GameContext.jsx ADVANCE_WEEK
