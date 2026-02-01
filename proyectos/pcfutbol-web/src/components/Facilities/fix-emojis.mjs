import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('Facilities.jsx', 'utf8');

// Add lucide import after the scss import
c = c.replace(
  "import './Facilities.scss';",
  "import { Building2, Briefcase, Sprout, HeartPulse, Search, Coins, TrendingUp, Wrench, Zap, Target, Check, BarChart3, Stethoscope, Syringe } from 'lucide-react';\nimport './Facilities.scss';"
);

// Replace FACILITY icons (these are in object constants - need JSX)
c = c.replace("icon: '🏟️',", "icon: <Building2 size={20} />,");
c = c.replace("icon: '💼',", "icon: <Briefcase size={20} />,");
c = c.replace("icon: '🌱',", "icon: <Sprout size={20} />,");
c = c.replace("icon: '🏥',", "icon: <HeartPulse size={20} />,");
c = c.replace("icon: '🔍',", "icon: <Search size={20} />,");

// FACILITY_CATEGORY_INFO
c = c.replace("income: { name: 'Ingresos', icon: '💰', color: '#ffd60a' },", 
  "income: { name: 'Ingresos', icon: <Coins size={14} />, color: '#ffd60a' },");
c = c.replace("development: { name: 'Desarrollo', icon: '📈', color: '#30d158' },",
  "development: { name: 'Desarrollo', icon: <TrendingUp size={14} />, color: '#30d158' },");
c = c.replace("support: { name: 'Soporte', icon: '🛠️', color: '#bf5af2' }",
  "support: { name: 'Soporte', icon: <Wrench size={14} />, color: '#bf5af2' }");

// Modal icon
c = c.replace("<span className=\"modal-icon\">⚡</span>", "<span className=\"modal-icon\"><Zap size={22} /></span>");

// Specialization header
c = c.replace("<h3>🎯 {FACILITY_SPECIALIZATIONS[selectedFacility].name}</h3>",
  "<h3><Target size={14} /> {FACILITY_SPECIALIZATIONS[selectedFacility].name}</h3>");

// Check mark
c = c.replace("{isSelected && <span className=\"spec-card__check\">✓</span>}",
  "{isSelected && <span className=\"spec-card__check\"><Check size={12} /></span>}");

// Page title
c = c.replace("<h2>🏗️ Instalaciones</h2>", "<h2><Wrench size={16} /> Instalaciones</h2>");

// Stats icons
c = c.replace("<span className=\"stat-icon\">💰</span>", "<span className=\"stat-icon\"><Coins size={14} /></span>");
c = c.replace("<span className=\"stat-icon\">🏦</span>", "<span className=\"stat-icon\"><Building2 size={14} /></span>");

// Medical section
c = c.replace("<span className=\"medical-icon\">🏥</span>", "<span className=\"medical-icon\"><HeartPulse size={16} /></span>");
c = c.replace("👨\u200D⚕️ Médicos:", "<Stethoscope size={12} /> Médicos:");
c = c.replace("<span>✅</span> Sin jugadores lesionados", "<span><Check size={14} /></span> Sin jugadores lesionados");
c = c.replace(/🤕/g, "<HeartPulse size={12} />");
c = c.replace("<span className=\"player-badge treated\">👨\u200D⚕️ En tratamiento</span>", 
  "<span className=\"player-badge treated\"><Stethoscope size={12} /> En tratamiento</span>");
c = c.replace(/💉/g, "<Syringe size={12} />");

// Impact section
c = c.replace("<h3>📊 Impacto de tus instalaciones</h3>", "<h3><BarChart3 size={14} /> Impacto de tus instalaciones</h3>");
c = c.replace("<span className=\"impact-icon\">🌱</span>", "<span className=\"impact-icon\"><Sprout size={14} /></span>");
c = c.replace("<span className=\"impact-icon\">💉</span>", "<span className=\"impact-icon\"><Syringe size={14} /></span>");

writeFileSync('Facilities.jsx', c);
console.log('done');
