import { NextRequest } from "next/server";
import { z } from "zod";
import { handle,apiSession,dbError,HttpError ,readJson} from "@/lib/api";
import { uuid } from "@/lib/validation";
export async function POST(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const v=z.object({document_id:uuid,recipient_id:uuid,remove:z.boolean()}).parse(await readJson(r));const {error}=await s.db.rpc("share_document",{doc:v.document_id,recipient:v.recipient_id,remove_share:v.remove});dbError(error);return true;});}
export async function GET(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const id=uuid.parse(r.nextUrl.searchParams.get("id"));const {data:doc,error}=await s.db.from("documents").select("*").eq("id",id).single();dbError(error);if(!doc)throw new HttpError(404,"Documento não encontrado.");const {data,error:e}=await s.db.storage.from("documents").createSignedUrl(doc.storage_path,60,{download:doc.name});dbError(e);return data;});}
