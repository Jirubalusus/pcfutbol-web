const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'];
for (const lang of locales) {
  const filePath = path.join(__dirname, '..', 'src', 'locales', `${lang}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    
    // Check mainMenu.saveProgress
    const val = parsed.mainMenu?.saveProgress;
    console.log(`${lang}: mainMenu.saveProgress = ${JSON.stringify(val)}`);
    
    // Check mainMenu.loginButton
    const login = parsed.mainMenu?.loginButton;
    console.log(`${lang}: mainMenu.loginButton = ${JSON.stringify(login)}`);
  } catch (e) {
    console.error(`${lang}: PARSE ERROR - ${e.message}`);
  }
}
