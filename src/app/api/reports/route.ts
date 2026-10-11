import { NextRequest } from "next/server";
import { handle,apiSession,dbError ,readJson} from "@/lib/api";
import { reportSchema } from "@/lib/validation";
export async function POST(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=reportSchema.parse(await readJson(r));const {error}=await s.db.from("reports").insert({...v,reporter_id:s.user.id});dbError(error);return true;});}
