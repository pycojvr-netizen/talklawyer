import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { providerPrompt, type SafeTask } from "./assistant-privacy";

export class GeminiError extends Error {
  constructor(public status: number, message: string, public retryAfter = 0) { super(message); }
}
let verified: { key: string; model: string; until: number } | undefined;
export function geminiConfig() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  if (!key) throw new GeminiError(503, "A IA aguarda configuração no servidor.");
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw new GeminiError(503, "O modelo de IA precisa ser configurado no servidor.");
  return { key, model };
}
export function safeGeminiError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error;
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  if (status === 429) return new GeminiError(429, "A cota da IA foi atingida. Aguarde antes de tentar novamente.", 60);
  if (status === 404) return new GeminiError(503, "O modelo de IA não está disponível para esta configuração. Avise o administrador.");
  if (status === 401 || status === 403) return new GeminiError(503, "O acesso à IA precisa ser conferido no servidor.");
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError") || status === 408 || status === 504) return new GeminiError(504, "A IA excedeu o tempo de resposta. Tente novamente em instantes.");
  // Never return or log provider bodies: they may contain credentials/metadata.
  return new GeminiError(503, "A IA está indisponível neste momento. Você pode continuar usando a busca e seus registros.");
}

export async function generateAnswer(task: SafeTask, signal?: AbortSignal) {
  const prompt = providerPrompt(task);
  const {key,model} = geminiConfig();
  const abortSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000);
  const client = new GoogleGenAI({apiKey: key, httpOptions: {timeout: 45000, retryOptions: {attempts: 1}}});
  try {
    // Check using this account's credential. No automatic model fallback.
    if (!verified || verified.key !== key || verified.model !== model || verified.until <= Date.now()) {
      const info = await client.models.get({model, config: {abortSignal}});
      if (!info.supportedActions?.includes("generateContent")) throw new GeminiError(503, "Este modelo não oferece geração de texto nesta conta.");
      verified = {key, model, until: Date.now() + 300000};
    }
    const response = await client.models.generateContent({model, contents: "Forneça orientação geral para o tema definido nas instruções.", config: {systemInstruction: prompt, maxOutputTokens: 600, temperature: .2, abortSignal}});
    if (response.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== "STOP" && response.candidates[0].finishReason !== "MAX_TOKENS") throw new GeminiError(422, "Não foi possível gerar uma resposta segura para este tema.");
    return z.string().trim().min(1).max(18000).parse(response.text);
  } catch (error) { throw safeGeminiError(abortSignal.aborted ? abortSignal.reason : error); }
}
