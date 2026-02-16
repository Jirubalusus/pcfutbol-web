const fs = require('fs');
const path = require('path');

// ============================================================
// 1. Fix managerEvaluation.js - Convert to i18n keys
// ============================================================
let managerEval = fs.readFileSync('src/game/managerEvaluation.js', 'utf8');

// Replace generateWarningMessage function
const oldWarningFn = `generateWarningMessage(evaluation, currentWeek) {
  if (!evaluation.warning && !evaluation.fired) return null;
  
  if (evaluation.fired) {
    return {
      id: Date.now() + Math.random(),
      type: 'firing',
      title: '🔴 DESTITUIDO',
      content: evaluation.reason,
      date: \`Semana \${currentWeek}\`,
      urgent: true
    };
  }
  
  if (evaluation.warning === 'critical') {
    return {
      id: Date.now() + Math.random(),
      type: 'warning',
      title: '⚠️ Ultimátum de la directiva',
      content: evaluation.reason,
      date: \`Semana \${currentWeek}\`,
      urgent: true
    };
  }
  
  if (evaluation.warning === 'low') {
    return {
      id: Date.now() + Math.random(),
      type: 'warning',
      title: '📋 Comunicado de la directiva',
      content: evaluation.reason,
      date: \`Semana \${currentWeek}\`
    };
  }
  
  return null;
}`;

const newWarningFn = `generateWarningMessage(evaluation, currentWeek) {
  if (!evaluation.warning && !evaluation.fired) return null;
  
  if (evaluation.fired) {
    return {
      id: Date.now() + Math.random(),
      type: 'fired',
      titleKey: 'gameMessages.managerFiredTitle',
      contentKey: evaluation.reasonKey || 'gameMessages.managerFiredDefault',
      contentParams: evaluation.reasonParams || {},
      dateKey: 'gameMessages.weekDate', dateParams: { week: currentWeek },
      urgent: true
    };
  }
  
  if (evaluation.warning === 'critical') {
    return {
      id: Date.now() + Math.random(),
      type: 'board',
      titleKey: 'gameMessages.boardUltimatum',
      contentKey: evaluation.reasonKey || 'gameMessages.boardCriticalDefault',
      contentParams: evaluation.reasonParams || {},
      dateKey: 'gameMessages.weekDate', dateParams: { week: currentWeek },
      urgent: true
    };
  }
  
  if (evaluation.warning === 'low') {
    return {
      id: Date.now() + Math.random(),
      type: 'board',
      titleKey: 'gameMessages.boardStatement',
      contentKey: evaluation.reasonKey || 'gameMessages.boardLowDefault',
      contentParams: evaluation.reasonParams || {},
      dateKey: 'gameMessages.weekDate', dateParams: { week: currentWeek }
    };
  }
  
  return null;
}`;

managerEval = managerEval.replace(oldWarningFn, newWarningFn);

// Replace hardcoded Spanish reasons with i18n keys
// Replace reason strings with reasonKey + reasonParams
managerEval = managerEval.replace(
  /reasons\.push\(`Posición \$\{currentPosition\}º \(se esperaba top \$\{expectedPosition\}\)`\)/,
  "reasons.push({ key: 'gameMessages.reasonPosition', params: { position: currentPosition, expected: expectedPosition } })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`Rendimiento por debajo de expectativas`\)/,
  "reasons.push({ key: 'gameMessages.reasonUnderperformance' })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`\$\{consecutiveLosses\} derrotas consecutivas`\)/,
  "reasons.push({ key: 'gameMessages.reasonConsecutiveLosses', params: { count: consecutiveLosses } })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`\$\{consecutiveLosses\} derrotas seguidas`\)/,
  "reasons.push({ key: 'gameMessages.reasonLossStreak', params: { count: consecutiveLosses } })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`Mala racha de resultados`\)/,
  "reasons.push({ key: 'gameMessages.reasonBadForm' })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`Plantilla insuficiente \(\$\{totalPlayers\} jugadores\)`\)/,
  "reasons.push({ key: 'gameMessages.reasonSmallSquad', params: { count: totalPlayers } })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`Plantilla muy corta \(\$\{totalPlayers\} jugadores\)`\)/,
  "reasons.push({ key: 'gameMessages.reasonVerySmallSquad', params: { count: totalPlayers } })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`Menos de 11 jugadores disponibles`\)/,
  "reasons.push({ key: 'gameMessages.reasonNotEnoughPlayers' })"
);
managerEval = managerEval.replace(
  /reasons\.push\(`En zona de descenso`\)/,
  "reasons.push({ key: 'gameMessages.reasonRelegation' })"
);

// Fix the bankruptcy reason
managerEval = managerEval.replace(
  /reason: 'La directiva te ha destituido por llevar al club a la bancarrota\.'/,
  "reasonKey: 'gameMessages.firedBankruptcy'"
);

// Fix the confidence-based reasons  
managerEval = managerEval.replace(
  /reason = reasons\.length > 0\s*\n\s*\? `La directiva ha perdido la confianza\. \$\{reasons\[0\]\}\.`\s*\n\s*: 'La directiva ha perdido la confianza en el proyecto\.';/,
  "reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardLostConfidence';\n      reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};"
);
managerEval = managerEval.replace(
  /reason = `⚠️ La directiva está muy descontenta\. \$\{reasons\[0\] \|\| 'Mejora los resultados urgentemente\.'\}`;/,
  "reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardVeryUnhappy';\n      reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};"
);
managerEval = managerEval.replace(
  /reason = `La directiva empieza a impacientarse\. \$\{reasons\[0\] \|\| 'Se esperan mejores resultados\.'\}`;/,
  "reasonKey = reasons.length > 0 && reasons[0].key ? reasons[0].key : 'gameMessages.boardImpatient';\n      reasonParams = reasons.length > 0 && reasons[0].params ? reasons[0].params : {};"
);

// Fix the return object - add reasonKey/reasonParams
managerEval = managerEval.replace(
  /reason,\s*\n\s*details: reasons/,
  "reasonKey,\n    reasonParams,\n    details: reasons"
);

// Also need to declare reasonKey and reasonParams
managerEval = managerEval.replace(
  /let reason = null;/,
  "let reasonKey = null;\n  let reasonParams = {};"
);

// Remove old reason variable if it's now unused
// Actually let's keep it for backwards compat but remove the old assignments

fs.writeFileSync('src/game/managerEvaluation.js', managerEval, 'utf8');
console.log('✅ Fixed managerEvaluation.js');


// ============================================================
// 2. Fix europeanSeason.js - Convert messages to i18n
// ============================================================
let euSeason = fs.readFileSync('src/game/europeanSeason.js', 'utf8');

euSeason = euSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `¡Tu equipo se clasifica directamente para los octavos de final!`/g,
  "titleKey: 'gameMessages.europeanQualifiedDirect', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanQualifiedDirectContent'"
);
euSeason = euSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `Tu equipo jugará la ronda de playoffs para acceder a octavos\.`/g,
  "titleKey: 'gameMessages.europeanPlayoffs', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanPlayoffsContent'"
);
euSeason = euSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `Tu equipo ha sido eliminado en la fase de liga\.`/g,
  "titleKey: 'gameMessages.europeanEliminated', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanEliminatedContent'"
);
euSeason = euSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\} — ¡Final!`,\s*\n\s*content: `\$\{finalResult\.winner\?\.teamName \|\| 'Desconocido'\} gana la \$\{state\.config\.name\} \(\$\{finalResult\.aggregate\}\)`/g,
  "titleKey: 'gameMessages.europeanFinal', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanFinalResult', contentParams: { winner: finalResult.winner?.teamName || '???', comp: state.config.name, aggregate: finalResult.aggregate }"
);

fs.writeFileSync('src/game/europeanSeason.js', euSeason, 'utf8');
console.log('✅ Fixed europeanSeason.js');


// ============================================================
// 3. Fix southAmericanSeason.js - Same as European
// ============================================================
let saSeason = fs.readFileSync('src/game/southAmericanSeason.js', 'utf8');

saSeason = saSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `¡Tu equipo se clasifica directamente para los octavos de final!`/g,
  "titleKey: 'gameMessages.europeanQualifiedDirect', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanQualifiedDirectContent'"
);
saSeason = saSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `Tu equipo jugará la ronda de playoffs para acceder a octavos\.`/g,
  "titleKey: 'gameMessages.europeanPlayoffs', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanPlayoffsContent'"
);
saSeason = saSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\}`,\s*\n\s*content: `Tu equipo ha sido eliminado en la fase de liga\.`/g,
  "titleKey: 'gameMessages.europeanEliminated', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanEliminatedContent'"
);
saSeason = saSeason.replace(
  /title: `\$\{state\.config\.icon\} \$\{state\.config\.shortName\} — ¡Final!`,\s*\n\s*content: `\$\{finalResult\.winner\?\.teamName \|\| 'Desconocido'\} gana la \$\{state\.config\.name\} \(\$\{finalResult\.aggregate\}\)`/g,
  "titleKey: 'gameMessages.europeanFinal', titleParams: { icon: state.config.icon, comp: state.config.shortName },\n        contentKey: 'gameMessages.europeanFinalResult', contentParams: { winner: finalResult.winner?.teamName || '???', comp: state.config.name, aggregate: finalResult.aggregate }"
);

fs.writeFileSync('src/game/southAmericanSeason.js', saSeason, 'utf8');
console.log('✅ Fixed southAmericanSeason.js');


// ============================================================
// 4. Fix loanSystem.js - expireLoans messages
// ============================================================
let loanSystem = fs.readFileSync('src/game/loanSystem.js', 'utf8');

loanSystem = loanSystem.replace(
  /title: '🔄 Cesión finalizada',\s*\n\s*content: `\$\{loan\.playerData\?\.name \|\| loan\.playerId\} vuelve a \$\{loan\.fromTeamName\} tras su cesión en \$\{loan\.toTeamName\}`/,
  "titleKey: 'gameMessages.loanExpired',\n        contentKey: 'gameMessages.loanExpiredContent', contentParams: { player: loan.playerData?.name || loan.playerId, from: loan.fromTeamName, to: loan.toTeamName }"
);

fs.writeFileSync('src/game/loanSystem.js', loanSystem, 'utf8');
console.log('✅ Fixed loanSystem.js');


// ============================================================
// 5. Fix GameContext.jsx - Multiple fixes
// ============================================================
let gc = fs.readFileSync('src/context/GameContext.jsx', 'utf8');

// 5a. Fix hardcoded date on ranked transfer (line ~3085)
gc = gc.replace(
  /date: `Semana \$\{state\.currentWeek\}`/g,
  "dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }"
);

// 5b. Fix hardcoded date "Ranked" (line ~3371)
gc = gc.replace(
  /date: `Ranked`/g,
  "dateKey: 'gameMessages.ranked'"
);

// 5c. Fix European message formatters - convert title/content to titleKey/contentKey
// There are 4 places where europeanMessages/saMessages are formatted with title/content
gc = gc.replace(
  /const formattedEuropeanMessages = europeanMessages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: m\.type \|\| 'european',\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.weekDate', dateParams: \{ week: nextWeek \}\s*\n\s*\}\)\);/,
  `const formattedEuropeanMessages = europeanMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type || 'european',
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
      }));`
);

gc = gc.replace(
  /const formattedSAMessages = saMessages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: m\.type \|\| 'southamerican',\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.weekDate', dateParams: \{ week: nextWeek \}\s*\n\s*\}\)\);/,
  `const formattedSAMessages = saMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type || 'southamerican',
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.weekDate', dateParams: { week: nextWeek }
      }));`
);

// Fix the COMPLETE_EUROPEAN_MATCH and COMPLETE_SA_MATCH formatters (3 more instances)
// Pattern: fmtAdvanceMessages = advanceMessages.map(m => ({...type: 'european', title: m.title, content: m.content...
gc = gc.replace(
  /const fmtAdvanceMessages = advanceMessages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: 'european',\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.weekDate', dateParams: \{ week: state\.currentWeek \}\s*\n\s*\}\)\);/g,
  `const fmtAdvanceMessages = advanceMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'european',
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));`
);

gc = gc.replace(
  /const fmtAdvanceMessages = advanceMessages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: 'southamerican',\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.weekDate', dateParams: \{ week: state\.currentWeek \}\s*\n\s*\}\)\);/g,
  `const fmtAdvanceMessages = advanceMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'southamerican',
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));`
);

// Fix ADVANCE_EUROPEAN_PHASE fmtMessages
gc = gc.replace(
  /const fmtMessages = messages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: 'european',\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.weekDate', dateParams: \{ week: state\.currentWeek \}\s*\n\s*\}\)\);/g,
  `const fmtMessages = messages.map(m => ({
        id: Date.now() + Math.random(),
        type: 'european',
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.weekDate', dateParams: { week: state.currentWeek }
      }));`
);

// 5d. Fix EXPIRE_LOANS formatter - uses title/content from loanSystem
gc = gc.replace(
  /const formattedMessages = loanMessages\.map\(m => \(\{\s*\n\s*id: Date\.now\(\) \+ Math\.random\(\),\s*\n\s*type: m\.type,\s*\n\s*title: m\.title,\s*\n\s*content: m\.content,\s*\n\s*dateKey: 'gameMessages\.endOfSeason', dateParams: \{ season: state\.currentSeason \}\s*\n\s*\}\)\);/,
  `const formattedMessages = loanMessages.map(m => ({
        id: Date.now() + Math.random(),
        type: m.type,
        ...(m.titleKey ? { titleKey: m.titleKey, titleParams: m.titleParams } : { title: m.title }),
        ...(m.contentKey ? { contentKey: m.contentKey, contentParams: m.contentParams } : { content: m.content }),
        dateKey: 'gameMessages.endOfSeason', dateParams: { season: state.currentSeason }
      }));`
);

// 5e. Fix season start loan messages formatter (line ~1089)
gc = gc.replace(
  /\}}\), \.\.\.state\.messages \|\| \[\]\)\.slice\(0, 20\)\]\.slice\(0, 50\),/,
  '})), ...(state.messages || []).slice(0, 20)].slice(0, 50),'
);

// 5f. Fix hardcoded clubReason/playerReason - convert to i18n keys
gc = gc.replace(
  /clubReason = 'Titular indiscutible, no está en venta';/,
  "clubReason = 'gameMessages.clubReasonStarter';"
);
gc = gc.replace(
  /clubReason = 'Oferta irrechazable';/,
  "clubReason = 'gameMessages.clubReasonIrresistible';"
);
gc = gc.replace(
  /clubReason = 'Oferta aceptada';/,
  "clubReason = 'gameMessages.clubReasonAccepted';"
);
gc = gc.replace(
  /clubReason = `Piden \$\{formatTransferPrice\(clubCounterAmount\)\}`;/g,
  "clubReason = 'gameMessages.clubReasonCounter';"
);
gc = gc.replace(
  /clubReason = 'Necesitan liquidez';/,
  "clubReason = 'gameMessages.clubReasonNeedMoney';"
);
gc = gc.replace(
  /clubReason = 'Oferta insuficiente';/,
  "clubReason = 'gameMessages.clubReasonInsufficient';"
);
gc = gc.replace(
  /clubReason = 'Oferta irrisoria';/,
  "clubReason = 'gameMessages.clubReasonLaughable';"
);

gc = gc.replace(
  /playerReason = 'Encantado con la propuesta';/,
  "playerReason = 'gameMessages.playerReasonHappy';"
);
gc = gc.replace(
  /playerReason = 'Acepta el proyecto deportivo';/,
  "playerReason = 'gameMessages.playerReasonProject';"
);
gc = gc.replace(
  /playerReason = 'Quiere un salario mayor';/,
  "playerReason = 'gameMessages.playerReasonMoreSalary';"
);
gc = gc.replace(
  /playerReason = 'Le convence el proyecto';/,
  "playerReason = 'gameMessages.playerReasonConvinced';"
);
gc = gc.replace(
  /playerReason = 'Salario insuficiente';/,
  "playerReason = 'gameMessages.playerReasonLowSalary';"
);
gc = gc.replace(
  /playerReason = 'Oferta salarial irrisoria';/,
  "playerReason = 'gameMessages.playerReasonLaughableSalary';"
);

// The clubReason/playerReason are now i18n KEYS, and they're passed as contentParams
// The offerRejectedContent template uses {{clubReason}} and {{playerReason}}
// These will need to be resolved at render time via the nested Key resolution in Messages.jsx
// Actually, they're passed directly. Let's change them to use Key suffix for auto-translation:
gc = gc.replace(
  /contentParams: bothAccepted\s*\n\s*\? \{ player: offer\.playerName, cost: formatTransferPrice\(offer\.amount\) \}\s*\n\s*: \{ clubReason, playerReason \},/,
  `contentParams: bothAccepted
            ? { player: offer.playerName, cost: formatTransferPrice(offer.amount) }
            : { clubReasonKey: clubReason, playerReasonKey: playerReason },`
);

fs.writeFileSync('src/context/GameContext.jsx', gc, 'utf8');
console.log('✅ Fixed GameContext.jsx');


// ============================================================
// 6. Fix Office.jsx - overview renders msg.title directly
// ============================================================
let office = fs.readFileSync('src/components/Office/Office.jsx', 'utf8');

office = office.replace(
  /<span className="title">\{msg\.title\}<\/span>/,
  '<span className="title">{msg.titleKey ? t(msg.titleKey, msg.titleParams) : msg.title}</span>'
);

fs.writeFileSync('src/components/Office/Office.jsx', office, 'utf8');
console.log('✅ Fixed Office.jsx');


// ============================================================
// 7. Add ALL missing i18n keys to ALL 6 locales
// ============================================================
const newKeys = {
  gameMessages: {
    // Manager evaluation
    managerFiredTitle: {
      es: '🔴 DESTITUIDO', en: '🔴 FIRED', fr: '🔴 LICENCIÉ', de: '🔴 ENTLASSEN', it: '🔴 ESONERATO', pt: '🔴 DEMITIDO'
    },
    managerFiredDefault: {
      es: 'La directiva ha decidido prescindir de tus servicios.', en: 'The board has decided to relieve you of your duties.',
      fr: 'Le conseil a décidé de se séparer de vous.', de: 'Der Vorstand hat beschlossen, sich von Ihnen zu trennen.',
      it: 'Il consiglio ha deciso di sollevarti dall\'incarico.', pt: 'A diretoria decidiu dispensar seus serviços.'
    },
    boardUltimatum: {
      es: '⚠️ Ultimátum de la directiva', en: '⚠️ Board ultimatum', fr: '⚠️ Ultimatum du conseil', de: '⚠️ Ultimatum des Vorstands', it: '⚠️ Ultimatum del consiglio', pt: '⚠️ Ultimato da diretoria'
    },
    boardStatement: {
      es: '📋 Comunicado de la directiva', en: '📋 Board statement', fr: '📋 Communiqué du conseil', de: '📋 Vorstandsmitteilung', it: '📋 Comunicato del consiglio', pt: '📋 Comunicado da diretoria'
    },
    boardCriticalDefault: {
      es: 'Mejora los resultados urgentemente.', en: 'Improve results urgently.', fr: 'Améliorez les résultats de toute urgence.', de: 'Verbessern Sie die Ergebnisse dringend.', it: 'Migliora i risultati urgentemente.', pt: 'Melhore os resultados urgentemente.'
    },
    boardLowDefault: {
      es: 'Se esperan mejores resultados.', en: 'Better results are expected.', fr: 'De meilleurs résultats sont attendus.', de: 'Bessere Ergebnisse werden erwartet.', it: 'Ci si aspettano risultati migliori.', pt: 'Melhores resultados são esperados.'
    },
    firedBankruptcy: {
      es: 'La directiva te ha destituido por llevar al club a la bancarrota.', en: 'The board has fired you for bankrupting the club.',
      fr: 'Le conseil vous a licencié pour avoir mené le club à la faillite.', de: 'Der Vorstand hat Sie entlassen, weil Sie den Verein in den Bankrott geführt haben.',
      it: 'Il consiglio ti ha esonerato per aver portato il club alla bancarotta.', pt: 'A diretoria te demitiu por levar o clube à falência.'
    },
    reasonPosition: {
      es: 'Posición {{position}}º (se esperaba top {{expected}})', en: 'Position {{position}} (expected top {{expected}})',
      fr: 'Position {{position}} (attendu top {{expected}})', de: 'Position {{position}} (erwartet Top {{expected}})',
      it: 'Posizione {{position}} (atteso top {{expected}})', pt: 'Posição {{position}} (esperado top {{expected}})'
    },
    reasonUnderperformance: {
      es: 'Rendimiento por debajo de expectativas', en: 'Performance below expectations',
      fr: 'Performance en dessous des attentes', de: 'Leistung unter den Erwartungen',
      it: 'Rendimento al di sotto delle aspettative', pt: 'Desempenho abaixo das expectativas'
    },
    reasonConsecutiveLosses: {
      es: '{{count}} derrotas consecutivas', en: '{{count}} consecutive losses',
      fr: '{{count}} défaites consécutives', de: '{{count}} aufeinanderfolgende Niederlagen',
      it: '{{count}} sconfitte consecutive', pt: '{{count}} derrotas consecutivas'
    },
    reasonLossStreak: {
      es: '{{count}} derrotas seguidas', en: '{{count}} straight losses',
      fr: '{{count}} défaites d\'affilée', de: '{{count}} Niederlagen in Folge',
      it: '{{count}} sconfitte di fila', pt: '{{count}} derrotas seguidas'
    },
    reasonBadForm: {
      es: 'Mala racha de resultados', en: 'Poor run of results',
      fr: 'Mauvaise série de résultats', de: 'Schlechte Ergebnisserie',
      it: 'Serie negativa di risultati', pt: 'Má sequência de resultados'
    },
    reasonSmallSquad: {
      es: 'Plantilla insuficiente ({{count}} jugadores)', en: 'Insufficient squad ({{count}} players)',
      fr: 'Effectif insuffisant ({{count}} joueurs)', de: 'Unzureichender Kader ({{count}} Spieler)',
      it: 'Rosa insufficiente ({{count}} giocatori)', pt: 'Elenco insuficiente ({{count}} jogadores)'
    },
    reasonVerySmallSquad: {
      es: 'Plantilla muy corta ({{count}} jugadores)', en: 'Very small squad ({{count}} players)',
      fr: 'Effectif très réduit ({{count}} joueurs)', de: 'Sehr kleiner Kader ({{count}} Spieler)',
      it: 'Rosa molto ridotta ({{count}} giocatori)', pt: 'Elenco muito pequeno ({{count}} jogadores)'
    },
    reasonNotEnoughPlayers: {
      es: 'Menos de 11 jugadores disponibles', en: 'Less than 11 available players',
      fr: 'Moins de 11 joueurs disponibles', de: 'Weniger als 11 verfügbare Spieler',
      it: 'Meno di 11 giocatori disponibili', pt: 'Menos de 11 jogadores disponíveis'
    },
    reasonRelegation: {
      es: 'En zona de descenso', en: 'In relegation zone',
      fr: 'En zone de relégation', de: 'In der Abstiegszone',
      it: 'In zona retrocessione', pt: 'Na zona de rebaixamento'
    },
    boardLostConfidence: {
      es: 'La directiva ha perdido la confianza en el proyecto.', en: 'The board has lost confidence in the project.',
      fr: 'Le conseil a perdu confiance dans le projet.', de: 'Der Vorstand hat das Vertrauen in das Projekt verloren.',
      it: 'Il consiglio ha perso fiducia nel progetto.', pt: 'A diretoria perdeu a confiança no projeto.'
    },
    boardVeryUnhappy: {
      es: 'La directiva está muy descontenta. Mejora los resultados urgentemente.', en: 'The board is very unhappy. Improve results urgently.',
      fr: 'Le conseil est très mécontent. Améliorez les résultats de toute urgence.', de: 'Der Vorstand ist sehr unzufrieden. Verbessern Sie die Ergebnisse dringend.',
      it: 'Il consiglio è molto scontento. Migliora i risultati urgentemente.', pt: 'A diretoria está muito insatisfeita. Melhore os resultados urgentemente.'
    },
    boardImpatient: {
      es: 'La directiva empieza a impacientarse. Se esperan mejores resultados.', en: 'The board is growing impatient. Better results are expected.',
      fr: 'Le conseil commence à s\'impatienter. De meilleurs résultats sont attendus.', de: 'Der Vorstand wird ungeduldig. Bessere Ergebnisse werden erwartet.',
      it: 'Il consiglio sta perdendo la pazienza. Ci si aspettano risultati migliori.', pt: 'A diretoria está ficando impaciente. Melhores resultados são esperados.'
    },
    // European/SA competition messages
    europeanQualifiedDirect: {
      es: '{{icon}} {{comp}}', en: '{{icon}} {{comp}}', fr: '{{icon}} {{comp}}', de: '{{icon}} {{comp}}', it: '{{icon}} {{comp}}', pt: '{{icon}} {{comp}}'
    },
    europeanQualifiedDirectContent: {
      es: '¡Tu equipo se clasifica directamente para los octavos de final!', en: 'Your team qualifies directly for the Round of 16!',
      fr: 'Votre équipe se qualifie directement pour les huitièmes de finale !', de: 'Ihr Team qualifiziert sich direkt für das Achtelfinale!',
      it: 'La tua squadra si qualifica direttamente per gli ottavi di finale!', pt: 'Sua equipe se classifica diretamente para as oitavas de final!'
    },
    europeanPlayoffs: {
      es: '{{icon}} {{comp}}', en: '{{icon}} {{comp}}', fr: '{{icon}} {{comp}}', de: '{{icon}} {{comp}}', it: '{{icon}} {{comp}}', pt: '{{icon}} {{comp}}'
    },
    europeanPlayoffsContent: {
      es: 'Tu equipo jugará la ronda de playoffs para acceder a octavos.', en: 'Your team will play the playoff round to reach the Round of 16.',
      fr: 'Votre équipe jouera les barrages pour accéder aux huitièmes.', de: 'Ihr Team spielt die Playoff-Runde um das Achtelfinale.',
      it: 'La tua squadra giocherà i playoff per accedere agli ottavi.', pt: 'Sua equipe jogará a rodada de playoffs para chegar às oitavas.'
    },
    europeanEliminated: {
      es: '{{icon}} {{comp}}', en: '{{icon}} {{comp}}', fr: '{{icon}} {{comp}}', de: '{{icon}} {{comp}}', it: '{{icon}} {{comp}}', pt: '{{icon}} {{comp}}'
    },
    europeanEliminatedContent: {
      es: 'Tu equipo ha sido eliminado en la fase de liga.', en: 'Your team has been eliminated in the league phase.',
      fr: 'Votre équipe a été éliminée en phase de ligue.', de: 'Ihr Team wurde in der Ligaphase ausgeschieden.',
      it: 'La tua squadra è stata eliminata nella fase a gironi.', pt: 'Sua equipe foi eliminada na fase de liga.'
    },
    europeanFinal: {
      es: '{{icon}} {{comp}} — ¡Final!', en: '{{icon}} {{comp}} — Final!', fr: '{{icon}} {{comp}} — Finale !', de: '{{icon}} {{comp}} — Finale!', it: '{{icon}} {{comp}} — Finale!', pt: '{{icon}} {{comp}} — Final!'
    },
    europeanFinalResult: {
      es: '{{winner}} gana la {{comp}} ({{aggregate}})', en: '{{winner}} wins the {{comp}} ({{aggregate}})',
      fr: '{{winner}} remporte la {{comp}} ({{aggregate}})', de: '{{winner}} gewinnt die {{comp}} ({{aggregate}})',
      it: '{{winner}} vince la {{comp}} ({{aggregate}})', pt: '{{winner}} vence a {{comp}} ({{aggregate}})'
    },
    // Club/Player response reasons (transfer negotiations)
    clubReasonStarter: {
      es: 'Titular indiscutible, no está en venta', en: 'Key starter, not for sale',
      fr: 'Titulaire indiscutable, pas à vendre', de: 'Stammspieler, nicht verkäuflich',
      it: 'Titolare indiscusso, non in vendita', pt: 'Titular indiscutível, não está à venda'
    },
    clubReasonIrresistible: {
      es: 'Oferta irrechazable', en: 'Irresistible offer',
      fr: 'Offre irrésistible', de: 'Unwiderstehliches Angebot',
      it: 'Offerta irrinunciabile', pt: 'Oferta irrecusável'
    },
    clubReasonAccepted: {
      es: 'Oferta aceptada', en: 'Offer accepted',
      fr: 'Offre acceptée', de: 'Angebot angenommen',
      it: 'Offerta accettata', pt: 'Oferta aceita'
    },
    clubReasonCounter: {
      es: 'Contraoferta pendiente', en: 'Counter offer pending',
      fr: 'Contre-offre en attente', de: 'Gegenangebot ausstehend',
      it: 'Controfferta in sospeso', pt: 'Contraproposta pendente'
    },
    clubReasonNeedMoney: {
      es: 'Necesitan liquidez', en: 'They need liquidity',
      fr: 'Besoin de liquidités', de: 'Brauchen Liquidität',
      it: 'Hanno bisogno di liquidità', pt: 'Precisam de liquidez'
    },
    clubReasonInsufficient: {
      es: 'Oferta insuficiente', en: 'Insufficient offer',
      fr: 'Offre insuffisante', de: 'Unzureichendes Angebot',
      it: 'Offerta insufficiente', pt: 'Oferta insuficiente'
    },
    clubReasonLaughable: {
      es: 'Oferta irrisoria', en: 'Laughable offer',
      fr: 'Offre dérisoire', de: 'Lächerliches Angebot',
      it: 'Offerta irrisoria', pt: 'Oferta irrisória'
    },
    playerReasonHappy: {
      es: 'Encantado con la propuesta', en: 'Delighted with the proposal',
      fr: 'Ravi de la proposition', de: 'Begeistert vom Angebot',
      it: 'Entusiasta della proposta', pt: 'Encantado com a proposta'
    },
    playerReasonProject: {
      es: 'Acepta el proyecto deportivo', en: 'Accepts the sporting project',
      fr: 'Accepte le projet sportif', de: 'Akzeptiert das sportliche Projekt',
      it: 'Accetta il progetto sportivo', pt: 'Aceita o projeto esportivo'
    },
    playerReasonMoreSalary: {
      es: 'Quiere un salario mayor', en: 'Wants a higher salary',
      fr: 'Veut un salaire plus élevé', de: 'Will ein höheres Gehalt',
      it: 'Vuole uno stipendio più alto', pt: 'Quer um salário mais alto'
    },
    playerReasonConvinced: {
      es: 'Le convence el proyecto', en: 'Convinced by the project',
      fr: 'Convaincu par le projet', de: 'Überzeugt vom Projekt',
      it: 'Convinto dal progetto', pt: 'Convencido pelo projeto'
    },
    playerReasonLowSalary: {
      es: 'Salario insuficiente', en: 'Insufficient salary',
      fr: 'Salaire insuffisant', de: 'Unzureichendes Gehalt',
      it: 'Stipendio insufficiente', pt: 'Salário insuficiente'
    },
    playerReasonLaughableSalary: {
      es: 'Oferta salarial irrisoria', en: 'Laughable salary offer',
      fr: 'Offre salariale dérisoire', de: 'Lächerliches Gehaltsangebot',
      it: 'Offerta salariale irrisoria', pt: 'Oferta salarial irrisória'
    },
    ranked: {
      es: 'Ranked', en: 'Ranked', fr: 'Classé', de: 'Rangliste', it: 'Classificato', pt: 'Ranqueado'
    }
  },
  ranked: {
    offerReceived: {
      es: '📩 Oferta recibida de {{team}} por {{player}}', en: '📩 Offer received from {{team}} for {{player}}',
      fr: '📩 Offre reçue de {{team}} pour {{player}}', de: '📩 Angebot von {{team}} für {{player}} erhalten',
      it: '📩 Offerta ricevuta da {{team}} per {{player}}', pt: '📩 Oferta recebida de {{team}} por {{player}}'
    },
    offerAmount: {
      es: 'Oferta: {{price}}', en: 'Offer: {{price}}',
      fr: 'Offre : {{price}}', de: 'Angebot: {{price}}',
      it: 'Offerta: {{price}}', pt: 'Oferta: {{price}}'
    },
    transferAccepted: {
      es: '✅ Traspaso aceptado: {{player}}', en: '✅ Transfer accepted: {{player}}',
      fr: '✅ Transfert accepté : {{player}}', de: '✅ Transfer akzeptiert: {{player}}',
      it: '✅ Trasferimento accettato: {{player}}', pt: '✅ Transferência aceita: {{player}}'
    },
    transferRejected: {
      es: '❌ Traspaso rechazado: {{player}}', en: '❌ Transfer rejected: {{player}}',
      fr: '❌ Transfert refusé : {{player}}', de: '❌ Transfer abgelehnt: {{player}}',
      it: '❌ Trasferimento rifiutato: {{player}}', pt: '❌ Transferência rejeitada: {{player}}'
    },
    transferCost: {
      es: 'Coste: {{price}}', en: 'Cost: {{price}}',
      fr: 'Coût : {{price}}', de: 'Kosten: {{price}}',
      it: 'Costo: {{price}}', pt: 'Custo: {{price}}'
    },
    transferClubReason: {
      es: '🏢 Club: {{reason}} · 👤 Jugador: {{playerReason}}', en: '🏢 Club: {{reason}} · 👤 Player: {{playerReason}}',
      fr: '🏢 Club : {{reason}} · 👤 Joueur : {{playerReason}}', de: '🏢 Verein: {{reason}} · 👤 Spieler: {{playerReason}}',
      it: '🏢 Club: {{reason}} · 👤 Giocatore: {{playerReason}}', pt: '🏢 Clube: {{reason}} · 👤 Jogador: {{playerReason}}'
    }
  },
  notifications: {
    board: {
      es: 'Directiva', en: 'Board', fr: 'Direction', de: 'Vorstand', it: 'Dirigenza', pt: 'Diretoria'
    },
    fired: {
      es: 'Destituido', en: 'Fired', fr: 'Licencié', de: 'Entlassen', it: 'Esonerato', pt: 'Demitido'
    },
    bankruptcy: {
      es: 'Crisis', en: 'Crisis', fr: 'Crise', de: 'Krise', it: 'Crisi', pt: 'Crise'
    },
    yellow: {
      es: 'Tarjeta', en: 'Card', fr: 'Carton', de: 'Karte', it: 'Cartellino', pt: 'Cartão'
    },
    red: {
      es: 'Expulsión', en: 'Expulsion', fr: 'Expulsion', de: 'Platzverweis', it: 'Espulsione', pt: 'Expulsão'
    },
    transferOffer: {
      es: 'Oferta', en: 'Offer', fr: 'Offre', de: 'Angebot', it: 'Offerta', pt: 'Oferta'
    },
    loan: {
      es: 'Cesión', en: 'Loan', fr: 'Prêt', de: 'Leihe', it: 'Prestito', pt: 'Empréstimo'
    },
    cup: {
      es: 'Copa', en: 'Cup', fr: 'Coupe', de: 'Pokal', it: 'Coppa', pt: 'Taça'
    },
    european: {
      es: 'Europa', en: 'Europe', fr: 'Europe', de: 'Europa', it: 'Europa', pt: 'Europa'
    },
    southamerican: {
      es: 'Continental', en: 'Continental', fr: 'Continental', de: 'Kontinental', it: 'Continentale', pt: 'Continental'
    },
    retirement: {
      es: 'Retiro', en: 'Retirement', fr: 'Retraite', de: 'Rücktritt', it: 'Ritiro', pt: 'Aposentadoria'
    },
    offer: {
      es: 'Oferta', en: 'Offer', fr: 'Offre', de: 'Angebot', it: 'Offerta', pt: 'Oferta'
    },
    training: {
      es: 'Entrenamiento', en: 'Training', fr: 'Entraînement', de: 'Training', it: 'Allenamento', pt: 'Treino'
    },
    youth: {
      es: 'Cantera', en: 'Youth', fr: 'Formation', de: 'Jugend', it: 'Giovanili', pt: 'Base'
    },
    medical: {
      es: 'Médico', en: 'Medical', fr: 'Médical', de: 'Medizin', it: 'Medico', pt: 'Médico'
    },
    facility: {
      es: 'Instalación', en: 'Facility', fr: 'Installation', de: 'Einrichtung', it: 'Struttura', pt: 'Instalação'
    },
    news: {
      es: 'Noticias', en: 'News', fr: 'Actualités', de: 'Nachrichten', it: 'Notizie', pt: 'Notícias'
    },
    default: {
      es: 'Mensaje', en: 'Message', fr: 'Message', de: 'Nachricht', it: 'Messaggio', pt: 'Mensagem'
    },
    moreNotifications: {
      es: '+{{count}} notificaciones más', en: '+{{count}} more notifications',
      fr: '+{{count}} notifications supplémentaires', de: '+{{count}} weitere Benachrichtigungen',
      it: '+{{count}} altre notifiche', pt: '+{{count}} notificações a mais'
    },
    checkInbox: {
      es: 'Revisa tu bandeja de entrada', en: 'Check your inbox',
      fr: 'Vérifiez votre boîte de réception', de: 'Überprüfen Sie Ihren Posteingang',
      it: 'Controlla la tua posta', pt: 'Verifique sua caixa de entrada'
    }
  }
};

// Apply to each locale
const locales = ['es', 'en', 'fr', 'de', 'it', 'pt'];
for (const loc of locales) {
  const filePath = `src/locales/${loc}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add gameMessages keys
  if (!data.gameMessages) data.gameMessages = {};
  for (const [key, translations] of Object.entries(newKeys.gameMessages)) {
    if (!data.gameMessages[key]) {
      data.gameMessages[key] = translations[loc];
    }
  }
  
  // Add ranked keys
  if (!data.ranked) data.ranked = {};
  for (const [key, translations] of Object.entries(newKeys.ranked)) {
    if (!data.ranked[key]) {
      data.ranked[key] = translations[loc];
    }
  }
  
  // Add notifications keys
  if (!data.notifications) data.notifications = {};
  for (const [key, translations] of Object.entries(newKeys.notifications)) {
    if (!data.notifications[key]) {
      data.notifications[key] = translations[loc];
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated ${loc}.json`);
}

// Cleanup
try { fs.unlinkSync('find_hardcoded.cjs'); } catch(e) {}
try { fs.unlinkSync('audit_messages.cjs'); } catch(e) {}

console.log('\n✅ All fixes applied!');
