import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { startReconstructionReview } from './hyacinth-reconstruction-review.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HYACINTH_PLAYWRIGHT_PATH || 'playwright');
const review = await startReconstructionReview();
const output = path.resolve(process.env.HYACINTH_CAPTURE_DIR || 'research/hyacinth-living-implementation');
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: {width:1440,height:900} });
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if(message.type()==='error')errors.push(message.text())});
  await page.goto(review.url+'/?journey=1', {waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__reconstructionReview, null, {timeout:60000,polling:100});
  const state=await page.evaluate(()=>({ready:window.__reconstructionReview.ready,error:window.__reconstructionReview.error}));
  if(!state.ready)throw Error(JSON.stringify(state));
  const poses=[];
  const stops=process.argv.slice(2).map(Number);
  for(const viewport of stops.length?stops:[0,5.5,8.5,13,20,26,32,42,44]) {
    const shot=await page.evaluate(vp=>{
      const r=window.__reconstructionReview;
      const data=r.journey(vp/44);
      return {data,position:r.api.camera.position.toArray(),targetDirection:r.api.camera.getWorldDirection(r.api.camera.position.clone()).toArray(),points:r.api.plant.reconstruction.seeds.length+r.api.plant.reconstruction.hiddenSeeds.length};
    },viewport);
    await writeFile(path.join(output, 'geometry-'+String(viewport).padStart(2,'0')+'.png'),Buffer.from(shot.data.split(',')[1],'base64'));
    poses.push({viewport,position:shot.position,direction:shot.targetDirection,points:shot.points});
  }
  await writeFile(path.join(output,'geometry-diagnostics.json'),JSON.stringify({poses,errors},null,2));
  console.log(JSON.stringify({poses,errors},null,2));
  if(errors.length)process.exitCode=1;
} finally {await browser?.close();await review.close()}
