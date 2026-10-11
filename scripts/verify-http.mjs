import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
const base='http://127.0.0.1:3010';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3010'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SITE_URL:base}});
let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
try{
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(base);if(r.status===200){ready=true;break;}}catch{}await setTimeout(100);}
 if(!ready)throw Error('Servidor não iniciou: '+output);
 const child=spawn(process.execPath,['scripts/smoke.mjs'],{stdio:'inherit',env:{...process.env,SMOKE_BASE_URL:base}});
 const code=await new Promise(resolve=>child.on('exit',resolve));if(code!==0)throw Error('Smoke falhou');
}finally{server.kill('SIGTERM');}
