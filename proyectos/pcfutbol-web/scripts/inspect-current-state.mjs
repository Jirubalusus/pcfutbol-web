import { chromium, devices } from 'playwright';
const page = await (await chromium.launch({headless:true})).newPage();
await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__pcfGame?.state?.loaded,{timeout:60000});
console.log(await page.evaluate(()=>({screen:window.__pcfGame.state.currentScreen, week:window.__pcfGame.state.currentWeek, season:window.__pcfGame.state.currentSeason, text:document.body.innerText.slice(0,1000), simDropdown:!!document.querySelector('.office__sim-dropdown'), overlay:!!document.querySelector('.sim-summary-overlay')})));
await page.close();
