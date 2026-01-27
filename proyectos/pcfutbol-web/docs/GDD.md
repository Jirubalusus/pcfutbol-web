# ⚽ PC FÚTBOL WEB
## Game Design Document v2.0

---

# 📋 ÍNDICE

1. [Visión General](#1-visión-general)
2. [Filosofía de Diseño](#2-filosofía-de-diseño)
3. [Core Gameplay Loop](#3-core-gameplay-loop)
4. [Gestión de Equipo](#4-gestión-de-equipo)
5. [Sistema de Partidos](#5-sistema-de-partidos)
6. [Mercado de Fichajes](#6-mercado-de-fichajes)
7. [Economía del Club](#7-economía-del-club)
8. [Sistema de Temporadas](#8-sistema-de-temporadas)
9. [Progresión y Carrera](#9-progresión-y-carrera)
10. [Interfaz de Usuario](#10-interfaz-de-usuario)
11. [Datos y Realismo](#11-datos-y-realismo)
12. [Roadmap Técnico](#12-roadmap-técnico)

---

# 1. VISIÓN GENERAL

## 1.1 Concepto
**PC Fútbol Web** es un simulador de gestión de fútbol para navegador que captura la esencia del clásico PC Fútbol de los 90s, actualizado con mecánicas modernas y datos reales.

## 1.2 Pitch
> *"Gestiona tu club favorito desde cualquier dispositivo. Ficha, entrena, compite y conquista Europa."*

## 1.3 Pilares de Diseño

### 🎮 Pilar 1: "Accesibilidad sin Sacrificar Profundidad"
- Interfaz limpia y clara
- Complejidad progresiva (tutorial → gestión avanzada)
- Sesiones de 10-30 minutos productivas

### ⚽ Pilar 2: "El Fútbol Manda"
- Partidos como centro de la experiencia
- Las decisiones tácticas importan
- Los jugadores tienen personalidad

### 📊 Pilar 3: "Datos Reales, Experiencia Real"
- Plantillas actualizadas de ligas reales
- Estadísticas auténticas
- Eventos que reflejan el fútbol real

### 🏆 Pilar 4: "Tu Historia, Tu Legado"
- Carrera de mánager a largo plazo
- Decisiones con consecuencias
- Logros significativos

## 1.4 Plataformas y Requisitos
- **Plataforma:** Web (React + Vite)
- **Navegadores:** Chrome, Firefox, Safari, Edge (últimas versiones)
- **Dispositivos:** Desktop prioritario, responsive para tablet/móvil
- **Backend:** Firebase (Firestore + Auth)
- **Offline:** Soporte parcial con Service Worker

## 1.5 Target
- Fans de PC Fútbol nostálgicos
- Jugadores casuales de Football Manager
- Aficionados al fútbol que quieren gestionar su equipo
- Edad: 18-45

---

# 2. FILOSOFÍA DE DISEÑO

## 2.1 Lo que SÍ queremos
| Aspecto | Implementación |
|---------|---------------|
| Partidos emocionantes | Narración dinámica, momentos decisivos |
| Fichajes satisfactorios | Negociaciones reales, mercado activo |
| Progresión de jugadores | Entrenamiento visible, canteranos |
| Gestión económica | Balance ingresos/gastos claro |
| Derbis especiales | Rivalidades con contexto histórico |

## 2.2 Lo que NO queremos
| Evitar | Por qué |
|--------|---------|
| Microgestión excesiva | Agota al jugador casual |
| Menús infinitos | Rompe el flujo |
| RNG frustrante | Las decisiones deben importar |
| Pay-to-win | Destruye la competición |
| Grind obligatorio | Respetar el tiempo del jugador |

## 2.3 Referentes

### PC Fútbol (1992-2008)
- Estética retro-moderna
- Narración de partidos en texto
- Simplicidad en la gestión

### Football Manager (Actual)
- Profundidad táctica
- Base de datos de jugadores
- Sistema de scouts

### FIFA Career Mode
- Presentación visual
- Momentos dramáticos
- Objetivos de temporada

---

# 3. CORE GAMEPLAY LOOP

## 3.1 Loop Semanal

```
┌─────────────────────────────────────────────────────────────┐
│                    INICIO DE SEMANA                         │
│                                                             │
│  • Revisar mensajes (ofertas, lesiones, noticias)          │
│  • Comprobar estado de jugadores                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PREPARACIÓN (Lun-Vie)                     │
│                                                             │
│  • Seleccionar tipo de entrenamiento                       │
│  • Gestionar fichajes/renovaciones                         │
│  • Ajustar tácticas si es necesario                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DÍA DE PARTIDO                          │
│                                                             │
│  • Confirmar alineación y táctica                          │
│  • VER/SIMULAR el partido                                  │
│  • Hacer cambios durante el partido                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    POST-PARTIDO                             │
│                                                             │
│  • Ver resultados y clasificación                          │
│  • Analizar estadísticas                                   │
│  • Gestionar lesiones/sanciones                            │
└─────────────────────────────┴───────────────────────────────┘
                              │
                              ▼
                    AVANZAR A SIGUIENTE SEMANA
```

## 3.2 Loop de Temporada

```
PRETEMPORADA (Julio-Agosto)
├── Mercado de fichajes de verano
├── Amistosos (opcionales)
├── Definir objetivos
└── Presentación del equipo

TEMPORADA REGULAR (Agosto-Mayo)
├── Liga (38 jornadas)
├── Copa del Rey (si aplica)
├── Competiciones europeas (si clasifica)
├── Mercado de invierno (Enero)
└── Gestión continua de plantilla

FIN DE TEMPORADA (Mayo-Junio)
├── Evaluación de objetivos
├── Renovación/Despido de mánager
├── Retiros de jugadores
├── Preparación para siguiente temporada
└── Ascensos/Descensos
```

## 3.3 Estados del Juego

| Estado | Acciones Disponibles |
|--------|---------------------|
| Menu Principal | Nueva partida, Cargar, Opciones |
| Selección de Equipo | Elegir liga, país, equipo |
| Oficina (Hub principal) | Todo excepto partido |
| Día de Partido | Alineación, táctica, ver partido |
| Partido en Curso | Cambios, instrucciones |
| Ventana de Mercado | Fichajes completos |
| Fuera de Mercado | Solo renovaciones y préstamos |

---

# 4. GESTIÓN DE EQUIPO

## 4.1 Plantilla

### Límites y Requisitos
| Concepto | Valor |
|----------|-------|
| Mínimo jugadores | 18 |
| Máximo jugadores | 30 |
| Mínimo porteros | 2 |
| Fichas nacionales | Ilimitado |
| Fichas extranjeros (no UE) | 3 máximo |

### Atributos de Jugador
```
DATOS BÁSICOS
├── Nombre, Nacionalidad, Edad
├── Posición principal + secundarias
├── Pie dominante (Izquierdo/Derecho/Ambidiestro)
└── Altura, Peso

ATRIBUTOS (1-99)
├── TÉCNICOS
│   ├── Control
│   ├── Pase corto
│   ├── Pase largo
│   ├── Regate
│   ├── Disparo
│   └── Cabeceo
├── FÍSICOS
│   ├── Velocidad
│   ├── Aceleración
│   ├── Resistencia
│   ├── Fuerza
│   └── Salto
├── MENTALES
│   ├── Visión
│   ├── Compostura
│   ├── Agresividad
│   ├── Liderazgo
│   └── Trabajo en equipo
└── PORTERO (si aplica)
    ├── Reflejos
    ├── Estirada
    ├── Colocación
    └── Juego con pies

VALORACIÓN GLOBAL (Overall)
= Media ponderada según posición

POTENCIAL
= Overall máximo alcanzable (solo visible para <25 años con scout)
```

### Estados de Jugador
| Estado | Efecto | Duración |
|--------|--------|----------|
| Disponible | 100% rendimiento | - |
| Cansado | -5% a -15% rendimiento | 1-2 días |
| Lesionado (leve) | No disponible | 1-2 semanas |
| Lesionado (grave) | No disponible | 1-6 meses |
| Sancionado | No disponible para competición | 1-5 partidos |
| Descontento | -10% rendimiento, quiere salir | Hasta resolución |
| En forma | +5% rendimiento | Variable |

## 4.2 Sistema Táctico

### Formaciones Disponibles
```
DEFENSIVAS
├── 5-4-1: Ultra defensivo, bus estacionado
├── 5-3-2: Sólido con carrileros
└── 4-5-1: Compacto en mediocampo

EQUILIBRADAS
├── 4-4-2: Clásico inglés
├── 4-3-3: Equilibrio con extremos
├── 4-2-3-1: Control del centro
└── 4-1-4-1: Ancla defensiva

OFENSIVAS
├── 3-4-3: Ataque total
├── 3-5-2: Carrileros al ataque
└── 4-3-3 Ofensivo: Sin pivote
```

### Instrucciones Tácticas
```
ESTILO DE JUEGO
├── Posesión: Más pases, ritmo lento, control
├── Contraataque: Defensa baja, transiciones rápidas
├── Presión alta: Recuperar arriba, intenso
├── Juego directo: Balones largos, duelos
└── Tiki-taka: Posesión extrema, pases cortos

LÍNEA DEFENSIVA
├── Muy baja: Catenaccio, fuera de juego difícil
├── Baja: Seguro, espacios a la espalda
├── Media: Equilibrado
├── Alta: Presión, riesgo de espalda
└── Muy alta: Pressing total

INSTRUCCIONES DE POSICIÓN
├── Mantenerse en posición / Libertad
├── Incorporarse al ataque / Quedarse atrás
├── Centrar balones / Recortar
└── Buscar profundidad / Asociarse
```

### Roles Especiales
| Rol | Posición | Efecto |
|-----|----------|--------|
| Capitán | Cualquiera | +5% moral equipo, liderazgo |
| Lanzador penaltis | Delantero/Medio | Tira penaltis |
| Lanzador faltas | Medio/Delantero | Ejecuta faltas |
| Córners | Medio/Extremo | Saca córners |

## 4.3 Sistema de Entrenamiento

### Tipos de Entrenamiento Semanal
| Tipo | Efecto Principal | Efecto Secundario |
|------|-----------------|-------------------|
| Físico | +Resistencia, Velocidad | -Control |
| Técnico | +Control, Pase | Neutral |
| Táctico | +Posicionamiento | +Visión |
| Defensa | +Entradas, Marcaje | -Ataque |
| Ataque | +Disparo, Regate | -Defensa |
| Porteros | +Atributos GK | Solo porteros |
| Descanso | Recuperación fitness | Sin mejora |

### Intensidad
| Intensidad | Mejora | Riesgo Lesión | Cansancio |
|------------|--------|---------------|-----------|
| Suave | 50% | 2% | Bajo |
| Normal | 100% | 5% | Medio |
| Intenso | 150% | 12% | Alto |

### Progresión de Jugadores
```javascript
// Factores de progresión semanal
baseProgression = 0.05  // +0.05 overall potencial por semana

// Modificadores
ageModifier = {
  '16-20': 1.5,    // Jóvenes mejoran rápido
  '21-25': 1.2,    // Pico de aprendizaje
  '26-29': 1.0,    // Mantenimiento
  '30-33': 0.5,    // Declive lento
  '34+': 0.2       // Declive rápido
}

levelModifier = {
  '<70': 1.3,      // Fácil mejorar niveles bajos
  '70-79': 1.0,
  '80-84': 0.6,
  '85+': 0.3       // Muy difícil ser élite
}

facilityBonus = trainingFacilityLevel * 0.1  // 0-30% bonus

// Fórmula final
weeklyProgress = baseProgression * ageModifier * levelModifier * (1 + facilityBonus) * intensityModifier
```

## 4.4 Cantera y Juveniles

### Sistema de Cantera
```
NIVELES DE CANTERA (1-5)
├── Nivel 1: 1 juvenil/temporada, 50-60 potential
├── Nivel 2: 2 juveniles/temporada, 55-70 potential
├── Nivel 3: 3 juveniles/temporada, 60-75 potential
├── Nivel 4: 4 juveniles/temporada, 65-80 potential
└── Nivel 5: 5 juveniles/temporada, 70-85 potential

GENERACIÓN DE JUVENILES (Julio)
1. Cantidad según nivel de cantera
2. Overall inicial = 40 + rand(0, 20)
3. Potencial = según nivel cantera + factores
4. Posición = ponderada (más medios/defensas)
5. Nacionalidad = 70% local, 30% extranjero
```

### Desarrollo de Juveniles
- **Filial (B Team):** Jugadores de 17-21 pueden jugar en filial
- **Cesiones:** Enviar a otro equipo para que juegue
- **Promoción:** Subir al primer equipo

---

# 5. SISTEMA DE PARTIDOS

## 5.1 Modos de Visualización

### Modo Texto Detallado (Por defecto)
```
╔══════════════════════════════════════════════════════════════╗
║               FC BARCELONA 2 - 1 REAL MADRID                 ║
║                     Santiago Bernabéu                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ⚽ 23' LEWANDOWSKI (Yamal)                                  ║
║     Gran centro desde la derecha, remate de cabeza           ║
║     imparable al segundo palo.                               ║
║                                                              ║
║  ⚽ 45+2' VINÍCIUS (Bellingham)                              ║
║     Contraataque letal, Vinícius recibe en carrera           ║
║     y define cruzado.                                        ║
║                                                              ║
║  🟨 52' TCHOUAMÉNI                                           ║
║     Entrada dura sobre Pedri, amarilla justa.                ║
║                                                              ║
║  ⚽ 78' PEDRI (Gavi)                                         ║
║     ¡GOLAZO! Combinación de tiki-taka, Pedri remata          ║
║     desde fuera del área al ángulo.                          ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Posesión: 58% - 42%    Tiros: 14-8    A puerta: 6-4        ║
╚══════════════════════════════════════════════════════════════╝
```

### Modo Resumen Rápido
```
FC Barcelona 2-1 Real Madrid

⚽ 23' Lewandowski
⚽ 45+2' Vinícius 
⚽ 78' Pedri

[Ver detalles]
```

### Modo Simulación con Intervención
- Puedes pausar en cualquier momento
- Hacer cambios (3 ventanas, 5 cambios)
- Cambiar táctica
- Dar instrucciones específicas ("Presionar más", "Guardar resultado")

## 5.2 Motor de Simulación

### Factores de Partido
```
FUERZA DEL EQUIPO
├── Overall medio de titulares
├── Modificadores de formación
├── Modificadores de táctica
└── Bonus de sinergia (jugadores acostumbrados)

VENTAJA LOCAL
├── Base: +5 puntos
├── Estadio grande: +1 a +3 extra
├── Ambiente hostil: +1 (derbis)
└── Racha local: +1 si >3 victorias seguidas en casa

MORAL Y FORMA
├── Victoria reciente: +2 a +5
├── Derrota reciente: -2 a -5
├── Racha positiva: +3
├── Racha negativa: -3

FATIGA
├── 3 partidos en 7 días: -5%
├── Viaje internacional: -3%
├── Jugador con <70 fitness: rinde al % de fitness
```

### Eventos de Partido
```
EVENTOS PRINCIPALES
├── Gol (con tipo: tap-in, cabezazo, tiro lejano, penalti, propia)
├── Tarjeta amarilla
├── Tarjeta roja (directa o doble amarilla)
├── Lesión (con severidad)
├── Cambio
├── Penalti fallado
└── Parada decisiva

EVENTOS SECUNDARIOS
├── Tiro al palo
├── Ocasión clara fallada
├── Fuera de juego
├── Falta peligrosa
└── Córner
```

### Probabilidades de Gol
```javascript
// Base: ~2.5-3 goles por partido
baseGoalChance = 0.032 // por minuto, por equipo

// Modificado por:
attackStrength   // Fuerza atacante del equipo
defenseStrength  // Debilidad defensiva del rival
goalkeeperRating // Calidad del portero rival
homeFactor       // +15% en casa
tacticFactor     // Ofensivo: +20%, Defensivo: -25%
momentumFactor   // +/- según eventos recientes

// Distribución temporal
firstHalf: 45%   // Goles en primera parte
secondHalf: 55%  // Más goles cansados

// Minutos calientes
'1-15': 12%      // Inicio activo
'40-45': 18%     // Pre-descanso
'75-90': 25%     // Final frenético
```

## 5.3 Competiciones

### Liga
- **38 jornadas** (ida y vuelta)
- **3 puntos** victoria, 1 empate, 0 derrota
- **Desempate:** Enfrentamiento directo → Diferencia goles → Goles a favor
- **Premios:**
  - 1º-4º: Champions League
  - 5º-6º: Europa League
  - 7º: Conference League (o copa)
  - 18º-20º: Descenso

### Copa del Rey
- **Formato:** Eliminatorias a partido único (hasta semifinales)
- **Semifinales:** Ida y vuelta
- **Final:** Partido único en campo neutral
- **Equipos:** Todos los de 1ª, 2ª y más

### Champions League
```
FASE DE GRUPOS (Nuevo formato 2024+)
├── 36 equipos en liga única
├── 8 partidos cada uno (4 casa, 4 fuera)
├── Top 8: Pasan a octavos
├── 9-24: Playoff (ida/vuelta)
└── 25-36: Eliminados

ELIMINATORIAS
├── Octavos: Ida y vuelta
├── Cuartos: Ida y vuelta
├── Semifinales: Ida y vuelta
└── Final: Partido único
```

### Supercopa, Mundialito, etc.
- Eventos especiales de pretemporada/mitad de temporada

---

# 6. MERCADO DE FICHAJES

## 6.1 Ventanas de Mercado

### Mercado de Verano (1 Julio - 31 Agosto)
- Mercado principal
- Todos los tipos de operaciones
- Deadline Day especial (31 Agosto)

### Mercado de Invierno (1 Enero - 31 Enero)
- Mercado secundario
- Operaciones más limitadas
- Deadline Day de invierno (31 Enero)

### Fuera de Mercado
- Solo renovaciones de contrato
- Fichajes de jugadores sin equipo
- Rescisiones de contrato

## 6.2 Tipos de Operaciones

### Traspaso
```
FLUJO DE TRASPASO
1. Identificar objetivo (scouting o conocido)
2. Comprobar precio (valor de mercado + factores)
3. Hacer oferta al club
4. Club acepta/rechaza/contraoferta
5. Si acepta: Negociar con jugador
6. Jugador acepta/rechaza/contraoferta
7. Si acepta: Pagar y registrar

FACTORES DE PRECIO
├── Valor base: Overall × edad × posición
├── Contrato largo: +20% por año sobre 2
├── Jugador clave: +30%
├── Jugador quiere irse: -20%
├── Deadline day: +/- 20%
└── Relaciones club: +/- 10%
```

### Cesión (Préstamo)
```
TIPOS DE CESIÓN
├── Simple: Solo préstamo
├── Con opción de compra: Puedes comprar al final
├── Con obligación de compra: Debes comprar si cumple X
└── Con pago de ficha: Compartes salario

DURACIÓN
├── 6 meses: Hasta final de temporada
├── 12 meses: Temporada completa
├── 18 meses: Temporada y media
└── 24 meses: Dos temporadas

CONDICIONES
├── Garantía de minutos
├── No puede jugar vs equipo dueño
└── Opción de recall (cancelar antes)
```

### Cláusula de Rescisión
- Pagar cláusula = bypass negociación con club
- Solo negociar con jugador
- Algunos jugadores tienen cláusulas abusivas

### Jugadores Libres
- Sin coste de traspaso
- Prima de fichaje al jugador (10-30% de su valor)
- Disponibles todo el año

## 6.3 Agentes y Comisiones

### Tipos de Agentes
| Agente | Comisión | Comportamiento |
|--------|----------|----------------|
| Sin agente | 0% | Negociación directa |
| Familiar | 3-5% | Razonable |
| Agente normal | 5-8% | Estándar |
| Superagente (Mendes, etc.) | 10-15% | Exigente, conexiones |

### Influencia del Agente
- Puede recomendar traspasos
- Negocia mejores condiciones para su cliente
- Puede bloquear operaciones
- Relaciones con ciertos clubs

## 6.4 Scouting

### Red de Scouts
```
NIVELES DE SCOUTING (1-5)
├── Nivel 1: Solo liga propia
├── Nivel 2: + Ligas top 5
├── Nivel 3: + Ligas secundarias Europa
├── Nivel 4: + Sudamérica
└── Nivel 5: Cobertura mundial

INFORMACIÓN REVELADA
├── Sin scout: Nombre, posición, club, edad
├── Nivel 1: + Overall aproximado (±5)
├── Nivel 2: + Overall exacto, atributos principales
├── Nivel 3: + Todos los atributos, personalidad
├── Nivel 4: + Potencial aproximado (±5)
└── Nivel 5: + Potencial exacto, historial completo
```

### Informes de Scout
- Tiempo de elaboración: 1-4 semanas según nivel
- Coste: 10K-100K según jugador
- Información caduca: 3 meses

## 6.5 Negociación con Jugador

### Factores de Decisión
```
ACEPTACIÓN = f(salario, proyecto, ubicación, minutos, edad)

SALARIO
├── Oferta < actual: Muy difícil (-50%)
├── Oferta = actual: Difícil (-20%)
├── Oferta +20%: Neutral
├── Oferta +50%: Fácil (+20%)
└── Oferta +100%: Muy fácil (+40%)

PROYECTO DEPORTIVO
├── Equipo peor clasificado: -20%
├── Equipo similar: Neutral
├── Equipo mejor clasificado: +20%
├── Champions League: +30%
└── Título reciente: +15%

PERSONALIDAD
├── Ambicioso: Prioriza proyecto
├── Mercenario: Prioriza dinero
├── Leal: Difícil sacar de su club
├── Profesional: Equilibrado
└── Rebelde: Impredecible
```

### Contrademandas
El jugador puede pedir:
- Más salario (+10-30%)
- Prima de fichaje
- Cláusula de rescisión
- Garantía de minutos
- Rol de capitán/lanzador

---

# 7. ECONOMÍA DEL CLUB

## 7.1 Balance Financiero

### Ingresos
```
INGRESOS SEMANALES
├── Derechos TV: Fijo según posición liga anterior
├── Abonos: Fijo según configuración estadio
├── Patrocinios: Fijo según nivel instalaciones
└── Merchandising: Variable según éxito

INGRESOS POR PARTIDO
├── Taquilla: Capacidad × precio × ocupación
├── Hospitality: VIP × precio VIP
├── Parking/Servicios: Si habilitados
└── Bonus TV: Partidos destacados

INGRESOS EXTRAORDINARIOS
├── Venta de jugadores
├── Premios de competición
├── Giras de pretemporada
└── Naming rights (estadio)
```

### Gastos
```
GASTOS SEMANALES
├── Salarios jugadores: Suma de fichas
├── Salarios staff: Técnico, médico, etc.
├── Mantenimiento: Instalaciones y estadio
└── Operativos: Fijo según categoría

GASTOS PUNTUALES
├── Fichajes: Traspaso + comisiones
├── Mejoras instalaciones
├── Ampliación estadio
├── Despidos/Rescisiones
├── Multas
└── Primas por objetivos
```

### Fair Play Financiero
- **Límite salarial:** Masa salarial < 70% ingresos
- **Balance:** No puedes tener pérdidas >30M en 3 años
- **Penalizaciones:** Prohibición de fichajes, puntos de liga

## 7.2 Estadio

### Zonas del Estadio
| Zona | Capacidad Base | Precio Sugerido | Tipo de Fan |
|------|---------------|-----------------|-------------|
| Fondo | 40% | €20-40 | Ultras, familias |
| Lateral | 35% | €40-70 | Fan medio |
| Tribuna | 20% | €70-120 | Fan premium |
| VIP | 5% | €150-300 | Corporativo |

### Servicios
| Servicio | Coste Instalación | Ingreso/Partido |
|----------|-------------------|-----------------|
| Parking | €2M | €3 × plazas |
| Restauración | €5M | €5 × asistentes |
| Tienda oficial | €3M | €4 × asistentes |
| Tour del estadio | €1M | €15K fijo |
| Museo | €4M | €20K fijo |

### Ampliación
```
COSTE DE AMPLIACIÓN
├── +5,000 asientos: €15M, 6 meses
├── +10,000 asientos: €35M, 12 meses
├── +20,000 asientos: €80M, 18 meses
└── Estadio nuevo: €200-500M, 36 meses
```

## 7.3 Instalaciones

### Tipos de Instalaciones
| Instalación | Efecto | Coste por Nivel |
|-------------|--------|-----------------|
| Ciudad Deportiva | +Entrenamiento | €10M → €25M → €50M |
| Centro Médico | -Tiempo lesiones | €5M → €12M → €25M |
| Cantera | +Calidad juveniles | €8M → €20M → €40M |
| Scouting | +Cobertura, info | €3M → €8M → €15M |
| Marketing | +Ingresos sponsor | €2M → €5M → €10M |
| Análisis de datos | +Info rival | €2M → €5M → €10M |

---

# 8. SISTEMA DE TEMPORADAS

## 8.1 Calendario Anual

```
JULIO
├── Inicio de pretemporada
├── Mercado de verano abierto
├── Amistosos disponibles
└── Generación de juveniles

AGOSTO
├── Pretemporada continúa
├── Supercopa (si aplica)
├── Deadline Day (31 agosto)
└── Inicio de Liga

SEPTIEMBRE - DICIEMBRE
├── Liga (jornadas 1-17)
├── Champions/Europa League grupos
├── Copa del Rey (rondas iniciales)
└── Parón selecciones (septiembre, noviembre)

ENERO
├── Liga (jornadas 18-21)
├── Mercado de invierno
├── Copa del Rey (octavos)
└── Supercopa (nuevo formato)

FEBRERO - MAYO
├── Liga (jornadas 22-38)
├── Champions/Europa League eliminatorias
├── Copa del Rey (cuartos → final)
└── Parón selecciones (marzo)

JUNIO
├── Fin de temporada
├── Final Champions
├── Evaluación de objetivos
├── Retiros y fin de contratos
└── Vacaciones antes de pretemporada
```

## 8.2 Objetivos de Temporada

### Tipos de Objetivos
| Prioridad | Descripción | Impacto si falla |
|-----------|-------------|------------------|
| Crítico | Obligatorio (ej: no descender) | Despido |
| Principal | Esperado (ej: Top 4) | -30 reputación, presión |
| Secundario | Deseable (ej: Semifinal copa) | -10 reputación |
| Bonus | Extra (ej: Mejor ataque) | Sin penalización |

### Ejemplos por Tipo de Club
```
CLUB GRANDE (Real Madrid, Barça)
├── Crítico: Ganar la Liga O Champions
├── Principal: Llegar a semifinales Champions
├── Secundario: Ganar Copa del Rey
└── Bonus: Mejor defensa de la liga

CLUB MEDIO (Athletic, Sevilla)
├── Crítico: Clasificar a Europa
├── Principal: Top 6
├── Secundario: Cuartos de Copa
└── Bonus: Superar puntos de temporada anterior

CLUB PEQUEÑO (Recién ascendido)
├── Crítico: Mantener categoría
├── Principal: Terminar por encima de otro recién ascendido
├── Secundario: Victoria en derbi regional
└── Bonus: Alcanzar 45 puntos
```

### Evaluación
- **Se evalúa al final de temporada**
- **Superar objetivos = bonus económico + reputación**
- **Fallar crítico = despido garantizado**
- **La junta puede ser más o menos paciente** según club

## 8.3 Premios de Fin de Temporada

### Liga
| Posición | Premio Económico |
|----------|------------------|
| 1º (Campeón) | €50M |
| 2º | €35M |
| 3º | €25M |
| 4º | €20M |
| 5º-7º | €10M |
| 8º-10º | €5M |
| Resto | €2M |

### Champions League
| Ronda | Premio |
|-------|--------|
| Fase grupos (por partido ganado) | €3M |
| Fase grupos (por empate) | €1M |
| Clasificar octavos | €10M |
| Cuartos | €12M |
| Semifinales | €15M |
| Final (perdedor) | €20M |
| Campeón | €30M |

### Otros
- Copa del Rey: €5M campeón
- Europa League: Similar a Champions ×0.4
- Conference League: Similar a Champions ×0.2

---

# 9. PROGRESIÓN Y CARRERA

## 9.1 Perfil del Mánager

### Atributos del Mánager
```
REPUTACIÓN (1-100)
├── Determina ofertas de trabajo
├── Influencia en fichajes (jugadores quieren venir)
├── Paciencia de la directiva
└── Salario potencial

EXPERIENCIA
├── Partidos dirigidos
├── Títulos ganados
├── Jugadores desarrollados
└── Récords personales

ESPECIALIDADES
├── Táctico: +eficacia de instrucciones
├── Motivador: +moral del equipo
├── Descubridor: +scouts más efectivos
├── Desarrollador: +progresión de jóvenes
└── Negociador: +éxito en fichajes
```

### Progresión de Mánager
```
NIVELES DE CARRERA
├── Novato: Rep 1-20, solo equipos pequeños
├── Prometedor: Rep 21-40, equipos medianos
├── Establecido: Rep 41-60, equipos de mitad de tabla
├── Reconocido: Rep 61-80, equipos top
└── Élite: Rep 81-100, cualquier equipo del mundo

GANAR REPUTACIÓN
├── Victoria en partido importante: +1-3
├── Racha invicta larga: +2-5
├── Título de liga: +10-20 (según liga)
├── Champions League: +15-25
├── Superar objetivos: +5-10

PERDER REPUTACIÓN
├── Derrota humillante: -1-3
├── Mala racha: -2-5
├── No cumplir objetivos: -5-15
├── Despido: -10-20
├── Escándalo: -5-30
```

## 9.2 Ofertas de Trabajo

### Recibir Ofertas
- Llegan según tu reputación
- Equipos que despidieron su entrenador
- Equipos que buscan mejor nivel
- Selecciones nacionales (especial)

### Cambiar de Equipo
```
CONSIDERACIONES
├── Romper contrato = indemnización
├── Llevarte staff = coste extra
├── Reputación en club anterior afectada
└── Jugadores del club anterior más difíciles de fichar
```

### Retiro
- Puedes retirarte en cualquier momento
- Ver estadísticas de carrera
- Palmarés final
- Opción de empezar nueva carrera

## 9.3 Legado y Récords

### Estadísticas Personales
- Partidos dirigidos (total y por club)
- Victorias/Empates/Derrotas
- Títulos por competición
- Mejor racha invicta
- Mayor goleada a favor/en contra
- Jugadores fichados/vendidos

### Hall of Fame
- Comparativa con otros mánagers (IA)
- Clasificación histórica de la liga
- Récords del juego

---

# 10. INTERFAZ DE USUARIO

## 10.1 Pantalla Principal (Oficina)

```
┌────────────────────────────────────────────────────────────────────┐
│  ⚽ PC FÚTBOL WEB                               💰€45.2M  📅Sem 12 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐  ┌─────────────────────────────────────────────────┐│
│  │          │  │                                                 ││
│  │ SIDEBAR  │  │              CONTENIDO PRINCIPAL                ││
│  │          │  │                                                 ││
│  │ Overview │  │  Bienvenido, Míster                            ││
│  │ Plantilla│  │                                                 ││
│  │ Táctica  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │ Entreno  │  │  │Posición │ │ Puntos  │ │Próximo  │           ││
│  │ Fichajes │  │  │   3º    │ │   24    │ │vs Betis │           ││
│  │ Estadio  │  │  └─────────┘ └─────────┘ └─────────┘           ││
│  │ Finanzas │  │                                                 ││
│  │ Liga     │  │  Últimos resultados: W W D W L                 ││
│  │ Mensajes │  │                                                 ││
│  │          │  │  ┌─────────────────────────────────────────┐   ││
│  │          │  │  │ 3 mensajes nuevos                       │   ││
│  │          │  │  │ • Oferta por Pedri (PSG)                │   ││
│  │          │  │  │ • Lesión de Araujo (2 semanas)          │   ││
│  │          │  │  │ • Objetivo cumplido: Top 4              │   ││
│  │          │  │  └─────────────────────────────────────────┘   ││
│  │          │  │                                                 ││
│  └──────────┘  └─────────────────────────────────────────────────┘│
│                                                                    │
│  [💾 Guardar]  [⏭️ Avanzar Semana]  [⏩ Simular...]               │
└────────────────────────────────────────────────────────────────────┘
```

## 10.2 Pantallas Principales

### Plantilla
- Lista de jugadores con filtros
- Ordenar por posición/overall/edad/salario
- Click en jugador = perfil detallado
- Drag & drop para alineación

### Táctica
- Campo de fútbol interactivo
- Selección de formación (dropdown)
- Arrastrar jugadores a posiciones
- Panel de instrucciones tácticas
- Guardar múltiples tácticas

### Fichajes
- Pestañas: Entrantes | Salientes | Búsqueda
- Filtros por posición, edad, precio
- Lista de interesados en tus jugadores
- Historial de ofertas

### Liga
- Clasificación actual con forma
- Calendario con resultados
- Estadísticas (goleadores, asistentes)
- Partidos destacados de la jornada

## 10.3 Diseño Visual

### Paleta de Colores
```
PRIMARIOS
├── Verde campo: #1a472a (fondo principal)
├── Verde césped: #2d5a27 (acentos)
├── Dorado: #c9a227 (destacados, oro)
└── Blanco: #ffffff (texto principal)

SECUNDARIOS
├── Gris oscuro: #1a1a2e (paneles)
├── Gris medio: #2d2d44 (bordes)
├── Azul info: #4a90d9 (enlaces, info)
├── Rojo alerta: #d94444 (errores, lesiones)
├── Verde éxito: #44d944 (confirmaciones)
└── Amarillo warning: #d9c944 (advertencias)
```

### Tipografía
```
HEADERS
├── Font: "Oswald", sans-serif
├── Peso: 600-700
└── Tamaño: 24-48px

BODY
├── Font: "Roboto", sans-serif
├── Peso: 400
└── Tamaño: 14-16px

DATOS/STATS
├── Font: "Roboto Mono", monospace
├── Peso: 500
└── Tamaño: 12-14px
```

### Componentes Reutilizables
- Cards de jugador
- Barras de progreso
- Badges de estado
- Modales de confirmación
- Tooltips informativos
- Notificaciones toast

## 10.4 Responsive Design

### Breakpoints
```
Desktop: >1200px (diseño completo)
Tablet: 768-1200px (sidebar colapsable)
Mobile: <768px (navegación bottom, pantallas apiladas)
```

### Navegación Móvil
```
┌──────────────────────────────────────┐
│  FC Barcelona        €45.2M   Sem 12 │
├──────────────────────────────────────┤
│                                      │
│         CONTENIDO PRINCIPAL          │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  🏠   👥   ⚽   📊   📬   ⏭️         │
│ Home Squad Tactic Table Msgs Next    │
└──────────────────────────────────────┘
```

---

# 11. DATOS Y REALISMO

## 11.1 Base de Datos de Jugadores

### Fuente de Datos
- Scraping de fuentes públicas (Transfermarkt, Sofascore)
- Actualización al inicio de cada temporada real
- Sistema de fallback para datos faltantes

### Ligas Incluidas (Fase 1)
| Liga | Equipos | Jugadores ~aprox |
|------|---------|------------------|
| LaLiga | 20 | 500 |
| Premier League | 20 | 500 |
| Serie A | 20 | 500 |
| Bundesliga | 18 | 450 |
| Ligue 1 | 18 | 450 |
| **Total Fase 1** | **96** | **~2400** |

### Ligas Futuras (Fase 2+)
- Segunda División española
- Championship inglés
- Serie B italiana
- 2. Bundesliga
- Ligue 2
- Liga Portuguesa
- Eredivisie
- Liga argentina, brasileña, MLS

### Actualización de Datos
```
PROCESO DE ACTUALIZACIÓN
1. Scraper extrae datos de fuentes
2. Parser normaliza formato
3. Validación de datos (rangos, tipos)
4. Merge con datos existentes
5. Subida a Firebase
6. Versión del dataset incrementada
```

## 11.2 Generación Procedural

### Jugadores Generados (cuando faltan datos)
```javascript
function generatePlayer(position, tier, nationality) {
  const firstNames = getFirstNames(nationality);
  const lastNames = getLastNames(nationality);
  
  const overallRange = TIER_RANGES[tier]; // ej: {min: 65, max: 75}
  const overall = randomInRange(overallRange);
  
  const age = generateAge(tier); // Grandes: 24-32, Medianos: 20-35, etc.
  
  const attributes = generateAttributes(position, overall);
  const personality = generatePersonality();
  
  return {
    name: `${random(firstNames)} ${random(lastNames)}`,
    position,
    overall,
    age,
    attributes,
    personality,
    isGenerated: true
  };
}
```

### Equipos de IA
- Comportamiento basado en perfil (ofensivo, defensivo, etc.)
- Fichajes coherentes con presupuesto y necesidades
- Alineaciones inteligentes

## 11.3 Simulación Realista

### Distribución de Resultados
```
AJUSTADO A ESTADÍSTICAS REALES
├── Victoria local: 45%
├── Empate: 25%
├── Victoria visitante: 30%
├── Media goles/partido: 2.7
├── Partidos con 0 goles: 8%
├── Partidos con 4+ goles: 20%
```

### Eventos Realistas
- Lesiones: 3-5% por partido por jugador
- Tarjetas: 3-4 amarillas/partido media
- Rojas: 0.1 por partido media
- Penaltis: 0.15 por partido

---

# 12. ROADMAP TÉCNICO

## 12.1 Fase 1: MVP (4-6 semanas)

### Core Features
- [ ] Selección de equipo (LaLiga)
- [ ] Gestión básica de plantilla
- [ ] Sistema de formaciones (6 formaciones)
- [ ] Simulación de partidos (texto)
- [ ] Liga completa (38 jornadas)
- [ ] Clasificación y resultados
- [ ] Fichajes básicos (compra/venta)
- [ ] Guardar/Cargar partida (Firebase)
- [ ] UI responsive

### Entregable
Build jugable con una temporada completa

---

## 12.2 Fase 2: Contenido (4-6 semanas)

### Features
- [ ] 5 ligas europeas principales
- [ ] Copa del Rey
- [ ] Champions League (simplificada)
- [ ] Sistema de entrenamiento
- [ ] Lesiones y sanciones
- [ ] Objetivos de temporada
- [ ] Estadísticas detalladas
- [ ] Préstamos de jugadores

### Entregable
Experiencia completa multi-liga

---

## 12.3 Fase 3: Profundidad (4-6 semanas)

### Features
- [ ] Sistema de scouts
- [ ] Cantera y juveniles
- [ ] Instalaciones del club
- [ ] Gestión de estadio
- [ ] Finanzas detalladas
- [ ] Personalidad de jugadores
- [ ] Agentes y comisiones
- [ ] Deadline Day

### Entregable
Gestión profunda tipo FM lite

---

## 12.4 Fase 4: Pulido (2-4 semanas)

### Features
- [ ] Tutorial interactivo
- [ ] Logros y trofeos
- [ ] Estadísticas de carrera
- [ ] Optimización de rendimiento
- [ ] PWA (offline básico)
- [ ] Sonidos y feedback
- [ ] Testing exhaustivo

### Entregable
Release candidate

---

## 12.5 Post-Lanzamiento

### Actualizaciones Continuas
- Nuevas ligas
- Actualización de plantillas (cada temporada)
- Eventos especiales (Mundial, Eurocopa)
- Nuevas features según feedback

### Monetización (Opcional)
- Versión gratuita: 1 partida guardada, 1 liga
- Premium: Múltiples saves, todas las ligas, sin ads
- **NO pay-to-win**

---

# APÉNDICES

## A. Glosario

| Término | Definición |
|---------|------------|
| Overall | Valoración global del jugador (1-99) |
| Potencial | Máximo overall alcanzable |
| Fixture | Partido programado |
| Matchday | Jornada de liga |
| Deadline Day | Último día del mercado |
| Loan | Préstamo/Cesión |
| Release Clause | Cláusula de rescisión |
| Fair Play Financiero | Regulaciones económicas UEFA |

## B. Fórmulas Clave

### Valor de Mercado
```
baseValue = {
  99: 200M, 95: 150M, 90: 100M, 85: 50M,
  80: 25M, 75: 12M, 70: 5M, 65: 2M, 60: 800K
}

ageMultiplier = {
  '17-20': 1.5, '21-24': 1.3, '25-28': 1.1,
  '29-31': 0.8, '32-33': 0.5, '34+': 0.25
}

positionMultiplier = {
  ST: 1.2, CAM: 1.1, CB: 1.0, CM: 1.0,
  RW/LW: 1.1, RB/LB: 0.9, CDM: 0.95, GK: 0.7
}

contractMultiplier = {
  '1 year': 0.5, '2 years': 0.75, '3 years': 0.9,
  '4 years': 1.0, '5+ years': 1.1
}

VALUE = baseValue[overall] × ageMultiplier × positionMultiplier × contractMultiplier
```

### Salario Sugerido
```
weeklySalary = VALUE × 0.001 × leagueFactor × clubReputation
```

## C. Referencias

- **PC Fútbol (1992):** Mecánicas base, estética
- **Football Manager:** Profundidad táctica, scouting
- **FIFA Career Mode:** Presentación, objetivos
- **Hattrick:** Gestión web, simplicidad

---

**Diseñador:** Jiru 🦦
**Fecha:** 27 Enero 2026
**Versión:** 2.0

*"El fútbol es un juego simple complicado por idiotas que juegan."* - Bill Shankly
