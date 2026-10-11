import { NextRequest } from "next/server";
import { apiSession, handle, HttpError, readJson } from "@/lib/api";
import { assistantSchema, CAREER_SOURCE } from "@/lib/assistant";
import { generateAnswer, safeGeminiError } from "@/lib/gemini";
import { projectTask, explainPrivateCases } from "@/lib/assistant-privacy";
import type { Lawyer } from "@/lib/types";
import { suggestArea, matchingLawyers, matchingExplanation } from "@/lib/lawyer-matching";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let retryAfter = 0;
  const response = await handle(async () => {
    const s = await apiSession(request);
    const {data:lease,error:limitError} = await s.db.rpc("claim_ai_request");
    if (limitError || !lease) {
      const match = limitError?.message.match(/^AI_(?:RATE_LIMIT|BUSY):(15|60|86400)$/);
      if (match) { retryAfter = Number(match[1]); throw new HttpError(429, "Limite de uso ou de respostas simultâneas atingido. Aguarde antes de tentar novamente."); }
      throw new HttpError(503, "A proteção de uso da IA aguarda configuração no servidor.");
    }
    try {
    const input = assistantSchema.parse(await readJson(request,131072));
    const question=input.messages.at(-1)!.content;
    const task = projectTask(s.profile.role, question);
    const area = input.area || (task.intent!=="processos" ? suggestArea(question) : "");
    const [{data:found,error:lawyerError}, {data:cases,error:caseError}] = await Promise.all([
      s.db.rpc("search_lawyers", { query: "", city_filter: input.city, state_filter: input.state, area_filter: area, page_number: 1 }),
      s.db.from("case_records").select("movement,movement_date").eq("owner_id", s.user.id).order("updated_at", {ascending:false}).limit(4),
    ]);
    const lawyers: Lawyer[] = lawyerError ? [] : matchingLawyers(found || [],area);
    let answer: string;
    if (task.intent === "processos") answer = explainPrivateCases(caseError ? [] : cases || [], !caseError);
    else {
      try { answer = await generateAnswer(task, request.signal); }
      catch (error) { const safe = safeGeminiError(error); retryAfter = safe.retryAfter; throw new HttpError(safe.status, safe.message); }
      answer += "\n\nPara proteger seus dados, respondi somente ao tema genérico identificado; sua mensagem e seu histórico não foram enviados ao Gemini.";
    }
    if (lawyerError) answer += "\n\nA busca de profissionais está indisponível agora; não foram gerados perfis substitutos.";
    else if(task.intent!=="processos") answer += "\n\n"+matchingExplanation(lawyers,area,!input.area && !!area);
    return { answer, lawyers, recommendedArea:area, caseRecordsAvailable: !caseError, careerSource: s.profile.role === "lawyer" ? CAREER_SOURCE : null };
    } finally {
      // Failed calls also consume quota. A lost connection expires the lease.
      try { await s.db.rpc("release_ai_request", {token:lease}); } catch { /* Lease expires after 90 seconds. */ }
    }
  });
  response.headers.set("Cache-Control", "private, no-store");
  if (response.status === 429) response.headers.set("Retry-After", String(retryAfter || 60));
  return response;
}
