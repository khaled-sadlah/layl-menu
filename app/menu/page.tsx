'use client';
import {useEffect,useState} from 'react';
import Menu from '../menu-app';
export default function Page(){const [valid,setValid]=useState(false);useEffect(()=>{const n=Number(new URLSearchParams(location.search).get('table'));if(Number.isInteger(n)&&n>=1&&n<=20)setValid(true);else location.replace('/')},[]);return valid?<Menu/>:null}
