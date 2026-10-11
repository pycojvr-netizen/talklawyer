import { NextRequest } from "next/server";
import { z } from "zod";
import { handle,apiSession,dbError ,readJson} from "@/lib/api";
export async function POST(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=z.object({kind:z.enum(["access","correction","deletion","portability"]),details:z.string().trim().min(10).max(2000)}).parse(await readJson(r));const {error}=await s.db.from("privacy_requests").insert({...v,user_id:s.user.id});dbError(error);return true;});}
