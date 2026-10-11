import React from 'react';
import {createRoot} from 'react-dom/client';
import Menu from '../app/menu-app';
import Cashier from '../app/cashier/page';
import Tables from '../app/tables/page';
import '../app/globals.css';
const path=location.pathname.replace(/\/$/,'')||'/';
const table=Number(new URLSearchParams(location.search).get('table'));
const validTable=Number.isInteger(table)&&table>=1&&table<=20;
// Preserve existing printed QR cards.
if(path==='/'&&validTable)location.replace('/menu'+location.search);
const Page=path==='/cashier'?Cashier:path==='/menu'&&validTable?Menu:path==='/'||path==='/tables'||path==='/menu'?Tables:()=> <main className="page-shell"><h1>الصفحة غير موجودة</h1><a href="/">رجوع إلى الطاولات</a></main>;
createRoot(document.getElementById('root')!).render(<Page/>);
