import "server-only";
import { redirect } from "next/navigation";
import { configured,supabaseServer } from "./supabase/server";
import type { Profile } from "./types";
export async function session() {
 if (!configured()) return null;
 const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();
 if(!user) return null;
 const {data:profile}=await db.from("profiles").select("*").eq("id",user.id).single();
 if(!profile || profile.disabled_at) return null;
 const {data:isAdmin}=await db.rpc("is_admin");
 return {db,user,profile:profile as Profile,isAdmin:!!isAdmin};
}
export async function requireSession() { const s=await session();if(!s) redirect("/auth?mode=login");return s; }
