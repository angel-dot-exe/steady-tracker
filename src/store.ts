import { Permission, Query, Role } from 'appwrite';
import type { TablesDB, Models } from 'appwrite';
import type { Item, TrackerStore } from './types';
type Row = Models.Row & { payload:string; revision:number };
const conflict = () => new Error('This item changed on another device. Your draft is still here. Close and reopen it to review the latest version.');
export function validateItem(item:Item):Item {
 if(!['work','personal'].includes(item.space)||!['task','pr','jira','meeting','note'].includes(item.kind))throw new Error('Choose a valid space and item type.');
 if(!item.title.trim()||item.title.length>200)throw new Error('Add a title of up to 200 characters.');
 if(item.notes.length>20000)throw new Error('Keep notes under 20,000 characters.');
 for(const link of [item.pr,item.jira]) { if(!link)continue; let url:URL;try{url=new URL(link)}catch{throw new Error('Use a complete https or http link.')}if(!['https:','http:'].includes(url.protocol)||link.length>2000)throw new Error('Use a complete https or http link.'); }
 if(item.meeting&&!Number.isFinite(Date.parse(item.meeting)))throw new Error('Choose a valid meeting time.');
 if(item.due&&!/^\d{4}-\d{2}-\d{2}$/.test(item.due))throw new Error('Choose a valid due date.');
 return {...item,title:item.title.trim()};
}
const decode=(row:Row):Item => validateItem({...JSON.parse(row.payload),id:row.$id,revision:row.revision,updatedAt:row.$updatedAt});
export function createStore(db:TablesDB,userId:string,databaseId='steady',tableId='items'):TrackerStore {
 const scope={databaseId,tableId};
 return {
  async list(){
   const all:Item[]=[];let cursor:string|undefined;
   for(;;){
    const page=await db.listRows<Row>({...scope,queries:[Query.limit(100),Query.orderAsc('$id'),...(cursor?[Query.cursorAfter(cursor)]:[])],ttl:0,total:false});
    all.push(...page.rows.map(decode));if(page.rows.length<100)return all;cursor=page.rows.at(-1)!.$id;
   }
  },
  async save(item,patch){
   if(!item.revision){
    const next=validateItem({...item,revision:1,updatedAt:new Date().toISOString()});
    try{
     const row=await db.createRow<Row>({...scope,rowId:item.id,data:{payload:JSON.stringify(next),revision:1},permissions:[Permission.read(Role.user(userId)),Permission.update(Role.user(userId)),Permission.delete(Role.user(userId))]});
     return decode(row);
    }catch(error){
     // A network retry after a successful creation must not duplicate the task.
     if((error as {code?:number}).code===409){const existing=decode(await db.getRow<Row>({...scope,rowId:item.id}));if(existing.title===next.title&&existing.notes===next.notes&&existing.pr===next.pr&&existing.jira===next.jira&&existing.meeting===next.meeting&&existing.due===next.due&&existing.space===next.space&&existing.kind===next.kind&&existing.today===next.today&&existing.done===next.done)return existing;}
     throw error;
    }
   }
   const tx=await db.createTransaction({ttl:60});
   try{
    const current=decode(await db.getRow<Row>({...scope,rowId:item.id,transactionId:tx.$id}));
    if(current.revision!==item.revision)throw conflict();
    const next=validateItem({...current,...(patch??item),id:item.id,revision:current.revision+1,updatedAt:new Date().toISOString()});
    const staged=await db.updateRow<Row>({...scope,rowId:item.id,data:{payload:JSON.stringify(next),revision:next.revision},transactionId:tx.$id});
    await db.updateTransaction({transactionId:tx.$id,commit:true});
    return decode(staged);
   }catch(error){
    await db.updateTransaction({transactionId:tx.$id,rollback:true}).catch(()=>{});
    if((error as {code?:number}).code===409)throw conflict();
    throw error;
   }
  }
 };
}
