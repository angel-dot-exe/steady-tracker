import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,weekDays,shiftDay,validDay,planPatch,reorderPatch,byPlan,isAmbient} from '../src/planning.ts';
const item={id:'a',space:'work',kind:'pr',title:'First',done:false,plannedDate:'2026-10-28',planOrder:1024,due:'2026-11-10',jira:'https://example/browse/AMB-1'};
test('weeks start Monday and cross month and year boundaries safely',()=>{
 assert.deepEqual(weekDays('2027-01-03'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 assert.equal(shiftDay('2026-03-08',1),'2026-03-09');assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2028-02-29'),true);
});
test('rescheduling changes the plan without changing a deadline or Jira link',()=>{
 const moved={...item,...planPatch([item],item,'2026-11-01')};assert.equal(moved.due,item.due);assert.equal(moved.jira,item.jira);assert.equal(moved.plannedDate,'2026-11-01');
 assert.equal(planPatch([item],item,'').plannedDate,'');
});
test('moves a planned card earlier and later without duplicating records',()=>{
 const b={...item,id:'b',title:'Second',planOrder:2048},c={...item,id:'c',title:'Third',planOrder:3072};
 const moved={...c,...reorderPatch([item,b,c],c,-1)};assert.deepEqual([item,b,moved].sort(byPlan).map(i=>i.id),['a','c','b']);
 const later={...item,...reorderPatch([item,b,c],item,1)};assert.deepEqual([later,b,c].sort(byPlan).map(i=>i.id),['b','a','c']);
 assert.equal(reorderPatch([item,b,c],item,-1),null);
});
test('existing work belongs to Ambient; Personal remains separate',()=>{assert.equal(isAmbient(item),true);assert.equal(isAmbient({...item,space:'personal'}),false);assert.equal(isAmbient({...item,workspace:'other'}),false)});
