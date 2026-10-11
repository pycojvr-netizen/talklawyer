import { NextRequest } from "next/server";
import { handle,apiSession,dbError,HttpError ,readJson} from "@/lib/api";
import { lawyerSchema,profileSchema } from "@/lib/validation";
export async function PATCH(r:NextRequest){return handle(async()=>{const s=await apiSession(r);const body=await readJson(r);if(body.kind==="lawyer"){if(s.profile.role!=="lawyer")throw new HttpError(403,"Acesso negado.");const value=lawyerSchema.parse(body.value);const {error}=await s.db.from("lawyer_profiles").update(value).eq("user_id",s.user.id);dbError(error);}else{const value=profileSchema.parse(body.value);const {error}=await s.db.from("profiles").update(value).eq("id",s.user.id);dbError(error);}return true;});}
