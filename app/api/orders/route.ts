import {menu} from '@/lib/menu';
import {db,json,sameOrigin,serialize,limited} from '@/lib/server';
export async function POST(req:Request){try{
if(!sameOrigin(req))return json({error:'طلب غير مسموح'},403);
const raw=await req.text();if(raw.length>15000)return json({error:'الطلب كبير جدًا'},400);const body=JSON.parse(raw);
if(!Number.isInteger(body.tableNumber)||body.tableNumber<1||body.tableNumber>20)return json({error:'امسح رمز الطاولة الصحيح لإرسال طلبك'},400);
if(typeof body.id!=='string'||!/^[-a-f0-9]{36}$/.test(body.id)||typeof body.token!=='string'||!/^[-a-f0-9]{36}$/.test(body.token))return json({error:'بيانات الطلب غير صالحة'},400);
const previous=await db().prepare('SELECT * FROM orders WHERE id=?').bind(body.id).first();if(previous){if(previous.token!==body.token)return json({error:'تعارض الطلب'},409);return json(serialize(previous))}
if(!Array.isArray(body.items)||!body.items.length||body.items.length>50)return json({error:'أضف أصنافًا إلى الطلب'},400);
const items=[];for(const line of body.items){const item=menu.find(m=>m.id===line.id);if(!item||item.unavailable||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20||typeof line.note!=='string'||line.note.length>250)return json({error:'تحقق من الأصناف والكميات'},400);items.push({id:item.id,name:(['موهيتو','سموذي','ميلك شيك'].includes(item.category)?item.category+' ':'')+item.name,price:item.price,quantity:line.quantity,note:line.note})}
if(typeof body.note!=='string'||body.note.length>500)return json({error:'الملاحظة طويلة جدًا'},400);
const ip=req.headers.get('cf-connecting-ip')||'local';if(await limited('orders:'+ip,30,60000))return json({error:'طلبات كثيرة. انتظر دقيقة ثم أعد المحاولة.'},429);
const total=items.reduce((s,i)=>s+i.price*i.quantity,0);await db().prepare('INSERT INTO orders (id,token,table_number,items,total,note,status,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(body.id,body.token,body.tableNumber,JSON.stringify(items),total,body.note,'new',Date.now()).run();const row=await db().prepare('SELECT * FROM orders WHERE id=?').bind(body.id).first();if(!row||row.token!==body.token)return json({error:'تعارض الطلب'},409);return json(serialize(row),201)
}catch(e){console.error(e);return json({error:'تعذّر إرسال الطلب. سلتك محفوظة، حاول مجددًا.'},503)}}
export async function GET(req:Request){try{const u=new URL(req.url);const id=u.searchParams.get('id'),token=u.searchParams.get('token');if(!id||!token)return json({error:'بيانات الطلب ناقصة'},400);const row=await db().prepare('SELECT * FROM orders WHERE id=? AND token=?').bind(id,token).first();if(!row)return json({error:'الطلب غير موجود'},404);return json(serialize(row))}catch(e){console.error(e);return json({error:'تعذّر تحديث حالة الطلب'},503)}}
