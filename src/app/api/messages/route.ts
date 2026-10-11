import { z } from "zod";
import { NextRequest } from "next/server";
import { handle,apiSession,dbError ,readJson} from "@/lib/api";
import { messageSchema,uuid } from "@/lib/validation";
export async function GET(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const id=uuid.parse(r.nextUrl.searchParams.get("conversation"));const before=r.nextUrl.searchParams.get("before");let q=s.db.from("messages").select("*").eq("conversation_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50);if(before){const time=z.iso.datetime({offset:true}).parse(before);const beforeId=uuid.parse(r.nextUrl.searchParams.get("before_id"));q=q.or(`created_at.lt.${time},and(created_at.eq.${time},id.lt.${beforeId})`);}const {data,error}=await q;dbError(error);return data;});}
export async function POST(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=messageSchema.parse(await readJson(r));const {data,error}=await s.db.rpc("send_message",{conversation:v.conversation_id,content:v.body});dbError(error);return data;});}
export async function PATCH(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const id=uuid.parse((await readJson(r)).conversation_id);const {error}=await s.db.rpc("mark_read",{conversation:id});dbError(error);return true;});}
