import {getStore} from '@netlify/blobs';
import type {Context, Config} from '@netlify/functions';
import {menu} from '../../lib/menu';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validId=(id:unknown)=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export default async function handler(req:Request, context:Context){
 const store=getStore({name:'layl-data',consistency:'strong'});
 const secret=Netlify.env.get('STAFF_PASSWORD')||'';
 const mac=async(value:string)=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))).toString('hex')};
 const staff=async()=>{const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)layl_staff=([^;]+)/)?.[1];if(!secret||!cookie)return false;const [exp,sig]=cookie.split('.');return Number(exp)>Date.now()&&sig===await mac(exp)};
 const increment=async(key:string,windowMs=0)=>{for(let n=0;n<20;n++){const old=await store.getWithMetadata(key,{type:'json'});const data={count:old&&(!windowMs||old.data.expires>Date.now())?old.data.count+1:1,expires:old&&old.data.expires>Date.now()?old.data.expires:Date.now()+windowMs};const result=await store.setJSON(key,data,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(result.modified)return data.count}throw new Error('Concurrent update limit')};
 const clean=(row:any)=>{const {token,...result}=row;return result};
 const url=new URL(req.url), path=url.pathname, method=req.method;
 try{
 if(!['GET','HEAD'].includes(method)&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return json({error:'طلب غير مسموح'},403);
 if(path==='/api/session'){
  if(method==='GET')return json({authenticated:await staff()});
  if(method==='DELETE')return new Response('{}',{headers:{'Set-Cookie':'layl_staff=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0','Cache-Control':'no-store'}});
  if(method==='POST'){
   if(!secret)return json({error:'دخول الكاشير غير مهيأ'},503);
   if(await increment('limits/login/'+context.ip,900000)>10)return json({error:'محاولات كثيرة. حاول بعد ١٥ دقيقة.'},429);
   const b=await req.json() as any;if(b.password!==secret)return json({error:'كلمة المرور غير صحيحة'},401);
   const exp=String(Date.now()+43200000);return new Response(JSON.stringify({authenticated:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`layl_staff=${exp}.${await mac(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`}});
  }
 }
 if(path==='/api/orders'){
  if(method==='GET'){const id=url.searchParams.get('id'),token=url.searchParams.get('token');if(!validId(id)||!validId(token))return json({error:'بيانات الطلب ناقصة'},400);const row=await store.get('orders/'+id,{type:'json'});return row&&row.token===token?json(clean(row)):json({error:'الطلب غير موجود'},404)}
  if(method==='POST'){
   const raw=await req.text();if(raw.length>15000)return json({error:'الطلب كبير جدًا'},400);let b:any;try{b=JSON.parse(raw)}catch{return json({error:'بيانات غير صالحة'},400)}
   if(!validId(b.id)||!validId(b.token)||!Number.isInteger(b.tableNumber)||b.tableNumber<1||b.tableNumber>20)return json({error:'امسح رمز الطاولة الصحيح'},400);
   const prior=await store.get('orders/'+b.id,{type:'json'});if(prior)return prior.token===b.token?json(clean(prior)):json({error:'تعارض الطلب'},409);
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>50||typeof b.note!=='string'||b.note.length>500)return json({error:'تحقق من الطلب'},400);
   const items=[];for(const line of b.items){const item=menu.find(m=>m.id===line.id);if(!item||item.unavailable||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20||typeof line.note!=='string'||line.note.length>250)return json({error:'تحقق من الأصناف والكميات'},400);items.push({id:item.id,name:(['موهيتو','سموذي','ميلك شيك'].includes(item.category)?item.category+' ':'')+item.name,price:item.price,quantity:line.quantity,note:line.note})}
   if(await increment('limits/orders/'+context.ip,60000)>30)return json({error:'انتظر دقيقة ثم أعد المحاولة'},429);
   const row={id:b.id,token:b.token,number:await increment('counter/orders'),tableNumber:b.tableNumber,items,total:items.reduce((sum,item)=>sum+item.price*item.quantity,0),note:b.note,status:'new',createdAt:Date.now()};
   const result=await store.setJSON('orders/'+b.id,row,{onlyIfNew:true});const saved=result.modified?row:await store.get('orders/'+b.id,{type:'json'});return saved.token===b.token?json(clean(saved),result.modified?201:200):json({error:'تعارض الطلب'},409);
  }
 }
 if(path==='/api/staff'){
  if(!await staff())return json({error:'يرجى تسجيل الدخول'},401);
  if(method==='GET'){const {blobs}=await store.list({prefix:'orders/'});const orders=[];for(let i=0;i<blobs.length;i+=20){const rows=await Promise.all(blobs.slice(i,i+20).map(b=>store.get(b.key,{type:'json'})));orders.push(...rows.filter(r=>r&&(r.createdAt>Date.now()-604800000||['new','preparing','ready'].includes(r.status))).map(clean))}return json({orders:orders.sort((a,b)=>b.createdAt-a.createdAt).slice(0,500)})}
  if(method==='PATCH'){const b=await req.json() as any;const allowed:Record<string,string[]>={new:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['completed']};if(!validId(b.id)||!allowed[b.from]?.includes(b.status))return json({error:'تغيير الحالة غير مسموح'},400);const row=await store.getWithMetadata('orders/'+b.id,{type:'json'});if(!row||row.data.status!==b.from)return json({error:'تم تحديث الطلب، أعد تحميله'},409);const result=await store.setJSON('orders/'+b.id,{...row.data,status:b.status},{onlyIfMatch:row.etag});return result.modified?json({ok:true}):json({error:'تم تحديث الطلب، أعد تحميله'},409)}
 }
 return json({error:'غير موجود'},404);
 }catch(error){console.error(error);return json({error:'تعذّر الاتصال. حاول مجددًا.'},503)}
}
export const config:Config={path:['/api/orders','/api/staff','/api/session']};
