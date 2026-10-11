import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const records=new Map();let version=0;
globalThis.testStore={
 async get(key){return structuredClone(records.get(key)?.data??null)},
 async getWithMetadata(key){return structuredClone(records.get(key)??null)},
 async setJSON(key,data,options={}){const old=records.get(key);if((options.onlyIfNew&&old)||(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch))return {modified:false};records.set(key,{data:structuredClone(data),etag:String(++version)});return {modified:true}},
 async list({prefix}){return {blobs:[...records.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}}};
const source=readFileSync('netlify/functions/api.mts','utf8').replace("import {getStore} from '@netlify/blobs';","const getStore=()=>globalThis.testStore;").replace("import {menu} from '../../lib/menu';","const menu=[{id:'m0-0',name:'Food',price:17,category:'Food'},{id:'unavailable',price:10,unavailable:true}];");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
process.env.STAFF_PASSWORD='test-secret';
globalThis.Netlify={env:{get:key=>process.env[key]}};
let cookie='';const call=(path,method='GET',body,auth=false,origin='https://layl-menu.netlify.app')=>handler(new Request('https://layl-menu.netlify.app/api/'+path,{method,headers:{origin,...(auth?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),{ip:'test'});
assert.equal((await call('staff')).status,401);
assert.equal((await call('session','POST',{password:'bad'})).status,401);
const login=await call('session','POST',{password:'test-secret'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
const order={id:crypto.randomUUID(),token:crypto.randomUUID(),tableNumber:7,items:[{id:'m0-0',quantity:2,note:''}],note:''};
assert.equal((await call('orders','POST',{...order,tableNumber:0})).status,400);
assert.equal((await call('orders','POST',order,false,'https://other.example')).status,403);
const results=await Promise.all([call('orders','POST',order),call('orders','POST',order)]);assert.ok(results.every(r=>[200,201].includes(r.status)));
assert.equal((await results[0].json()).total,34);assert.equal([...records.keys()].filter(k=>k.startsWith('orders/')).length,1);
assert.equal((await call('orders?id='+order.id+'&token='+crypto.randomUUID())).status,404);
assert.equal((await call('orders?id='+order.id+'&token='+order.token)).status,200);
assert.equal((await (await call('staff','GET',null,true)).json()).orders.length,1);
const updates=await Promise.all(['preparing','cancelled'].map(status=>call('staff','PATCH',{id:order.id,from:'new',status},true)));assert.deepEqual(updates.map(r=>r.status).sort(),[200,409]);
console.log('Passed: authentication, origin protection, validation, server pricing, concurrent idempotency, private tracking, concurrent status transitions.');
