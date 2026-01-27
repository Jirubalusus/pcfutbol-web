# ⚽ Football Manager - Primera & Segunda Federación

Un juego de gestión de fútbol con plantillas reales de Primera y Segunda Federación española.

## 🎮 Características

### GameBrain - El Cerebro del Juego
- **MatchEngine** - Simulación de partidos basada en atributos
- **TransferMarket** - Mercado de fichajes completo
- **PlayerProgression** - Desarrollo y declive de jugadores
- **AIManager** - IA para equipos rivales
- **EconomyManager** - Gestión financiera realista
- **LeagueManager** - Ligas, calendario y clasificaciones

### Datos Reales
- Plantillas scrapeadas de Transfermarkt
- Primera Federación (2 grupos, ~40 equipos)
- Segunda Federación (5 grupos, ~90 equipos)
- ~3000+ jugadores con datos reales

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

## 📦 Estructura

```
src/
├── core/           # GameBrain y subsistemas
│   ├── GameBrain.ts
│   ├── MatchEngine.ts
│   ├── TransferMarket.ts
│   ├── PlayerProgression.ts
│   ├── AIManager.ts
│   ├── EconomyManager.ts
│   └── LeagueManager.ts
├── screens/        # Pantallas de UI
│   ├── MainMenu.tsx
│   ├── TeamSelection.tsx
│   ├── Dashboard.tsx
│   ├── Squad.tsx
│   ├── Matches.tsx
│   ├── Table.tsx
│   └── Transfers.tsx
├── types/          # TypeScript types
├── utils/          # Utilidades
└── data/           # Datos de equipos/jugadores
```

## 🔧 Scraper

Para actualizar los datos de Transfermarkt:

```bash
cd scraper
npm install
npm run scrape
```

## 📝 TODO

- [ ] Sistema de tácticas
- [ ] Entrenamiento personalizado
- [ ] Copa del Rey
- [ ] Sistema de lesiones detallado
- [ ] Periodistas/prensa
- [ ] Estadísticas avanzadas
- [ ] Guardado/carga de partidas

## 🛠️ Tech Stack

- React + TypeScript
- Vite
- Node.js (scraper)
