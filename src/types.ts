export type Kind = 'task' | 'pr' | 'jira' | 'meeting' | 'note';
export type Item = { id:string; space:'work'|'personal'; kind:Kind; title:string; notes:string; pr:string; jira:string; meeting:string; due:string; today:boolean; done:boolean; revision:number; updatedAt:string; workspace?:string; plannedDate?:string; planOrder?:number; sourceStatus?:string; source?:'jira'|'github'; sourceId?:string; sourceAssigned?:boolean; sourceDone?:boolean };
export type TrackerStore = { list():Promise<Item[]>; save(item:Item,patch?:Partial<Item>):Promise<Item> };
