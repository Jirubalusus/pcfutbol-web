import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('Stadium.jsx', 'utf8');

// Add import
c = c.replace(
  "import './Stadium.scss';",
  "import { Building2, CircleDot, Mic, Briefcase, Trophy, Ticket, Coins, BarChart3, Megaphone, Users, Sprout, Check, AlertTriangle, XCircle, Lock, Wrench, Tag } from 'lucide-react';\nimport './Stadium.scss';"
);

// Stadium icon in header
c = c.replace("<span>🏟️</span>", "<span><Building2 size={20} /></span>");

// Event icons
c = c.replace("icon: '⚽',", "icon: <CircleDot size={16} />,");
c = c.replace("icon: '🎤',", "icon: <Mic size={16} />,");
c = c.replace("icon: '💼',", "icon: <Briefcase size={16} />,");
c = c.replace("icon: '🏆',", "icon: <Trophy size={16} />,");

// Message titles (plain strings)
c = c.replace("title: '🎫 Campaña de abonos cerrada',", "title: 'Campaña de abonos cerrada',");
c = c.replace("title: '💰 Naming Rights',", "title: 'Naming Rights',");
c = c.replace("title: '⚠️ Fondos insuficientes',", "title: 'Fondos insuficientes',");
c = c.replace("title: '🏟️ Naming cancelado',", "title: 'Naming cancelado',");
c = c.replace("title: '🏗️ Estadio ampliado',", "title: 'Estadio ampliado',");

// Tab labels
c = c.replace("📊 General", "<BarChart3 size={14} /> General");
c = c.replace("💰 Patrocinio", "<Coins size={14} /> Patrocinio");
c = c.replace("🎤 Eventos", "<Mic size={14} /> Eventos");

// Section headers
c = c.replace("<h3>🎫 Campaña de Abonos</h3>", "<h3><Ticket size={14} /> Campaña de Abonos</h3>");
c = c.replace("<h3>🎟️ Precio Entrada</h3>", "<h3><Ticket size={14} /> Precio Entrada</h3>");
c = c.replace("<h3>🌱 Estado del Césped</h3>", "<h3><Sprout size={14} /> Estado del Césped</h3>");
c = c.replace("<h3>🏷️ Patrocinador Actual</h3>", "<h3><Tag size={14} /> Patrocinador Actual</h3>");
c = c.replace("<h3>💰 Ofertas de Naming Rights</h3>", "<h3><Coins size={14} /> Ofertas de Naming Rights</h3>");
c = c.replace("<h3>🎤 Organizar Eventos</h3>", "<h3><Mic size={14} /> Organizar Eventos</h3>");

// Inline icons
c = c.replace("📢 Campaña abierta", "<Megaphone size={12} /> Campaña abierta");
c = c.replace("<span title=\"Posición liga\">📊 {teamPosition}º</span>", "<span title=\"Posición liga\"><BarChart3 size={12} /> {teamPosition}º</span>");
c = c.replace("<span title=\"Reputación\">🏆 {teamReputation}</span>", "<span title=\"Reputación\"><Trophy size={12} /> {teamReputation}</span>");
c = c.replace("✅ Cerrar campaña y fijar abonados", "<Check size={14} /> Cerrar campaña y fijar abonados");
c = c.replace("<span className=\"lock-icon\">🔒</span>", "<span className=\"lock-icon\"><Lock size={14} /></span>");

// Ticket price
c = c.replace("? '🔒 Precio fijado para esta temporada. Solo para no abonados.'", "? <><Lock size={12} /> Precio fijado para esta temporada. Solo para no abonados.</>");

// Stats labels
c = c.replace("<span className=\"label\">💰 Ingresos entradas acumulados</span>", "<span className=\"label\"><Coins size={12} /> Ingresos entradas acumulados</span>");
c = c.replace("<h4>📊 Última jornada en casa</h4>", "<h4><BarChart3 size={12} /> Última jornada en casa</h4>");
c = c.replace("<span className=\"label\">🎟️ Entradas vendidas</span>", "<span className=\"label\"><Ticket size={12} /> Entradas vendidas</span>");
c = c.replace("<span className=\"label\">👥 Asistencia total</span>", "<span className=\"label\"><Users size={12} /> Asistencia total</span>");
c = c.replace("<span className=\"label\">💰 Ingresos entradas</span>", "<span className=\"label\"><Coins size={12} /> Ingresos entradas</span>");

// Grass status
c = c.replace("{grassCondition >= 80 && <span className=\"status good\">✅ Óptimo</span>}", 
  "{grassCondition >= 80 && <span className=\"status good\"><Check size={12} /> Óptimo</span>}");
c = c.replace(/\{grassCondition >= 50 && grassCondition < 80 && <span className="status warning">⚠️ Riesgo/,
  '{grassCondition >= 50 && grassCondition < 80 && <span className="status warning"><AlertTriangle size={12} /> Riesgo');
c = c.replace(/\{grassCondition < 50 && <span className="status danger">❌ Riesgo/,
  '{grassCondition < 50 && <span className="status danger"><XCircle size={12} /> Riesgo');

c = c.replace("🔧 Reparar césped", "<Wrench size={14} /> Reparar césped");

// Naming penalty
c = c.replace("⚠️ Penalización:", "<AlertTriangle size={12} /> Penalización:");

// Grass warning in events
c = c.replace("<p className=\"grass-warning\">⚠️ Repara el césped antes de organizar eventos</p>",
  "<p className=\"grass-warning\"><AlertTriangle size={12} /> Repara el césped antes de organizar eventos</p>");

writeFileSync('Stadium.jsx', c);
console.log('done');
