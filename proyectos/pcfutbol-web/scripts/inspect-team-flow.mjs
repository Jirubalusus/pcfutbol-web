import { chromium, devices } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext({...devices['iPhone 13']})).newPage();
await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__pcfGame?.state?.loaded,null,{timeout:60000});
await page.evaluate(()=>window.__pcfGame.dispatch({type:'SET_SCREEN',payload:'team_selection'}));
await page.waitForTimeout(1000);
for (let i=0;i<4;i++){
 console.log('--- step',i,'screen',await page.evaluate(()=>window.__pcfGame.state.currentScreen));
 const buttons=await page.$$eval('button',els=>els.slice(0,40).map((e,idx)=>({idx,cls:e.className,text:e.innerText.slice(0,80),rect:e.getBoundingClientRect().toJSON()})));
 console.log(JSON.stringify(buttons,null,2));
 const click=buttons.find(b=>b.idx>0 && b.rect.width>100 && b.rect.height>40) || buttons.find(b=>b.idx>0);
 if(!click) break;
 await page.locator('button').nth(click.idx).click();
 await page.waitForTimeout(1000);
}
await browser.close();
