import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const THREE=require('three');
const {createHyacinthAtmosphere}=require('../app/components/hyacinth/hyacinthAtmosphere.ts');
const {sampleHyacinthJourney}=require('../app/components/hyacinth/hyacinthChoreography.ts');
const state=at=>({...sampleHyacinthJourney(at/44),focus:[.6,0,.2],eye:[-1,1,6],reducedMotion:false});

test('emitted waves wait for the petals while the atmosphere remains present',()=>{
 const scene=new THREE.Scene(),system=createHyacinthAtmosphere(scene,false);
 const group=scene.getObjectByName('hyacinth-living-atmosphere');
 const uniforms=group.children[0].material.uniforms;
 system.update(state(0),0);assert.equal(group.visible,true);
 assert.deepEqual(uniforms.uEventStrength.value.toArray(),[0,0,0,0]);
 for(let at=.9;at<=44;at+=.1){
   system.update(state(at),0);
   assert.equal(group.visible,true);
   assert.equal(uniforms.uReveal.value,1);
   if(at<7)assert.deepEqual(uniforms.uEventStrength.value.toArray(),[0,0,0,0]);
 }
 system.dispose();assert.equal(scene.children.length,0);
});

test('scroll reversal restores the same source-specific waves without cycle resets',()=>{
 const scene=new THREE.Scene(),system=createHyacinthAtmosphere(scene,false);
 const uniforms=scene.getObjectByName('hyacinth-particle-currents').material.uniforms;
 const read=at=>{system.update(state(at),0);return[...uniforms.uEventPhase.value.toArray(),...uniforms.uEventStrength.value.toArray()];};
 const forward=Array.from({length:89},(_,i)=>read(i*.5));
 for(let i=88;i>=0;i--)assert.deepEqual(read(i*.5),forward[i]);
 for(const boundary of [14,27,38]){
   const before=read(boundary-.00001),after=read(boundary+.00001);
   assert.ok(after.every((value,i)=>Math.abs(value-before[i])<.0001));
 }
 system.dispose();
});

test('reduced motion removes expanding waves and foreground motes on both quality tiers',()=>{
 for(const mobile of [false,true]){
   const scene=new THREE.Scene(),system=createHyacinthAtmosphere(scene,mobile);
   system.update({...state(26),reducedMotion:true},5);
   assert.equal(scene.getObjectByName('hyacinth-bloom-ripples').visible,false);
   assert.equal(scene.getObjectByName('hyacinth-depth-accents').visible,false);
   assert.equal(scene.getObjectByName('hyacinth-particle-currents').material.uniforms.uTime.value,0);
   system.dispose();system.dispose();assert.equal(scene.children.length,0);
 }
});
