import { test,expect,vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/session",()=>({session:vi.fn()}));
import { readJson,handle,HttpError } from "../src/lib/api";
import { securityPolicy,trustedAvatar } from "../src/lib/security";
import { safeNext } from "../src/lib/validation";
import { suggestArea,matchingLawyers,matchingExplanation } from "../src/lib/lawyer-matching";
import type { Lawyer } from "../src/lib/types";
function request(body:string) {return new NextRequest("http://localhost:3000/api/profile",{method:"POST",headers:{"content-type":"application/json"},body});}

test("CSP de produção não permite script inline/eval, wildcard ou host falso",()=>{
 const policy=securityPolicy("abcdefghijklmnopqrstuvwxyz123456","https://project.supabase.co");
 const scripts=policy.split(";").map(x=>x.trim()).find(x=>x.startsWith("script-src"))!;
 expect(scripts).toContain("'strict-dynamic'");expect(scripts).toContain("'nonce-");expect(scripts).not.toContain("unsafe-inline");expect(scripts).not.toContain("unsafe-eval");
 expect(policy).toContain("https://project.supabase.co wss://project.supabase.co");expect(policy).not.toContain("*.supabase");
 expect(()=>securityPolicy("<script>alert(1)</script>",undefined)).toThrow();
 expect(securityPolicy("abcdefghijklmnopqrstuvwxyz123456","javascript:alert(1)")).not.toContain("javascript:");
});
test("avatares só carregam do bucket público deste projeto, sem credenciais",()=>{
 const origin="https://project.supabase.co";
 const good=origin+"/storage/v1/object/public/avatars/id/image.png";
 expect(trustedAvatar(good,origin)).toBe(good);
 for(const url of ["https://tracker.example/a.png","javascript:alert(1)","data:image/svg+xml,<svg/>",origin+"/storage/v1/object/public/documents/secret.pdf","https://user:pass@project.supabase.co/storage/v1/object/public/avatars/a.png"])expect(trustedAvatar(url,origin)).toBe("");
});
test("redirect rejeita controles, separadores codificados e URL externa",()=>{
 for(const value of ["//evil.example","/\\evil.example","/\t/evil.example","/%2fevil.example","/%5cevil.example","/%252f%252fevil.example","/\n/evil.example"])expect(safeNext(value)).toBe("/dashboard");
 expect(safeNext("/dashboard/messages?tab=recent")).toBe("/dashboard/messages?tab=recent");
});
test("corpo é limitado por bytes mesmo sem Content-Length; JSON malformado é 400",async()=>{
 await expect(readJson(request(JSON.stringify({message:"é".repeat(20)})),30)).rejects.toMatchObject({status:413});
 for(const text of ["{","null","[]","12"])await expect(readJson(request(text))).rejects.toMatchObject({status:400});
 await expect(readJson(request('{"kind":"profile"}'))).resolves.toEqual({kind:"profile"});
});
test("corpo cancelado não mantém uma leitura aberta",async()=>{
 const r=request('{"kind":"profile"}');const controller=new AbortController();
 Object.defineProperty(r,"signal",{value:controller.signal});controller.abort();
 await expect(readJson(r)).rejects.toMatchObject({status:408});
});
test("erros não são cacheados e não revelam stack ou credencial",async()=>{
 const known=await handle(async()=>{throw new HttpError(403,"Acesso negado.");});expect(known.headers.get("cache-control")).toBe("private, no-store");
 const secret=await handle(async()=>{throw new Error("secret-api-key stack trace");});expect(secret.status).toBe(503);expect(await secret.text()).not.toContain("secret-api-key");expect(secret.headers.get("x-content-type-options")).toBe("nosniff");
});
test("triagem não envia dados e não escolhe arbitrariamente entre áreas",()=>{
 expect(suggestArea("Fui demitido e preciso conversar sobre minha rescisão")).toBe("Trabalhista");
 expect(suggestArea("Preciso tratar de um divórcio")).toBe("Família e Sucessões");
 expect(suggestArea("Tenho um divórcio e uma demissão")).toBe("");
 expect(suggestArea("Preciso de ajuda")).toBe("");
});
test("indicação exclui não aprovados, indisponíveis, áreas diferentes e IDs inválidos",()=>{
 const good={user_id:"00000000-0000-4000-8000-000000000003",display_name:"Profissional real",verification_status:"approved",available:true,areas:["Trabalhista"],city:"Porto Alegre",state:"RS"} as Lawyer;
 const found=matchingLawyers([good,{...good,verification_status:"pending"},{...good,available:false},{...good,areas:["Civil"]},{...good,user_id:"inventado"}],"Trabalhista");
 expect(found).toEqual([good]);expect(matchingExplanation(found,"Trabalhista",true)).toContain("a confirmar");
 expect(matchingExplanation([],"Civil",false)).toContain("não criei perfis");
});
