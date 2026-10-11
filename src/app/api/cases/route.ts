import { NextRequest } from "next/server";
import { apiSession, handle, HttpError, readJson } from "@/lib/api";
import { caseSchema } from "@/lib/assistant";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const s = await apiSession(request);
    const {data,error} = await s.db.from("case_records").select("*").eq("owner_id",s.user.id).order("updated_at",{ascending:false}).limit(100);
    if(error) throw new HttpError(503,"Os registros de processos ainda não estão disponíveis. A configuração precisa ser concluída pelo responsável pela plataforma.");
    return data;
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const s = await apiSession(request);
    const value = caseSchema.parse(await readJson(request));
    const {data,error} = await s.db.from("case_records").insert({...value,owner_id:s.user.id}).select("*").single();
    if(error) throw new HttpError(503,"Não foi possível salvar o andamento. Confira a configuração dos registros de processos.");
    return data;
  });
}
