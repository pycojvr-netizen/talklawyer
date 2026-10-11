import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE_URL||'http://localhost:3000';
const results=[];
for(const [path,text] of [['/','reference-home.png'],['/auth?mode=signup','Crie sua conta'],['/lawyers','Profissionais do Direito'],['/terms','Termos de uso'],['/privacy','Política de privacidade']]){
 const r=await fetch(base+path);assert.equal(r.status,200,path);assert.match(await r.text(),new RegExp(text));assert.equal(r.headers.get('x-frame-options'),'DENY');results.push(`${path}: 200`);
}
const protectedResponse=await fetch(base+'/dashboard',{redirect:'manual'});assert.equal(protectedResponse.status,307);assert.ok(protectedResponse.headers.get('location')?.startsWith('/auth'));results.push('/dashboard: 307 sem sessão');
const manifest=await fetch(base+'/manifest.webmanifest');assert.equal(manifest.status,200);assert.equal((await manifest.json()).name,'Talklawyer');results.push('/manifest.webmanifest: 200');
const correctOrigin=await fetch(base+'/api/contacts',{method:'POST',headers:{Origin:new URL(base).origin,'Content-Type':'application/json'},body:'{}'});assert.equal(correctOrigin.status,401);results.push('API sem sessão: 401');
const foreignOrigin=await fetch(base+'/api/admin',{method:'POST',headers:{Origin:'https://external.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(foreignOrigin.status,403);results.push('API origem externa: 403');
console.log(results.join('\n'));
const home=await fetch(base+'/');const html=await home.text();const csp=home.headers.get('content-security-policy')||'';
const nonce=csp.match(/'nonce-([^']+)'/)?.[1];assert.ok(nonce,'CSP exige nonce');
const scripts=csp.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src'));
assert.ok(scripts&&!scripts.includes('unsafe-inline')&&!scripts.includes('unsafe-eval'),'scripts de produção sem bypass');
for(const script of html.matchAll(/<script\b([^>]*)>/g))assert.ok(script[1].includes(`nonce="${nonce}"`),'script recebe nonce da resposta');
const again=await fetch(base+'/');assert.notEqual(again.headers.get('content-security-policy'),csp,'nonce novo por resposta');
const ai=await fetch(base+'/api/assistant',{method:'POST',headers:{Origin:new URL(base).origin,'Content-Type':'application/json'},body:'{}'});assert.equal(ai.status,401);assert.match(ai.headers.get('cache-control')||'',/no-store/);
console.log('CSP dinâmica e nonce por resposta: OK\nChat IA sem sessão: 401 e no-store');
