import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { securityPolicy } from "@/lib/security";
export async function proxy(request:NextRequest) {
 const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
 const policy=securityPolicy(nonce,process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NODE_ENV==="development");
 const requestHeaders=new Headers(request.headers);
 // Overwrite client-supplied CSP/nonce instead of trusting forwarded headers.
 requestHeaders.set("x-nonce",nonce);requestHeaders.set("Content-Security-Policy",policy);
 const makeResponse=()=>{const next=NextResponse.next({request:{headers:requestHeaders}});next.headers.set("Content-Security-Policy",policy);next.headers.set("Cache-Control","private, no-store");return next;};
 let response=makeResponse();
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return response;
 const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(values)=>{values.forEach(({name,value})=>request.cookies.set(name,value));requestHeaders.set("cookie",request.cookies.toString());response=makeResponse();values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 await db.auth.getUser();
 response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:["/((?!_next/static|_next/image|media/|favicon.ico|icon.svg|manifest.webmanifest).*)"]};
