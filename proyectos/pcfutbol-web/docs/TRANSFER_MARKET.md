# Sistema de Fichajes - Documentación Completa

## Visión General

El módulo `transferMarket.js` implementa un sistema de mercado de fichajes realista y profundo, con 4 pilares fundamentales:

1. **Préstamos** - Sistema completo de cesiones
2. **Ofertas entrantes de IA** - La IA hace ofertas por tus jugadores
3. **Negociación con jugador** - El jugador puede rechazar aunque el club acepte
4. **Deadline Day** - Caos del último día del mercado

---

## 1. Sistema de Préstamos

### Tipos de Préstamo
```javascript
import { LOAN_TYPES } from './src/game/transferMarket.js';

// standard: Cesión simple
// withOption: Cesión con opción de compra
// withMandatory: Cesión con obligación de compra
// withWageSplit: Cesión compartiendo salario
```

### Crear Préstamo
```javascript
const result = market.createLoanOffer({
  playerId: 'player123',
  fromTeamId: 'team_selling',
  toTeamId: 'team_buying',
  duration: 12,              // meses (6, 12, 18, 24)
  loanFee: 500000,           // cuota de cesión
  wageSplit: 100,            // % que paga el equipo receptor
  buyOption: {
    amount: 15000000,
    mandatory: false
  },
  conditions: ['minutes_bonus']
});
```

### Flujo de Préstamo
1. Club A crea oferta → `createLoanOffer()`
2. Club B responde → `respondToLoanOffer(offerId, 'accept'/'reject'/'counter')`
3. Si acepta, el jugador decide → `negotiateWithPlayerForLoan()`
4. Si el jugador acepta → `executeLoan()`
5. Al final del préstamo → `processLoanEnd(playerId)`
6. Si hay opción de compra → Club decide si ejerce → `executeBuyOption()`

### Factores de Decisión del Jugador
- **Minutos jugados**: Si no juega, quiere irse (+40 puntos si <30%)
- **Reputación equipos**: Prefiere equipos mejores
- **Edad**: Jóvenes quieren experiencia (+20)
- **Objetivo especial**: Ir al Mundial, demostrar valía, etc.
- **Lealtad**: Arraigo al club actual
- **Felicidad actual**: Descontento = más probable que acepte

---

## 2. Ofertas Entrantes de IA

### Generación Automática
```javascript
// Generar ofertas por jugadores de tu equipo
const offers = market.generateAIOffers('my_team_id');
```

### Factores de Probabilidad
- **Overall**: Más bueno = más ofertas
- **Edad**: Jóvenes más demandados (+12% si ≤23)
- **Rendimiento**: Goles/asistencias aumentan interés
- **Felicidad**: Jugadores infelices atraen más ofertas (+10-20%)
- **Liga**: Equipos de ligas menores reciben más ofertas

### Equipos Interesados
La IA filtra equipos que:
1. Pueden permitirse el salario
2. Pueden permitirse el traspaso
3. Necesitan esa posición O el jugador es excepcional

### Estructura de Oferta IA
```javascript
{
  id: 'offer_xxx',
  type: 'transfer',
  playerId, playerName,
  fromTeamId, fromTeamName,
  toTeamId, toTeamName,
  amount: 50000000,         // €50M
  salaryOffer: 150000,      // €150K/semana
  contractYears: 4,
  status: 'pending',
  isAIOffer: true,
  urgency: 'normal'
}
```

### Guerras de Ofertas
```javascript
// Si varios equipos hacen ofertas por el mismo jugador
const biddingWar = market.handleBiddingWar(playerId);
// { highestBid: 80000000, offers: [...] }
```

---

## 3. Negociación con Jugador

### Flujo Completo
```javascript
// 1. Clubes acuerdan traspaso
// 2. Negociar con jugador
const result = market.negotiateWithPlayer(offerId);

if (result.response === 'accept') {
  // Jugador acepta → ejecutar traspaso
  market.executeTransfer(offer);
} else if (result.response === 'negotiate') {
  // Jugador quiere negociar
  const demand = result.counterDemand;
  // { salary, contractYears, signingBonus, releaseClause, conditions }
  
  // Responder a sus demandas
  market.respondToPlayerDemand(offerId, 'accept'); // o 'counter' con adjustedTerms
} else {
  // Jugador rechaza
  // offer.status = 'player_rejected'
}
```

### Factores de Decisión
Sistema basado en `playerPersonality.js`:
- Tipo de personalidad (Ambicioso, Mercenario, Leal, etc.)
- Salario ofrecido vs actual
- Reputación del equipo destino
- Proyecto deportivo (posición en liga)
- Felicidad actual
- Objetivo especial (Mundial, títulos, etc.)

### Contra-demandas del Jugador
- **Salario**: Más alto según la brecha de aceptación
- **Prima de fichaje**: 10% del traspaso si es reacio
- **Cláusula de rescisión**: x2.5 del traspaso si es bueno/joven
- **Condiciones especiales**:
  - Garantía de minutos (si quiere ir al Mundial)
  - Promesa de titularidad (si es competidor)

### Rondas de Negociación
- Máximo 3 rondas
- Cada ronda el jugador reduce ligeramente sus pretensiones
- Si no hay acuerdo en 3 rondas → rechaza definitivamente

---

## 4. Deadline Day

### Activación
```javascript
const start = market.startDeadlineDay();
// { active: true, startHour: 8, endHour: 23 }
```

### Simulación Hora a Hora
```javascript
const hourResult = market.advanceDeadlineDayHour();
// { hour: 14, hoursRemaining: 9, events: [...], urgencyLevel: 'normal' }
```

### Niveles de Urgencia
| Horas restantes | Nivel | Tiempo respuesta |
|-----------------|-------|------------------|
| >6 | normal | 4 horas |
| 3-6 | medium | 2 horas |
| 1-3 | high | 1 hora |
| <1 | critical | 30 minutos |

### Eventos por Fase
- **8:00-11:00**: Actividad normal
- **12:00-15:00**: Ofertas aumentadas (+30%)
- **16:00-19:00**: Negociaciones aceleradas
- **20:00-22:00**: Caos total
  - Ofertas de pánico (130-170% del valor)
  - Jugadores descontentos presionan
  - Ofertas que expiran

### Cierre del Mercado
```javascript
// Cuando currentHour >= 23
const end = market.endDeadlineDay();
// { active: false, message: '🔔 ¡El mercado ha cerrado!', summary: {...} }
```

---

## Sistema de Agentes

### Tipos de Agente
```javascript
import { AGENT_TYPES } from './src/game/transferMarket.js';

// mendes: Jorge Mendes (15%, muy codicioso)
// raiola_legacy: Rafaela Pimenta (12%)
// zahavi: Pini Zahavi (10%)
// barnett: Jonathan Barnett (8%)
// generic: Agente genérico (5%)
// familyMember: Familiar (3%)
// noAgent: Sin representante (0%)
```

### Asignar Agente
```javascript
market.assignAgent(playerId, 'auto'); // Automático según calidad
market.assignAgent(playerId, 'mendes'); // Específico
```

### Comisiones
```javascript
const fee = market.calculateAgentFee(player, transferAmount);
// Agentes codiciosos piden más en fichajes >50M
```

### Influencia en Decisiones
```javascript
const influence = market.getAgentInfluenceOnDecision(player, offer);
// { modifier: +15, reasons: [...], agentFee: 10000000 }
```

---

## Cláusulas de Rescisión

### Pagar Cláusula
```javascript
// Bypass negociación con club
const result = market.payReleaseClause(playerId, buyingTeamId);
// { success: true, nextStep: 'negotiate_player' }
```

### Negociar Cláusula en Renovación
```javascript
const result = market.negotiateReleaseClause(playerId, proposedClause);
if (!result.success) {
  console.log(`Demanda: ${result.demanded}`);
  console.log(result.reasons);
}
```

---

## Cálculo de Valor de Mercado

### Fórmula
```javascript
const value = market.calculateMarketValue(player);
```

### Factores
| Factor | Impacto |
|--------|---------|
| Overall | Base exponencial (70→€2M, 80→€30M, 90→€150M) |
| Edad 17-18 | x2.0 (wonderkid) |
| Edad 21-23 | x1.4 |
| Edad 24-27 | x1.2 |
| Edad 28-30 | x0.8 |
| Edad 31-33 | x0.35 |
| Posición ST | x1.2 |
| Posición GK | x0.65 |
| Contrato 1 año | x0.5 |
| Contrato 5+ años | x1.15 |
| Potencial alto (jóvenes) | x1.2-1.4 |

### Valores de Referencia 2026
| Jugador | OVR | Edad | Valor |
|---------|-----|------|-------|
| Vinicius Jr | 92 | 24 | €260M |
| Bellingham | 90 | 21 | €253M |
| Lamine Yamal | 84 | 17 | €141M |
| Griezmann | 84 | 33 | €17M |
| Isco | 79 | 32 | €11M |

---

## Contraoferta del Club

```javascript
const counter = market.generateSellerCounterOffer(offer);
// {
//   amount: 80000000,
//   conditions: [
//     { type: 'sell_on', value: 15, text: 'Porcentaje de futura venta' },
//     { type: 'appearances', value: 5000000, threshold: 30, text: 'Bonus por 30 partidos' }
//   ],
//   message: 'Contraoferta razonable'
// }
```

### Factores
- Jugador clave → +20% precio
- Deadline day → -10% (más flexible)
- Problemas financieros → -15%
- Jugador quiere irse → -10%

### Condiciones Adicionales
- **sell_on**: Porcentaje de futura venta (15-25% para jóvenes)
- **appearances**: Bonus por partidos jugados
- **goals**: Bonus por goles
- **titles**: Bonus por títulos

---

## API Completa

### Gestión de Estado
```javascript
market.getMarketStatus();        // Estado completo del mercado
market.getActiveOffersForTeam(teamId, 'incoming'/'outgoing'/'all');
market.getPlayerTransferHistory(playerId);
market.getTopTransfersInWindow();
market.cleanupExpiredOffers();
```

### Simulación IA
```javascript
market.simulateDailyMarketActivity(); // Simular un día de mercado
market.findRandomTransferTarget(team); // Buscar objetivo para equipo
market.getTeamNeeds(team);            // Posiciones que necesita
```

### Utilidades
```javascript
isTransferWindowOpen(currentDate);    // ¿Ventana abierta?
daysUntilWindowClose(currentDate, 'summer'/'winter');
formatOffer(offer);                   // Formatear para mostrar
```

---

## Integración con playerPersonality.js

El sistema de fichajes se integra profundamente con el sistema de personalidades:

```javascript
import { evaluateTransferOffer, calculatePlayerHappiness, PERSONALITIES } from './playerPersonality.js';

// El sistema de fichajes usa:
// - evaluateTransferOffer() para decisiones de jugador
// - PERSONALITIES para comportamiento según tipo
// - player.personality.happiness para urgencia de salida
// - player.personality.wantsToLeave para probabilidad de ofertas
// - player.personality.specialGoal para motivaciones especiales
```

---

## Ejemplo Completo

```javascript
import { TransferMarket, createTransferMarket } from './transferMarket.js';

// Crear mercado
const market = createTransferMarket(gameState);

// Generar ofertas de IA
const incomingOffers = market.generateAIOffers('my_team_id');

// Evaluar una oferta
const offer = incomingOffers[0];
console.log(`${offer.toTeamName} ofrece €${offer.amount/1e6}M por ${offer.playerName}`);

// Si aceptamos, negociar con jugador
const negotiation = market.negotiateWithPlayer(offer.id);
if (negotiation.response === 'accept') {
  market.executeTransfer(offer);
} else if (negotiation.response === 'negotiate') {
  // Aceptar sus demandas
  market.respondToPlayerDemand(offer.id, 'accept');
}

// Simular Deadline Day
market.startDeadlineDay();
while (true) {
  const hour = market.advanceDeadlineDayHour();
  if (!hour.active) break;
  console.log(`${hour.hour}:00 - ${hour.events.length} eventos`);
}
```
