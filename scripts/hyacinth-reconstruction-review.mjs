import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A blank rendering fixture, never a portfolio route or a content redesign.
const page = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;overflow:hidden;background:#050309}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/":"/node_modules/three/"}}</script>
</head><body><canvas id="vault-gl"></canvas><script type="module">
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
let seed=20261013;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
window.requestAnimationFrame=()=>0;
window.cancelAnimationFrame=()=>{};
try {
 const params=new URLSearchParams(location.search);
 const original=params.has('original');
 const {initHyacinth}=await import(original?'/original.js':'/app/components/hyacinth/hyacinth3d.js');
 const api=initHyacinth({canvas:document.querySelector('canvas'),getProgress:()=>0,reconstruct:true,scrollScene:params.has('journey')});
 if(!api) throw new Error('No WebGL renderer');
 await new Promise((resolve,reject)=>{document.addEventListener('hyacinth:imageLoaded',resolve,{once:true});document.addEventListener('hyacinth:unavailable',()=>reject(new Error('Geometry loading failed')),{once:true});api.loadImage('/assets/hyacinth.png')});
 api.debugRenderAt(0);
 api.plant.group.rotation.set(0,0,0);
 if(params.has('noDepth')){const depth=api.scene.getObjectByName('hyacinth-anatomical-depth');if(depth)depth.visible=false}
 api.scene.traverse(o=>{const u=o.material?.uniforms;if(u?.uTime)u.uTime.value=0;if(u?.uIntro)u.uIntro.value=1});
 let composer=null;
 if(innerWidth>768){composer=new EffectComposer(api.renderer);composer.addPass(new RenderPass(api.scene,api.camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth*.5,innerHeight*.5),.13,.5,.86);
 composer.addPass(bloom);composer.addPass(new OutputPass())}
 const entryPosition=api.camera.position.clone();
 const entryTarget=new THREE.Vector3(-1.55*Math.cos(-24*Math.PI/180),1.85,1.55*Math.sin(-24*Math.PI/180));
 const target=new THREE.Vector3(0,0.15,-0.4);
 const directions={quarter:[.45,.10,.89],left:[-1,.08,0],right:[1,.08,0],rear:[.1,.1,-1],elevated:[.2,.7,.68]};
 function render(view='entry') {
   if(view==='entry'){api.camera.position.copy(entryPosition);api.camera.lookAt(entryTarget)}
   else {const direction=new THREE.Vector3(...directions[view]).normalize();api.camera.position.copy(target).addScaledVector(direction,11);api.camera.lookAt(target)}
   api.camera.updateMatrixWorld(true);
   if(composer)composer.render();else api.renderer.render(api.scene,api.camera);
   return document.querySelector('canvas').toDataURL('image/png');
 }
 function journey(progress){api.debugRenderAt(progress);api.plant.group.rotation.set(0,0,0);
 api.scene.traverse(o=>{const u=o.material?.uniforms;if(u?.uTime)u.uTime.value=0;if(u?.uIntro)u.uIntro.value=1});
 if(api.renderScene)api.renderScene();else if(composer)composer.render();else api.renderer.render(api.scene,api.camera);
 return document.querySelector('canvas').toDataURL('image/png')}
 window.__reconstructionReview={ready:true,api,render,journey,hasGeometry:!!api.plant.reconstruction};
 render();
} catch(error){window.__reconstructionReview={ready:false,error:String(error)};console.error(error)}
</script></body></html>`;

export async function startReconstructionReview() {
  const original = execFileSync('git', ['show', 'HEAD:app/components/hyacinth/hyacinth3d.js'], { cwd: root });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        res.end(page);
        return;
      }
      if (url.pathname === '/original.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(original);
        return;
      }
      let relative = decodeURIComponent(url.pathname);
      if (relative.startsWith('/assets/')) relative = '/public' + relative;
      if (!['/app/components/hyacinth/', '/node_modules/three/', '/public/assets/'].some(p => relative.startsWith(p))) {
        res.writeHead(404); res.end(); return;
      }
      const candidate = path.resolve(root, '.' + relative);
      const roots = ['app/components/hyacinth', 'node_modules/three', 'public/assets'].map(p => path.join(root, p) + path.sep);
      if (!roots.some(p => candidate.startsWith(p))) { res.writeHead(404); res.end(); return; }
      const choices = path.extname(candidate) ? [candidate] : [candidate + '.ts', candidate + '.js'];
      let file;
      for (const choice of choices) {
        try { if ((await stat(choice)).isFile()) { file = choice; break; } } catch { /* Try the next extension. */ }
      }
      if (!file) { res.writeHead(404); res.end(); return; }
      let data = await readFile(file);
      if (file.endsWith('.ts')) data = ts.transpileModule(data.toString(), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      res.writeHead(200, { 'Content-Type': file.endsWith('.png') ? 'image/png' : 'text/javascript', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch (error) { res.writeHead(500); res.end(String(error)); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => server.close(resolve)) };
}
