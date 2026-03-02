const PRICE_CONFIG = { referencePrice: 30, baseDemandRate: 0.55 };

function calculatePriceFactor(ticketPrice, rivalFactor = 1.0) {
  const referencePrice = 30;
  let factor;
  if (ticketPrice <= referencePrice) {
    factor = 1 + (1 - ticketPrice/referencePrice) * 0.6;
  } else {
    factor = Math.pow(referencePrice / ticketPrice, 1.8);
  }
  if (rivalFactor > 1.5 && ticketPrice > referencePrice) {
    factor = Math.min(factor + (rivalFactor - 1.5) * 0.3, 0.9);
  }
  return Math.max(0.02, Math.min(1.4, factor));
}

function simMatch(name, { capacity, seasonTickets, ticketPrice, rivalFactor, performanceFactor, isDerby }) {
  const derbyBonus = isDerby ? 1.3 : 1.0;
  const availableSeats = capacity - seasonTickets;
  const priceFactor = calculatePriceFactor(ticketPrice, rivalFactor * derbyBonus);
  
  const baseDemand = availableSeats * PRICE_CONFIG.baseDemandRate;
  const finalDemand = baseDemand * rivalFactor * priceFactor * performanceFactor * derbyBonus;
  const taquilla = Math.min(Math.round(finalDemand), availableSeats);
  const abonados = Math.round(seasonTickets * 0.90);
  const total = abonados + taquilla;
  
  console.log(`\n${name}`);
  console.log(`  Precio: €${ticketPrice} | Factor precio: ${(priceFactor*100).toFixed(0)}%`);
  console.log(`  Abonados: ${abonados.toLocaleString()}`);
  console.log(`  Taquilla: ${taquilla.toLocaleString()}`);
  console.log(`  TOTAL: ${total.toLocaleString()} / ${capacity.toLocaleString()} (${(total/capacity*100).toFixed(0)}%)`);
}

const base = { capacity: 35000, seasonTickets: 20000 };

console.log('='.repeat(50));
console.log('🏟️ COMPARATIVA: DERBY vs PARTIDO NORMAL');
console.log('Estadio: 35.000 plazas | 20.000 abonados');
console.log('='.repeat(50));

// Partido normal vs colista, equipo en mitad de tabla
console.log('\n--- PRECIO €30 (normal) ---');
simMatch('vs Colista (vas 10º)', { ...base, ticketPrice: 30, rivalFactor: 0.7, performanceFactor: 1.0, isDerby: false });
simMatch('vs Equipo medio (vas 10º)', { ...base, ticketPrice: 30, rivalFactor: 1.0, performanceFactor: 1.0, isDerby: false });
simMatch('vs Líder (vas 10º)', { ...base, ticketPrice: 30, rivalFactor: 1.5, performanceFactor: 1.0, isDerby: false });
simMatch('🔥 DERBY (vas 10º)', { ...base, ticketPrice: 30, rivalFactor: 1.5, performanceFactor: 1.0, isDerby: true });

console.log('\n--- PRECIO €50 (caro) ---');
simMatch('vs Colista (vas 10º)', { ...base, ticketPrice: 50, rivalFactor: 0.7, performanceFactor: 1.0, isDerby: false });
simMatch('vs Equipo medio (vas 10º)', { ...base, ticketPrice: 50, rivalFactor: 1.0, performanceFactor: 1.0, isDerby: false });
simMatch('🔥 DERBY (vas 10º)', { ...base, ticketPrice: 50, rivalFactor: 1.5, performanceFactor: 1.0, isDerby: true });

console.log('\n--- VAS PRIMERO vs VAS ÚLTIMO ---');
simMatch('vs Medio (vas 1º) €30', { ...base, ticketPrice: 30, rivalFactor: 1.0, performanceFactor: 1.2, isDerby: false });
simMatch('vs Medio (vas 20º) €30', { ...base, ticketPrice: 30, rivalFactor: 1.0, performanceFactor: 0.65, isDerby: false });
simMatch('vs Medio (vas 1º) €50', { ...base, ticketPrice: 50, rivalFactor: 1.0, performanceFactor: 1.2, isDerby: false });
simMatch('vs Medio (vas 20º) €50', { ...base, ticketPrice: 50, rivalFactor: 1.0, performanceFactor: 0.65, isDerby: false });

console.log('\n');
