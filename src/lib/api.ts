import "server-only";
import { NextRequest,NextResponse } from "next/server";
import { ZodError } from "zod";
import { session } from "./session";
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export async function apiSession(request:NextRequest) {
 if (!["GET","HEAD"].includes(request.method)) {
 const expected=new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
 if(request.headers.get("origin")!==expected) throw new HttpError(403,"Origem não autorizada.");
 if(request.headers.get("sec-fetch-site")==="cross-site") throw new HttpError(403,"Origem não autorizada.");
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json") throw new HttpError(415,"Envie os dados como JSON.");
 }
 const s=await session();if(!s) throw new HttpError(401,"Entre na sua conta para continuar.");return s;
}
export function dbError(error:{message:string;code?:string}|null) { if(error) { const known=["Solicitação já existente","Limite de solicitações","Limite de mensagens","Contato não autorizado","Conversa não autorizada","Perfil indisponível","Acesso negado","Documento não autorizado"];const safe=known.find(x=>error.message.includes(x));throw new HttpError(error.code==="23505"?409:400,safe || "Não foi possível concluir a operação. Confira os dados e permissões.");} }
export async function readJson(request:NextRequest,limit=32768):Promise<Record<string,unknown>> {
 if(Number(request.headers.get("content-length"))>limit)throw new HttpError(413,"A mensagem é muito grande.");
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,"JSON inválido.");
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(10000)]);
 const cancel=()=>{void reader.cancel().catch(()=>undefined);};
 signal.addEventListener("abort",cancel,{once:true});
 let raw="",size=0;const decoder=new TextDecoder("utf-8",{fatal:true});
 try {
  while(true){signal.throwIfAborted();const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,"A mensagem é muito grande.");}raw+=decoder.decode(value,{stream:true});}
  const parsed:unknown=JSON.parse(raw+decoder.decode());
  if(!parsed || typeof parsed!=="object" || Array.isArray(parsed))throw new HttpError(400,"JSON inválido.");
  return parsed as Record<string,unknown>;
 }catch(error){if(error instanceof HttpError)throw error;if(signal.aborted)throw new HttpError(408,"Tempo de envio excedido ou requisição interrompida.");throw new HttpError(400,"JSON inválido.");}
 finally{signal.removeEventListener("abort",cancel);reader.releaseLock();}
}
export async function handle(fn:()=>Promise<unknown>) {
 let response:NextResponse;
 try{response=NextResponse.json({data:await fn()});}catch(e){if(e instanceof ZodError)response=NextResponse.json({error:e.issues[0]?.message || "Dados inválidos."},{status:422});else if(e instanceof HttpError)response=NextResponse.json({error:e.message},{status:e.status});else response=NextResponse.json({error:"O serviço não está disponível. Confira a configuração e tente novamente."},{status:503});}
 response.headers.set("Cache-Control","private, no-store");response.headers.set("X-Content-Type-Options","nosniff");return response;
}
