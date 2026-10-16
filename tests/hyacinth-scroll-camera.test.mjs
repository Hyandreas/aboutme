import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import * as THREE from 'three';
const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const { sampleHyacinthScrollCamera: sample, HYACINTH_SCROLL_VIEWPORTS, HYACINTH_ENTRY_POSE } = require('../app/components/hyacinth/hyacinthScrollCamera.ts');
function camera(p) {
  const pose=sample(p), c=new THREE.PerspectiveCamera(42,1440/900,.1,300);
  c.position.fromArray(pose.position);c.lookAt(new THREE.Vector3(...pose.target));
  c.setViewOffset(1440,900,-1440*pose.lensShift,0,1440,900);c.updateMatrixWorld(true);
  return c;
}
function project(point,p) {
  const projected=new THREE.Vector3(...point).project(camera(p));
  projected.x+=sample(p).canvasShift*2;
  return projected;
}
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('the journey begins at the unchanged original camera and has 44 viewports of travel',()=>{
  assert.equal(HYACINTH_SCROLL_VIEWPORTS,44);
  const az=-24*Math.PI/180,el=4*Math.PI/180;
  const position=[Math.sin(az)*Math.cos(el)*10.8,1.85+Math.sin(el)*10.8,Math.cos(az)*Math.cos(el)*10.8];
  assert.deepEqual(sample(0).position,position);
  for(const options of [{},{mobile:true},{reducedMotion:true}])assert.deepEqual(sample(0,options),HYACINTH_ENTRY_POSE);
});
test('each viewport advances the camera and the eye descends continuously',()=>{
  let previous=sample(0);
  for(let i=1;i<=4400;i++){
    const pose=sample(i/4400);
    assert.ok([...pose.position,...pose.target,pose.lensShift].every(Number.isFinite));
    assert.ok(pose.position[1]<previous.position[1], 'Descending must never turn into a rising orbit');
    previous=pose;
  }
  for(let i=0;i<44;i++)assert.ok(distance(sample(i/44).position,sample((i+1)/44).position)>.08,`Viewport ${i} stalls`);
  assert.ok(distance(sample(0).position,sample(.1/44).position)>.05,'Motion starts with the first scroll input');
});
test('stem landmarks rise during the descending stem pass',()=>{
  const landmark=[.7,-2.5,.2];
  for(const [a,b] of [[34,36],[36,39]]) assert.ok(project(landmark,b/44).y>project(landmark,a/44).y);
});
test('the passage provides a substantial macro view and the ending pulls away below it',()=>{
  const initial=sample(0),close=sample(20/44),last=sample(1);
  assert.ok(distance(close.position,close.target)<distance(initial.position,initial.target)*.33);
  assert.ok(distance(last.position,last.target)>distance(close.position,close.target)*4);
  assert.ok(last.position[1]<-5 && last.target[1]>last.position[1]);
});
test('storyboard joins have continuous position and velocity',()=>{
  for(const at of [2,4,6,8.5,10,13,16,20,24,26,28,30,32,34,36,39,42]){
    const p=at/44,e=1e-5,a=sample(p-e),b=sample(p),c=sample(p+e);
    for(const field of ['position','target'])for(let axis=0;axis<3;axis++) {
      const before=(b[field][axis]-a[field][axis])/e,after=(c[field][axis]-b[field][axis])/e;
      assert.ok(Math.abs(before-after)<.3,`Abrupt ${field} motion at ${at}`);
    }
    for(const field of ['lensShift','canvasShift','roll']){
      const before=(b[field]-a[field])/e,after=(c[field]-b[field])/e;
      assert.ok(Math.abs(before-after)<.3,`Abrupt ${field} motion at ${at}`);
    }
  }
});
test('mobile retains the sequence with greater clearance and narrower horizontal shift',()=>{
  for(const at of [3,8,10,15,44]){
    const desktop=sample(at/44),mobile=sample(at/44,{mobile:true});
    assert.deepEqual(mobile.target,desktop.target);
    assert.ok(distance(mobile.position,mobile.target)>distance(desktop.position,desktop.target));
    assert.ok(Math.abs(mobile.lensShift)<=Math.abs(desktop.lensShift));
    if(desktop.lensShift!==0)assert.ok(Math.abs(mobile.lensShift)<Math.abs(desktop.lensShift));
  }
});
test('the middle passage holds center and the final whole-flower view leaves the right column',()=>{
  assert.ok(sample(10/44).lensShift>.2,'Keep the first bloom beside the copy');
  for(let at=16;at<=26;at+=.25){
    assert.equal(sample(at/44).lensShift,0);
    assert.equal(sample(at/44).canvasShift,0);
  }
  const flowerAxis=[.55,.4,0];
  for(const at of [42,43,44])assert.ok(Math.abs(project(flowerAxis,at/44).x)<.08,`Flower off-center at ${at}`);
});
test('reduced motion is a simple vertical pass with unchanged viewing direction and distance',()=>{
  const first=sample(0,{reducedMotion:true});
  for(let i=1;i<=44;i++){
    const pose=sample(i/44,{reducedMotion:true});
    assert.equal(pose.position[0],first.position[0]);assert.equal(pose.position[2],first.position[2]);
    assert.ok(Math.abs(distance(pose.position,pose.target)-distance(first.position,first.target))<1e-9);
    assert.equal(pose.lensShift,0);
  }
});
test('reverse scrolling and boundary input recover deterministic camera poses',()=>{
  const forward=Array.from({length:101},(_,i)=>sample(i/100));
  for(let i=100;i>=0;i--)assert.deepEqual(sample(i/100),forward[i]);
  for(const p of [-100,NaN,Infinity])assert.deepEqual(sample(p),sample(0));
  assert.deepEqual(sample(100),sample(1));
});
