'use strict';
const ws=new WebSocket(process.argv[2]);let id=1;const pending=new Map();
function send(method,params){return new Promise((res,rej)=>{const n=id++;pending.set(n,{res,rej});ws.send(JSON.stringify({id:n,method,params:params||{}}));});}
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
ws.addEventListener('open',async()=>{try{await send('Runtime.enable');const r=await send('Runtime.evaluate',{expression:process.argv[3],awaitPromise:true,returnByValue:true,userGesture:true});console.log(JSON.stringify(r.exceptionDetails||r.result.value,null,2));}catch(e){console.error(e);process.exitCode=1;}finally{ws.close();}});
