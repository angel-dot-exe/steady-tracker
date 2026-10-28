import { useEffect, useMemo, useState } from 'react';
import { ID } from 'appwrite';
import type { Models } from 'appwrite';
import { ArrowRight, CloudCheck, Leaf } from 'lucide-react';
import { connect, loadConfig, saveConfig, validConfig } from './backend';
import type { BackendConfig } from './backend';
import { createStore } from './store';
import Tracker from './tracker';
import { integrationService } from './integrations';
function Frame({children}:{children:React.ReactNode}){return <div className="auth-shell"><section className="auth-card"><a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark">⌒</span>steady<span className="brand-dot">.</span></a>{children}<p className="auth-foot"><Leaf size={15}/> A little more headspace, wherever you are.</p></section></div>}
export default function App(){
 const [config,setConfig]=useState<BackendConfig|null>(()=>loadConfig());
 if(!config)return <Setup onReady={setConfig}/>;
 return <Connected config={config}/>;
}
function Setup({onReady}:{onReady:(c:BackendConfig)=>void}){
 const [endpoint,setEndpoint]=useState(''),[project,setProject]=useState(''),[error,setError]=useState('');
 return <Frame><p className="eyebrow">YOUR SPACE, ON EVERY DEVICE</p><h1>One last connection.</h1><p className="auth-description">Connect your Appwrite project to keep Work, Personal, and your important notes in sync. Your tracker data stays behind your sign-in.</p><form onSubmit={e=>{e.preventDefault();try{const c=validConfig({endpoint,project});saveConfig(c);onReady(c)}catch(err){setError((err as Error).message)}}}><label>Appwrite API endpoint<input type="url" required placeholder="https://fra.cloud.appwrite.io/v1" value={endpoint} onChange={e=>setEndpoint(e.target.value)}/></label><label>Project ID<input required maxLength={36} value={project} onChange={e=>setProject(e.target.value)} placeholder="Your public project ID"/></label><p className="field-help">Use the same project on all your devices. No API key belongs here.</p>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" type="submit">Connect my space <ArrowRight size={17}/></button></form><details className="setup-help"><summary>First-time setup</summary><ol><li>Create a project in <a href="https://cloud.appwrite.io" target="_blank" rel="noreferrer">Appwrite Cloud</a>, or on your own Appwrite server.</li><li>Add a Web platform with hostname <code>angel-dot-exe.github.io</code>.</li><li>Follow the <a href="https://github.com/angel-dot-exe/steady-tracker#backend-setup" target="_blank" rel="noreferrer">backend setup instructions</a> to create the private table.</li><li>Copy the endpoint and project ID here, then create your tracker account.</li></ol></details><p className="field-help">Already using the original tracker? <a href="https://steady-personal-tracker-angel.ashishndiitr.chatgpt.site">Open your existing synced space</a>.</p></Frame>;
}
function Connected({config}:{config:BackendConfig}){
 const backend=useMemo(()=>connect(config),[config]);
 const integrations=useMemo(()=>integrationService(backend.client),[backend]);
 const [user,setUser]=useState<Models.User<Models.Preferences>|null>(null),[loading,setLoading]=useState(true),[authError,setAuthError]=useState('');
 useEffect(()=>{let cancelled=false;backend.account.get().then(u=>{if(!cancelled)setUser(u)}).catch(err=>{if(!cancelled&&err.code!==401)setAuthError(err.message)}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[backend]);
 const store=useMemo(()=>user?createStore(backend.db,user.$id):null,[backend,user]);
 if(loading)return <Frame><p className="auth-description" role="status">Opening your space…</p></Frame>;
 if(user&&store)return <Tracker integrations={integrations} key={user.$id} userKey={`${config.project}-${user.$id}`} store={store} onSignOut={async()=>{await backend.account.deleteSession({sessionId:'current'});setUser(null)}}/>;
 return <SignIn account={backend.account} initialError={authError} onSignedIn={setUser}/>;
}
function SignIn({account,initialError,onSignedIn}:{account:ReturnType<typeof connect>['account'];initialError:string;onSignedIn:(u:Models.User<Models.Preferences>)=>void}){
 const [signup,setSignup]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(initialError);
 return <Frame><p className="eyebrow">A SOFT LANDING FOR YOUR DAY</p><h1>{signup?'Make a little space.':'Welcome to your space.'}</h1><p className="auth-description">{signup?'Create one account for your laptop, phone, and iPad.':'Sign in to pick up right where you left off.'}</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{if(signup){await account.create({userId:ID.unique(),email,password});setSignup(false)}await account.createEmailPasswordSession({email,password});onSignedIn(await account.get());setPassword('')}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}><label>Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required minLength={8} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={busy}>{busy?'Opening your space…':signup?'Create my account':'Sign in'}<ArrowRight size={17}/></button></form><button className="text-button" disabled={busy} onClick={()=>{setSignup(!signup);setError('')}}>{signup?'Already have an account? Sign in':'New here? Create an account'}</button><p className="auth-privacy"><CloudCheck size={18}/> Your items are private to your account.</p></Frame>;
}
