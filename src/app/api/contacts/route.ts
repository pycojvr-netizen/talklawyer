import { NextRequest } from "next/server";
import { z } from "zod";
import { handle,apiSession,dbError ,readJson} from "@/lib/api";
import { contactSchema,uuid } from "@/lib/validation";
export async function POST(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=contactSchema.parse(await readJson(r));const {data,error}=await s.db.rpc("create_contact",{lawyer:v.lawyer_id,title:v.subject,details:v.description});dbError(error);return data;});}
export async function PATCH(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=z.object({id:uuid,decision:z.enum(["accepted","rejected","closed"])}).parse(await readJson(r));const {error}=await s.db.rpc("decide_contact",{request:v.id,decision:v.decision});dbError(error);return true;});}
