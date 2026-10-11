import { NextRequest,NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export async function GET(r:NextRequest){const code=r.nextUrl.searchParams.get("code");if(code){const db=await supabaseServer();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNext(r.nextUrl.searchParams.get("next")),r.url));}return NextResponse.redirect(new URL("/auth?mode=login&error=link",r.url));}
