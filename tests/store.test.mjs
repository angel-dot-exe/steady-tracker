import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, validateItem } from '../src/store.ts';
const item={id:'task-1',space:'work',kind:'task',title:'Review a pull request',notes:'Check the smaller change first.',pr:'https://github.com/example/repo/pull/1',jira:'',meeting:'',due:'',today:false,done:false,revision:1,updatedAt:'2026-01-01T00:00:00.000Z'};
const row=(data=item)=>({$id:data.id,$updatedAt:'2026-01-01T00:00:00.000Z',payload:JSON.stringify(data),revision:data.revision});
test('new records grant access only to their signed-in owner',async()=>{
 let request;
 const db={createRow:async p=>{request=p;return {$id:p.rowId,$updatedAt:item.updatedAt,...p.data}}};
 const result=await createStore(db,'owner-123').save({...item,revision:0});
 assert.equal(result.revision,1);
 assert.deepEqual(request.permissions,['read("user:owner-123")','update("user:owner-123")','delete("user:owner-123")']);
 assert.equal(request.databaseId,'steady');assert.equal(request.tableId,'items');
});
test('loads every page and disables stale query caching',async()=>{
 const calls=[];
 const db={listRows:async p=>{calls.push(p);return {rows:calls.length===1?Array.from({length:100},(_,i)=>row({...item,id:`id-${i}`})):[row({...item,id:'id-100'})]}}};
 const result=await createStore(db,'owner').list();assert.equal(result.length,101);assert.equal(calls[0].ttl,0);assert.ok(calls[1].queries.some(q=>q.includes('cursorAfter')&&q.includes('id-99')));
});
test('a stale edit rolls back without staging an overwrite',async()=>{
 let wrote=false;let rolledBack=false;
 const db={createTransaction:async()=>({$id:'tx'}),getRow:async()=>row({...item,revision:4}),updateRow:async()=>{wrote=true},updateTransaction:async p=>{rolledBack=p.rollback}};
 await assert.rejects(()=>createStore(db,'owner').save(item,{done:true}),/changed on another device/);
 assert.equal(wrote,false);assert.equal(rolledBack,true);
});
test('partial updates preserve other fields and commit before reporting success',async()=>{
 const steps=[];
 const db={createTransaction:async()=>({$id:'tx'}),getRow:async p=>{assert.equal(p.transactionId,'tx');return row()},updateRow:async p=>{steps.push('stage');assert.equal(p.transactionId,'tx');return {$id:item.id,$updatedAt:item.updatedAt,...p.data}},updateTransaction:async p=>{assert.equal(p.commit,true);steps.push('commit')}};
 const result=await createStore(db,'owner').save(item,{done:true});
 assert.deepEqual(steps,['stage','commit']);assert.equal(result.done,true);assert.equal(result.notes,item.notes);assert.equal(result.pr,item.pr);assert.equal(result.revision,2);
});
test('a failed transaction does not report a successful save',async()=>{
 const db={createTransaction:async()=>({$id:'tx'}),getRow:async()=>row(),updateRow:async p=>({$id:item.id,$updatedAt:item.updatedAt,...p.data}),updateTransaction:async p=>{if(p.commit)throw Object.assign(new Error('Conflict'),{code:409})}};
 await assert.rejects(()=>createStore(db,'owner').save(item,{done:true}),/changed on another device/);
});
test('rejects unsafe links and invalid dates before writing',()=>{
 assert.throws(()=>validateItem({...item,pr:'javascript:alert(1)'}),/http/);
 assert.throws(()=>validateItem({...item,title:'   '}),/title/);
 assert.throws(()=>validateItem({...item,meeting:'not a date'}),/meeting/);
 assert.throws(()=>validateItem({...item,notes:'x'.repeat(20001)}),/20,000/);
});
