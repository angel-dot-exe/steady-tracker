import { Client, ExecutionMethod, Functions } from 'appwrite';
export type IntegrationStatus={github:{configured:boolean;connected:boolean};jira:{configured:boolean;connected:boolean};sync?:{running?:boolean;lastSync?:string;error?:string}|null};
export type IntegrationService={enabled:boolean;call:(body:Record<string,string>,async?:boolean)=>Promise<any>};
export function integrationService(client:Client):IntegrationService {
 const functions=new Functions(client),functionId=import.meta.env.VITE_SYNC_FUNCTION_ID;
 return {enabled:!!functionId,async call(body,async=false){
  if(!functionId)throw new Error('Account connections need their one-time setup.');
  const result=await functions.createExecution({functionId,body:JSON.stringify(body),async,method:ExecutionMethod.POST});
  if(async)return {queued:true};
  let data;try{data=JSON.parse(result.responseBody)}catch{throw new Error('The connection service did not respond. Please retry.')}
  if(data.error||result.responseStatusCode>=400)throw new Error(data.error||'The connection service could not complete this request.');
  return data;
 }};
}
