import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('SeasonEnd.jsx', 'utf8');

// Add missing icons to existing import
c = c.replace(
  "  Globe\n} from 'lucide-react';",
  "  Globe,\n  ClipboardList,\n  CircleDot,\n  Ticket,\n  Flag,\n  Flame\n} from 'lucide-react';"
);

// Message titles (strings)
c = c.replace("title: '📉 Descensos a Segunda',", "title: 'Descensos a Segunda',");
c = c.replace("title: '📈 Ascensos directos a La Liga',", "title: 'Ascensos directos a La Liga',");
c = c.replace("title: '🏆 Ascenso por Playoff',", "title: 'Ascenso por Playoff',");
c = c.replace("title: isPromotion ? '🎉 ¡ASCENSO!' : '😔 Descenso',", "title: isPromotion ? '¡ASCENSO!' : 'Descenso',");
c = c.replace("title: `🏆 ¡Competición Europea!`,", "title: `¡Competición Europea!`,");

// Playoff bracket header
c = c.replace("<h3>📋 Cuadro de Playoff</h3>", "<h3><ClipboardList size={14} /> Cuadro de Playoff</h3>");
c = c.replace("<span className=\"bracket-label\">🏆 Final</span>", "<span className=\"bracket-label\"><Trophy size={14} /> Final</span>");

// Playoff results
c = c.replace("{playoffMatchResult.winnerId === state.teamId ? '🎉 ¡Victoria!' : '😔 Derrota'}", 
  "{playoffMatchResult.winnerId === state.teamId ? <><Sparkles size={14} /> ¡Victoria!</> : 'Derrota'}");

c = c.replace("<p className=\"promotion-msg\">🏆 ¡{state.team?.name} ASCIENDE A LA LIGA!</p>",
  "<p className=\"promotion-msg\"><Trophy size={14} /> ¡{state.team?.name} ASCIENDE A LA LIGA!</p>");

c = c.replace("<h3>⚡ Próximo partido</h3>", "<h3><Zap size={14} /> Próximo partido</h3>");

c = c.replace("{isPlayerHome ? '🏠 Jugamos en casa' : '✈️ Jugamos fuera'}", 
  "{isPlayerHome ? <><Home size={12} /> Jugamos en casa</> : <><Plane size={12} /> Jugamos fuera</>}");

c = c.replace("⚽ Jugar partido <ChevronRight size={20} />", "<CircleDot size={14} /> Jugar partido <ChevronRight size={20} />");

c = c.replace("<h3>🏆 Playoff completado</h3>", "<h3><Trophy size={14} /> Playoff completado</h3>");
c = c.replace("<h3>🎉 ¡ASCENSO POR PLAYOFF!</h3>", "<h3><Sparkles size={16} /> ¡ASCENSO POR PLAYOFF!</h3>");
c = c.replace("<h3>🏆 Playoff de Ascenso (Segunda)</h3>", "<h3><Trophy size={14} /> Playoff de Ascenso (Segunda)</h3>");
c = c.replace("<span>🎟️ Entradas (acumulado)</span>", "<span><Ticket size={12} /> Entradas (acumulado)</span>");

writeFileSync('SeasonEnd.jsx', c);
console.log('done');
