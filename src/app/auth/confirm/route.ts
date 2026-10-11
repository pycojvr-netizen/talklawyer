import { NextRequest,NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(r:NextRequest){const token_hash=r.nextUrl.searchParams.get("token_hash");const type=r.nextUrl.searchParams.get("type");if(token_hash && ["signup","recovery","email"].includes(type || "")){const db=await supabaseServer();const {error}=await db.auth.verifyOtp({token_hash,type:type as EmailOtpType});if(!error)return NextResponse.redirect(new URL(type==="recovery"?"/auth?mode=update":"/dashboard",r.url));}return NextResponse.redirect(new URL("/auth?mode=login&error=link",r.url));}
