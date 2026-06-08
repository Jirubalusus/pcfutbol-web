import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const outDir=path.resolve('artifacts/qa-offline-cloud-sync-preprod-20260604'); fs.mkdirSync(outDir,{recursive:true});
const seed={_schema:1,_savedAt:Date.now(),summary:{teamName:'Betis',teamId:'betis',season:4,week:9,money:8888888,databaseSeasonId:'2005-06'},state:{gameStarted:true,gameMode:'career',currentScreen:'office',currentWeek:9,currentSeason:4,teamId:'betis',team:{id:'betis',teamId:'betis',name:'Betis',players:[{id:'p1',name:'Joaquin',overall:80}]},leagueId:'laliga',playerLeagueId:'laliga',money:8888888,databaseSeasonId:'2005-06',leagueTable:[{teamId:'betis',points:25}],fixtures:[{id:'future',played:false,week:9,homeTeam:'betis',awayTeam:'sevilla'}],results:[],settings:{autoSave:true,showTutorials:true,soundEnabled:true,musicVolume:70,sfxVolume:80}}};
async function run(name, viewport, isMobile=false){
 const b=await chromium.launch({headless:true}); const c=await b.newContext({viewport,isMobile,deviceScaleFactor:isMobile?2:1,hasTouch:isMobile});
 await c.addInitScript(seed=>{localStorage.setItem('pcfutbol_local_career_v1',JSON.stringify(seed));localStorage.setItem('i18nextLng','es');},seed);
 const p=await c.newPage(); const errors=[]; p.on('console',m=>{if(['error','warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`)}); p.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
 await p.goto(`https://pcgaffer-preprod.web.app/?qaOfflineSyncPreprod=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(2500);
 const assets=await p.evaluate(()=>({scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src).filter(s=>s.includes('/assets/')), css:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href).filter(h=>h.includes('/assets/')), initialText:document.body.innerText.slice(0,800)}));
 await p.getByText(/Jugar ahora|Play now/i).first().click({timeout:20000}); await p.waitForTimeout(800); const prompt=await p.evaluate(()=>document.body.innerText); const hasPrompt=/Continuar|Continue/i.test(prompt)&&/Nueva|New/i.test(prompt);
 await p.getByText(/Continuar|Continue/i).first().click({timeout:20000}); await p.waitForFunction(()=>/Betis/i.test(document.body.innerText)&&(/Season 4|Temporada 4/i.test(document.body.innerText))&&(/Week 9|Semana 9|Jornada 9|Matchday 9/i.test(document.body.innerText)),null,{timeout:30000});
 const metrics=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2, bodyText:document.body.innerText.slice(0,1200), storageExists:!!localStorage.getItem('pcfutbol_local_career_v1')}));
 const screenshot=path.join(outDir,`${name}.png`); await p.screenshot({path:screenshot,fullPage:false}); await b.close(); return {name,screenshot,assets,hasPrompt,metrics:{overflow:metrics.overflow,storageExists:metrics.storageExists,containsBetis:/Betis/i.test(metrics.bodyText),containsWeek:/Week 9|Semana 9|Jornada 9|Matchday 9/i.test(metrics.bodyText)},errors};
}
const results=[await run('preprod-desktop',{width:1365,height:768}),await run('preprod-mobile',{width:390,height:844},true)]; fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(results,null,2)); console.log(JSON.stringify(results,null,2));
