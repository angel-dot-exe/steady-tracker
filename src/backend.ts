import { Account, Client, TablesDB } from 'appwrite';
export type BackendConfig={endpoint:string;project:string};
const key='steady-appwrite-config-v1';
export function validConfig(input:BackendConfig):BackendConfig {
 const url=new URL(input.endpoint.trim());
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Use an HTTPS Appwrite endpoint.');
 if(url.username||url.password||url.search||url.hash)throw new Error('Use the API endpoint only, without credentials or query parameters.');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(input.project.trim()))throw new Error('Enter your public project ID, not an API key.');
 return {endpoint:url.href.replace(/\/$/,''),project:input.project.trim()};
}
export function loadConfig():BackendConfig|null {
 try { if(import.meta.env.VITE_APPWRITE_ENDPOINT&&import.meta.env.VITE_APPWRITE_PROJECT_ID)return validConfig({endpoint:import.meta.env.VITE_APPWRITE_ENDPOINT,project:import.meta.env.VITE_APPWRITE_PROJECT_ID}); const stored=localStorage.getItem(key);return stored?validConfig(JSON.parse(stored)):null; }catch{return null;}
}
export function saveConfig(config:BackendConfig){localStorage.setItem(key,JSON.stringify(validConfig(config)));}
export function connect(config:BackendConfig){const client=new Client().setEndpoint(config.endpoint).setProject(config.project);return {client,account:new Account(client),db:new TablesDB(client)};}
