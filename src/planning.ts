import type { Item } from './types';
export const dateKey = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const parseDay = (key: string) => new Date(`${key}T12:00:00`);
export const shiftDay = (key: string, offset: number) => { const d=parseDay(key);d.setDate(d.getDate()+offset);return dateKey(d); };
export const weekDays = (key: string) => { const d=parseDay(key);const start=shiftDay(key,-((d.getDay()+6)%7));return Array.from({length:7},(_,i)=>shiftDay(start,i)); };
export const validDay = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(parseDay(key).getTime()) && dateKey(parseDay(key))===key;
export const planDay = (item: Item) => item.plannedDate || (item.kind==='meeting' && item.meeting ? dateKey(new Date(item.meeting)) : '');
export const byPlan = (a: Item,b: Item) => Number(a.done)-Number(b.done) || (a.planOrder??0)-(b.planOrder??0) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
export const isAmbient = (item: Item) => item.space==='work' && (!item.workspace || item.workspace==='ambient');
export const planPatch = (items: Item[],item: Item,day: string): Partial<Item> => ({plannedDate:day,planOrder:Math.max(0,...items.filter(i=>i.id!==item.id&&planDay(i)===day).map(i=>i.planOrder??0))+1024});
export function reorderPatch(items: Item[],item: Item,direction: -1|1): Partial<Item>|null {
 const list=items.filter(i=>planDay(i)===planDay(item)&&i.done===item.done).sort(byPlan);
 const index=list.findIndex(i=>i.id===item.id),target=index+direction;
 if(index<0||target<0||target>=list.length)return null;
 const neighbor=list[target].planOrder??0;
 const beyond=list[target+direction]?.planOrder;
 return {planOrder:beyond===undefined?neighbor+direction*1024:(neighbor+beyond)/2};
}
