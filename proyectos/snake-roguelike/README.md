# 🐍 Snake Roguelike

Un juego de Snake con elementos roguelike completo hecho en Godot 4.5.

## 🎮 Controles

- **WASD** o **Flechas**: Mover la serpiente
- **ESC**: Pausar/Reanudar

## 🐍 Personajes Desbloqueables

| Personaje | Habilidad | Desbloqueo |
|-----------|-----------|------------|
| 🟢 Classic Snake | Base | Inicial |
| ⚡ Rayo | +30% velocidad | Score 1000 |
| 🛡️ Tanque | +5 segmentos, -20% velocidad | 10 partidas |
| 👻 Fantasma | Atraviesa su propio cuerpo | 500 comidas |
| 🎯 Cazador | +50% puntos por enemigos | 100 enemigos |
| 🍀 Suertudo | x2 probabilidad de power-ups | 50 power-ups |
| 👑 Mata Jefes | x2 daño a bosses | 5 bosses |

## 👾 Tipos de Enemigos

| Enemigo | Comportamiento | Puntos |
|---------|----------------|--------|
| 🟣 Slime | Vaga aleatoriamente | 10 |
| 🟠 Perseguidor | Te sigue | 20 |
| 🔵 Disparador | Dispara proyectiles | 30 |
| 🟢 Divisor | Se divide al morir | 25 |
| 💜 Teletransportador | Se teletransporta | 35 |
| 🟡 Bombardero | Explota si te acercas | 40 |

## 👹 Bosses

Aparecen cada 3 niveles:

| Boss | Nivel | HP | Ataques |
|------|-------|-----|---------|
| Rey Slime | 3+ | 10 | Invoca minions, Carga |
| Reina Serpiente | 5+ | 15 | Rastro venenoso, Constricción |
| Gusano del Vacío | 7+ | 20 | Teletransporte, Zonas vacías |
| Hidra del Caos | 10+ | 30 | Multi-cabeza, Aliento de fuego |

## 🧱 Tipos de Obstáculos

| Obstáculo | Efecto |
|-----------|--------|
| ⬜ Muro | Bloquea movimiento |
| 🔴 Pinchos | Daño x2 |
| 🟤 Roca | Destruible, suelta items |
| 🟢 Veneno | Te ralentiza |
| 🔵 Hielo | Te deslizas |
| 🟣 Portal | Te teletransporta |

## ⚡ Power-Ups

| Color | Efecto | Duración |
|-------|--------|----------|
| 🟡 Amarillo | Velocidad +50% | 5s |
| 🔵 Cyan | Velocidad -50% | 5s |
| 🟠 Dorado | Invencibilidad | 3s |
| 🟣 Púrpura | Atraviesa paredes | 4s |
| 🟢 Verde | Puntos x2 | 10s |
| 🩷 Rosa | +1 Vida | Instant |
| 🔷 Azul | Imán de comida | 8s |
| ⚪ Blanco | Escudo (+1 vida) | Instant |
| 💚 Verde Brillante | +5 segmentos | Instant |

## ⬆️ Mejoras Permanentes

Se desbloquean completando retos:

| Mejora | Efecto | Desbloqueo |
|--------|--------|------------|
| Vida Extra | Sobrevive 1 golpe fatal | 5 partidas |
| Arranque Rápido | +10% velocidad inicial | Score 500 |
| Imán | Atrae comida cercana | 200 comidas |
| Combo Master | +5% puntos por combo | Score 2000 |
| Radar | Enemigos brillan cerca | 50 enemigos |
| Duración+ | +20% duración power-ups | 25 power-ups |
| Cazabosses | +15% daño a bosses | 3 bosses |
| Drops Mejorados | +10% drops raros | Nivel 5 |

## 🏆 Retos/Logros

- **Score**: 500, 1000, 2000, 5000 puntos
- **Partidas**: 5, 10, 50 jugadas
- **Comida**: 200, 500 comidas
- **Enemigos**: 50, 100, 500 eliminados
- **Power-ups**: 25, 50 recogidos
- **Bosses**: 3, 5, 10 derrotados
- **Niveles**: 5, 10 alcanzados

## 🎲 Mecánicas Roguelike

1. **Generación procedural**: Cada nivel genera obstáculos únicos
2. **Permadeath**: Al morir, pierdes progreso de la partida
3. **Progresión meta**: Desbloqueas personajes y mejoras permanentes
4. **Items aleatorios**: Power-ups y enemigos varían cada partida
5. **Dificultad escalada**: Más enemigos, obstáculos y velocidad
6. **Sistema de combos**: Come seguido para multiplicar puntos
7. **Bosses cada 3 niveles**: Batallas épicas con mecánicas únicas

## 📁 Estructura

```
snake-roguelike/
├── project.godot
├── icon.svg
├── scenes/
│   └── main.tscn
├── scripts/
│   ├── game_data.gd      # Datos persistentes, personajes, enemigos
│   ├── game_manager.gd   # Lógica principal del juego
│   └── ui_manager.gd     # Interfaz de usuario
└── resources/
```

## 💾 Guardado

El progreso se guarda automáticamente en:
- `user://save_data.json`

Incluye: stats totales, personajes desbloqueados, mejoras, retos completados.

---

Creado por Jiru 🦦 - Enero 2026
