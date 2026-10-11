import { z } from "zod";
import { AREAS, STATES } from "./constants";

export const assistantSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(6000) })).min(1).max(20),
  area: z.union([z.enum(AREAS), z.literal("")]).default(""),
  state: z.union([z.enum(STATES), z.literal("")]).default(""),
  city: z.string().trim().max(80).default(""),
}).refine(v => v.messages.at(-1)?.role === "user", { message: "Envie uma pergunta para continuar." });

export const caseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  number: z.string().trim().max(40),
  court: z.string().trim().max(100),
  movement: z.string().trim().min(3).max(3000),
  movement_date: z.iso.date(),
  source_url: z.union([z.url().max(1000).refine(v => v.startsWith("https://"), "Use um link HTTPS."), z.literal("")]),
});

export const CAREER_SOURCE = { title: "Banco de Oportunidades da OAB/SC", url: "https://www2.oab-sc.org.br/banco-oportunidades", description: "Consulte as vagas e os requisitos diretamente na fonte. Algumas funções exigem cadastro na OAB/SC." };

