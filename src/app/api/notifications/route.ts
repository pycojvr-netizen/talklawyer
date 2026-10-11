import { NextRequest } from "next/server";
import { handle,apiSession,dbError } from "@/lib/api";
export async function GET(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const {data,error}=await s.db.rpc("notification_counts");dbError(error);return data;});}
