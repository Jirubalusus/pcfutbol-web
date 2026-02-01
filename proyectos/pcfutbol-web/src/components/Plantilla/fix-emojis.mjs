import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('Plantilla.jsx', 'utf8');

// Add import
c = c.replace(
  "import './Plantilla.scss';",
  "import { Check, Tag, ClipboardList, Bell, AlertCircle, Clock, Coins, Calendar, Cake, Flag, PenTool, UserMinus, CircleDollarSign, XCircle } from 'lucide-react';\nimport './Plantilla.scss';"
);

// Message titles (strings)
c = c.replace("title: `✅ ${selectedPlayer.name} ha renovado`,", "title: `${selectedPlayer.name} ha renovado`,");
c = c.replace("title: `🏷️ ${selectedPlayer.name} en venta`,", "title: `${selectedPlayer.name} en venta`,");
c = c.replace("title: `😔 El vestuario nota la marcha de ${selectedPlayer.name}`,", "title: `El vestuario nota la marcha de ${selectedPlayer.name}`,");
c = c.replace("title: `👋 ${selectedPlayer.name} ha sido liberado`,", "title: `${selectedPlayer.name} ha sido liberado`,");

// Page title
c = c.replace("<h2>📋 Plantilla</h2>", "<h2><ClipboardList size={16} /> Plantilla</h2>");

// Alert icon
c = c.replace("<span className=\"alert-icon\">🔔</span>", "<span className=\"alert-icon\"><Bell size={14} /></span>");

// Contract alert text
c = c.replace("{wantsLeave ? '😤 Quiere irse' : `⏰ ${contract.label}`}", 
  "{wantsLeave ? <><AlertCircle size={12} /> Quiere irse</> : <><Clock size={12} /> {contract.label}</>}");

// Column headers
c = c.replace("💰 Salario", "<Coins size={12} /> Salario");
c = c.replace("📅 Contrato", "<Calendar size={12} /> Contrato");
c = c.replace("🎂 Edad", "<Cake size={12} /> Edad");

// Tags
c = c.replace("{isTransferListed && <span className=\"tag-listed\">🏷️ En venta</span>}", 
  "{isTransferListed && <span className=\"tag-listed\"><Tag size={12} /> En venta</span>}");
c = c.replace("{player.retiring && <span className=\"tag-retiring\">🏁 Se retira</span>}",
  "{player.retiring && <span className=\"tag-retiring\"><Flag size={12} /> Se retira</span>}");

// Contract label
c = c.replace("📅 {contract.label}", "<Calendar size={12} /> {contract.label}");

// Renew icon
c = c.replace("<span className=\"renew-icon\" title=\"Se puede renovar\">✍️</span>",
  "<span className=\"renew-icon\" title=\"Se puede renovar\"><PenTool size={12} /></span>");

// Action buttons (quick actions) - these appear multiple times
c = c.replaceAll("✍️", "<PenTool size={14} />");
c = c.replaceAll("🏷️", "<Tag size={14} />");
c = c.replaceAll("👋", "<UserMinus size={14} />");

// Section headers with emojis already replaced by above
// Additional specific replacements:
c = c.replace("<span className=\"impact-label\">💰 Si se vende:</span>",
  "<span className=\"impact-label\"><Coins size={12} /> Si se vende:</span>");
c = c.replace("<span className=\"impact-label\">💰 Ahorrarás en salarios:</span>",
  "<span className=\"impact-label\"><Coins size={12} /> Ahorrarás en salarios:</span>");

c = c.replace("<span className=\"warning-icon\">💸</span>",
  "<span className=\"warning-icon\"><CircleDollarSign size={14} /></span>");
c = c.replace("<span className=\"impact-label\">💸 Indemnización a pagar:</span>",
  "<span className=\"impact-label\"><CircleDollarSign size={12} /> Indemnización a pagar:</span>");

c = c.replace("<span>😔 Esto puede afectar la moral del vestuario</span>",
  "<span>Esto puede afectar la moral del vestuario</span>");
c = c.replace("<span>❌ No tienes suficiente dinero para la indemnización</span>",
  "<span><XCircle size={12} /> No tienes suficiente dinero para la indemnización</span>");

writeFileSync('Plantilla.jsx', c);
console.log('done');
