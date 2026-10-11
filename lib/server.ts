import {env} from 'cloudflare:workers';
export function db(){const d=(env as unknown as {DB:D1Database}).DB;if(!d)throw new Error('Database unavailable');return d}
function secret(){return (env as unknown as {STAFF_PASSWORD?:string}).STAFF_PASSWORD||''}
export function staffPassword(){return secret()}
async function mac(value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret()),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return Array.from(new Uint8Array(signed)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function createSession(){const exp=String(Date.now()+12*60*60*1000);return exp+'.'+await mac(exp)}
export async function isStaff(req:Request){if(!secret())return false;const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)layl_staff=([^;]+)/)?.[1];if(!cookie)return false;const [exp,sig]=cookie.split('.');return Number(exp)>Date.now()&&sig===await mac(exp)}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function limited(key:string,max:number,windowMs:number){const now=Date.now();await db().prepare('INSERT INTO attempts (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires < ? THEN 1 ELSE count+1 END, expires=CASE WHEN expires < ? THEN ? ELSE expires END').bind(key,now+windowMs,now,now,now+windowMs).run();const row=await db().prepare('SELECT count FROM attempts WHERE key=?').bind(key).first<{count:number}>();return (row?.count||0)>max}
export function serialize(r:Record<string,unknown>){return {id:r.id,number:r.number,tableNumber:r.table_number,items:JSON.parse(String(r.items)),total:r.total,note:r.note,status:r.status,createdAt:r.created_at}}
