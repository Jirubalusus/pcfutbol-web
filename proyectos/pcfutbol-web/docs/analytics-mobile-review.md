# PC Gaffer — revisar Google Analytics desde el móvil

Esta integración usa Firebase Analytics / Google Analytics 4 y se activa solo si existe `VITE_FIREBASE_MEASUREMENT_ID` en el build.

## 1. Configurar el Measurement ID

En Firebase Console / Google Analytics:

1. Abre el proyecto `pcfutbol-web`.
2. Ve a **Analytics** → **Dashboard** o **Google Analytics**.
3. Si no existe, crea/selecciona una propiedad GA4 y un **Web data stream** para PC Gaffer.
4. Copia el ID tipo `G-XXXXXXXXXX`.
5. Añádelo como variable de entorno del build:
   - `VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX`
6. Rebuild + deploy de preprod.

Sin ese ID, la app no envía nada, pero en preprod/dev queda disponible `window.__pcgAnalyticsDebug` para QA local.

## 2. Probar desde tu móvil

1. Abre en el móvil una URL cache-busted de preprod, por ejemplo:
   - `https://pcgaffer-preprod.web.app/?v=analytics-20260606`
2. Entra en la app y toca varias cosas:
   - `Jugar ahora` / Carrera.
   - tarjeta `Mundial Draft`.
   - `Rankings`.
   - `Support the creator` / feedback.
   - en Mundial Draft: `Empezar Draft`, elegir jugadores, `Disputar Mundial`.
3. En Analytics, revisa **Realtime / En tiempo real**.

## 3. Dónde verlo en GA4 desde el móvil

Desde navegador móvil:

1. Entra en `https://analytics.google.com/`.
2. Selecciona la propiedad de PC Gaffer.
3. Abre **Reports / Informes** → **Realtime / En tiempo real**.
4. Mira:
   - usuarios activos ahora;
   - eventos en tiempo real;
   - páginas/pantallas vistas;
   - países/dispositivos si GA los muestra.

También puedes entrar desde Firebase Console:

1. `https://console.firebase.google.com/`
2. Proyecto `pcfutbol-web`.
3. **Analytics** → **Dashboard / Events**.

Nota: **Realtime** suele verse casi al momento. Los informes normales de **Events**, **Engagement** o **User acquisition** pueden tardar hasta 24h.

## 4. Eventos principales

- `app_start`: alguien abrió la app.
- `app_loaded`: la app terminó de cargar y está lista.
- `session_auth_state`: estado de sesión cuando Auth resuelve o cambia.
  - parámetros: `auth_state`, `login_status`, `provider`, `language`.
- `session_heartbeat`: ping ligero cada ~60s con la pestaña visible para estimar actividad en GA4 Realtime sin Firestore/RTDB.
  - parámetros: `auth_state`, `login_status`, `current_screen`, `app_area`, `game_mode`, `language`.
- `screen_view`: cambio de pantalla principal.
  - parámetros: `screen_name`, `app_area`, `language`, `auth_state`.
- `ui_click`: click/tap en un botón o enlace.
  - parámetros: `screen`, `element`, `label`, `mode`, `link_type`, `link_domain`.
- `mode_select`: tarjeta/modo elegido desde menú.
  - parámetros: `game_mode`, `locked`.
- `game_session_start`: empezó o se retomó una partida jugable.
  - parámetros: `game_mode`, `app_area`, `auth_state`.
- `match_start` / `match_finish`: apertura/cierre de MatchDay.
  - parámetros: `game_mode`, `app_area`, `season`, `matchday`.
- `trial_start`: usuario empieza Carrera sin login.
- `login_success`, `register_success`, `logout`: funnel de Auth con proveedor genérico, sin email.
- `rankings_view`: vista de rankings/clasificaciones.
- `wc_draft_start`: empieza el draft del Mundial.
- `wc_draft_pick`: el usuario elige un slot/jugador del draft. No manda nombres de jugador.
- `wc_draft_complete`: XI completo.
- `wc_draft_tournament_start`: empieza la simulación del Mundial.
- `wc_draft_tournament_finish`: termina el torneo.

## 5. Dimensiones recomendadas en GA4

Registra como **Custom dimensions** de evento:

- `auth_state`
- `login_status`
- `provider`
- `app_area`
- `game_mode`
- `current_screen`
- `screen_name`
- `mode`
- `locked`
- `link_type`
- `link_domain`
- `season`
- `matchday`
- `formation`
- `era_filter`
- `eliminated_round`

Registra como **User properties / custom definitions** si quieres segmentar usuarios:

- `auth_state`
- `login_status`
- `language`

GA4 también puede usar `setUserId` con el UID opaco de Firebase Auth para agrupar sesiones de un mismo usuario logeado. No se usa para trial/anonymous.

## 6. Qué se puede y qué no se puede saber desde GA4

Sí se puede ver en GA4:

- usuarios activos ahora aproximados por Realtime;
- logeados vs no logeados con `auth_state` / `login_status`;
- usuarios recurrentes por métricas estándar de GA4;
- modos y pantallas donde juegan;
- funnel de login/trial/modo/Mundial Draft/partidos.

No se debe enviar a GA4:

- correos reales;
- nombres de usuario/displayName;
- nombres de jugadores elegidos;
- contenido de partidas/saves;
- rosters/lineups completos;
- tokens o credenciales.

Por tanto, “usuarios por correo” debe gestionarse fuera de GA4 si algún día hace falta: en Firebase/Auth/Admin privado. En GA4 se gestiona con usuarios agregados y, para logeados, `user_id` opaco.

## 7. Privacidad y seguridad

La instrumentación evita mandar:

- emails reales;
- texto escrito por usuarios;
- contenido de partidas/saves;
- nombres de jugadores elegidos por el usuario;
- datos personales.

Los labels de clicks se limpian, se recortan y los emails visibles se sustituyen por `[email]`.

## 8. Debug técnico en preprod/dev

En preprod/dev se expone:

```js
window.__pcgAnalyticsDebug
```

Comandos útiles en consola del navegador:

```js
window.__pcgAnalyticsDebug.configured
window.__pcgAnalyticsDebug.enabled
window.__pcgAnalyticsDebug.events
window.__pcgAnalyticsDebug.clear()
```

- `configured`: hay Measurement ID en el build.
- `enabled`: Firebase Analytics ha inicializado y puede enviar.
- `events`: últimos eventos capturados por QA.

En producción este helper no se expone.
