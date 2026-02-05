/**
 * Automatically convert hardcoded Spanish messages in GameContext.jsx
 * to use i18n keys (titleKey, contentKey, dateKey pattern)
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'context', 'GameContext.jsx');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replace(from, to, label) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    const count = content.split(to).length - 1;
    console.log(`  ✅ ${label} (found)`);
    changes++;
  } else {
    console.log(`  ⚠️  ${label} — NOT FOUND`);
  }
}

// ============================================================
// DATES - Replace all hardcoded date patterns
// ============================================================
console.log('\n=== DATES ===');

// Pattern: date: `Semana ${nextWeek}`
replace(
  "date: `Semana ${nextWeek}`",
  "dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }",
  'date: Semana nextWeek'
);

// Pattern: date: `Semana ${state.currentWeek}`
replace(
  "date: `Semana ${state.currentWeek}`",
  "dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }",
  'date: Semana state.currentWeek'
);

// Pattern: date: isPreseason ? `Pretemporada` : `Semana ${nextWeek}`
replace(
  "date: isPreseason ? `Pretemporada` : `Semana ${nextWeek}`",
  "dateKey: isPreseason ? 'gameMessages.preseason' : 'gameMessages.weekDate', dateParams: isPreseason ? {} : { week: nextWeek }",
  'date: ternary pretemporada/semana'
);

// Pattern: date: `Pretemporada`
replace(
  "date: `Pretemporada`",
  "dateKey: 'gameMessages.preseason'",
  'date: Pretemporada'
);

// Pattern: date: `Fin Temporada ${state.currentSeason}`
replace(
  "date: `Fin Temporada ${state.currentSeason}`",
  "dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }",
  'date: Fin Temporada'
);

// ============================================================
// TITLES - Replace hardcoded Spanish titles
// ============================================================
console.log('\n=== TITLES ===');

const titleMap = [
  ["title: '📩 Oferta por jugador en venta'", "titleKey: 'gameMessages.offerForListedPlayer'"],
  ["title: '📩 Nueva oferta recibida'", "titleKey: 'gameMessages.newOfferReceived'"],
  ["title: '🌱 Nuevo canterano'", "titleKey: 'gameMessages.newYouthPlayer'"],
  ["title: '🔄 Fichaje confirmado'", "titleKey: 'gameMessages.transferConfirmed'"],
  ["title: '📩 Oferta de cesión recibida'", "titleKey: 'gameMessages.loanOfferReceived'"],
  ["title: '🏆 ¡Campeón de Liga!'", "titleKey: 'gameMessages.leagueChampion'"],
  ["title: '✅ Fichaje completado'", "titleKey: 'gameMessages.transferComplete'"],
  ["title: '📥 Jugador recibido en cesión'", "titleKey: 'gameMessages.playerReceivedOnLoan'"],
  ["title: '✅ Opción de compra ejecutada'", "titleKey: 'gameMessages.purchaseOptionExecuted'"],
  ["title: '📤 Cesión aceptada'", "titleKey: 'gameMessages.loanAccepted'"],
  ["title: `⏰ Oferta expirada`", "titleKey: 'gameMessages.offerExpired'"],
];

titleMap.forEach(([from, to]) => replace(from, to, from));

// ============================================================
// CONTENT - Replace hardcoded Spanish content strings
// ============================================================
console.log('\n=== CONTENT ===');

// Offer content patterns
replace(
  "content: `${buyer.name} ofrece ${formatTransferPrice(offerAmount)} por ${targetPlayer.name}`",
  "contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmount), player: targetPlayer.name }",
  'content: buyer ofrece por targetPlayer'
);

replace(
  "content: `${buyer.name} ofrece ${formatTransferPrice(offerAmt)} por ${targetPlayer.name}`",
  "contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmt), player: targetPlayer.name }",
  'content: buyer ofrece por targetPlayer (offerAmt)'
);

replace(
  "content: `${buyer.name} ofrece ${formatTransferPrice(offerAmt)} por ${listedPlayer.name}`",
  "contentKey: 'gameMessages.offerContent', contentParams: { buyer: buyer.name, amount: formatTransferPrice(offerAmt), player: listedPlayer.name }",
  'content: buyer ofrece por listedPlayer'
);

// Transfer confirmed
replace(
  "content: `${t.player.name} (${t.player.position}, ${t.player.overall}) ficha por ${t.to.name} desde ${t.from.name} por ${formatTransferPrice(t.price)}`",
  "contentKey: 'gameMessages.transferConfirmedContent', contentParams: { player: t.player.name, position: t.player.position, overall: t.player.overall, toTeam: t.to.name, fromTeam: t.from.name, price: formatTransferPrice(t.price) }",
  'content: transfer confirmed'
);

// Youth player
replace(
  "content: `La cantera (${specName}) ha promocionado a ${youthPlayer.name} (${youthPlayer.position}, ${youthPlayer.overall} OVR, ${youthPlayer.age} años)`",
  "contentKey: 'gameMessages.youthPlayerContent', contentParams: { spec: specName, player: youthPlayer.name, position: youthPlayer.position, overall: youthPlayer.overall, age: youthPlayer.age }",
  'content: youth player'
);

// Retired player
replace(
  "content: `${retired.name} (${retired.position}, ${retired.overall} OVR) se retira del fútbol profesional. ¡Gracias por todo!`",
  "contentKey: 'gameMessages.playerRetired', contentParams: { player: retired.name, position: retired.position, overall: retired.overall }",
  'content: retired player'
);

// Offer expired (incoming)
replace(
  "content: `La oferta de ${o.fromTeam} por ${o.player?.name} ha caducado`",
  "contentKey: 'gameMessages.offerExpiredContent', contentParams: { team: o.fromTeam, player: o.player?.name }",
  'content: incoming offer expired'
);

// Player no longer available (with refund)
// There are two similar patterns with offer.playerName
const playerUnavailable1 = "content: `${offer.playerName} ya no está disponible. Se devuelven ${formatTransferPrice(offer.amount)}€`";
const playerUnavailable1Replace = "contentKey: 'gameMessages.playerUnavailableRefund', contentParams: { player: offer.playerName, amount: formatTransferPrice(offer.amount) }";
if (content.includes(playerUnavailable1)) {
  content = content.split(playerUnavailable1).join(playerUnavailable1Replace);
  console.log('  ✅ content: player unavailable refund');
  changes++;
} else {
  // Try alternate pattern
  console.log('  ⚠️  content: player unavailable refund — trying alternate patterns');
}

// Loan offer received
const loanOffer = "content: `${offer.toTeamName} quiere llevarse a ${offer.playerData.name} en cesión. Fee: €${(offer.loanFee || 0).toLocaleString()}, Salario: ${offer.salaryPercentage}%`";
const loanOfferReplace = "contentKey: 'gameMessages.loanOfferContent', contentParams: { team: offer.toTeamName, player: offer.playerData.name, fee: (offer.loanFee || 0).toLocaleString(), salary: offer.salaryPercentage }";
if (content.includes(loanOffer)) {
  content = content.replace(loanOffer, loanOfferReplace);
  console.log('  ✅ content: loan offer');
  changes++;
} else {
  console.log('  ⚠️  content: loan offer — NOT FOUND (check manually)');
}

// Transfer complete (two patterns)
const tc1 = "content: `¡${targetPlayer.name} es nuevo jugador del equipo! Coste: ${formatTransferPrice(offer.amount)}, Salario: ${formatTransferPrice((offer.salaryOffer || 0) * 52)}/año`";
if (content.includes(tc1)) {
  content = content.replace(tc1, "contentKey: 'gameMessages.transferCompleteContent', contentParams: { player: targetPlayer.name, cost: formatTransferPrice(offer.amount), salary: formatTransferPrice((offer.salaryOffer || 0) * 52) }");
  console.log('  ✅ content: transfer complete');
  changes++;
}

const tc2 = "content: `¡${targetPlayer.name} es nuevo jugador del equipo! Contraoferta aceptada: ${formatTransferPrice(offer.counterAmount)}, Salario: ${formatTransferPrice((offer.salaryOffer || 0) * 52)}/año`";
if (content.includes(tc2)) {
  content = content.replace(tc2, "contentKey: 'gameMessages.transferCompleteCounterContent', contentParams: { player: targetPlayer.name, cost: formatTransferPrice(offer.counterAmount), salary: formatTransferPrice((offer.salaryOffer || 0) * 52) }");
  console.log('  ✅ content: transfer complete counter');
  changes++;
}

// Medical treatment
const medical = "content: `${playerName} ha recibido tratamiento. Lesión reducida de ${oldWeeks} a ${newWeeks} semanas.`";
if (content.includes(medical)) {
  content = content.replace(medical, "contentKey: 'gameMessages.medicalTreatment', contentParams: { player: playerName, oldWeeks: oldWeeks, newWeeks: newWeeks }");
  console.log('  ✅ content: medical treatment');
  changes++;
}

// Loan player received
const loanReceived = content.match(/content: `.*\$\{.*\}.*recibido en cesión.*`/);

// Cup champion
const cupChamp = content.match(/content: `¡\$\{state\.team\.name\} ha ganado la \$\{.*?\}!/);

// Also fix the title that uses template literal for 'Cesión'
replace(
  "title: m.title || 'Cesión'",
  "titleKey: m.titleKey || 'gameMessages.loan', title: m.title || 'Loan'",
  'title: Cesión fallback'
);

console.log(`\n=== Total changes: ${changes} ===`);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully.');
