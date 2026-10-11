import { z } from "zod";

// An allowlist projection, not PII regex redaction. No original text, history,
// profile, filter, document or database record can enter the provider payload.
export const safeTaskSchema = z.object({
  role: z.enum(["client", "lawyer", "company"]),
  intent: z.enum(["buscar_profissional", "comparar_profissionais", "duvidas_gerais", "carreira", "curriculo", "entrevista", "organizacao", "processos"]),
}).strict();
export type SafeTask = z.infer<typeof safeTaskSchema>;
function normalize(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function projectTask(role: SafeTask["role"], question: string): SafeTask {
  const text = normalize(question);
  let intent: SafeTask["intent"] = "duvidas_gerais";
  if (role === "lawyer" && /curriculo/.test(text)) intent = "curriculo";
  else if (/entrevista/.test(text)) intent = "entrevista";
  else if (role === "lawyer" && /vaga|emprego|carreira|oportunidade/.test(text)) intent = "carreira";
  else if (role === "lawyer" && /rotina|organiz|atendimento/.test(text)) intent = "organizacao";
  else if (/compar|contrat|selecion/.test(text)) intent = "comparar_profissionais";
  else if (/advogad|especialidade|area do direito|conectar|indicar/.test(text)) intent = "buscar_profissional";
  else if (/andamento|movimentacao|sentenca|juntad|conclusos|citacao|intimacao|meu processo/.test(text)) intent = "processos";
  return safeTaskSchema.parse({role, intent});
}

export function providerPrompt(task: SafeTask) {
  // Validate again at the egress boundary; reject accidental extra properties.
  const safe = safeTaskSchema.parse(task);
  return `Você é o assistente Talklawyer, focado em ajudar a encontrar advogados da plataforma. Responda em português do Brasil, em até 160 palavras. Priorize orientar a especialidade e preparar perguntas para o profissional, não consultoria de casos concretos. Recebe somente uma categoria genérica, sem a pergunta original nem dados do usuário. Não diga que analisou um caso, currículo, processo ou perfis individuais. Os profissionais correspondentes são indicados separadamente pelo servidor a partir do cadastro real. Não escreva nomes de pessoas, escritórios, links de perfis ou recomendações individuais.
Perfil de atendimento: ${safe.role}. Tema genérico: ${safe.intent}.
Cliente: explique como identificar a especialidade e preparar perguntas para um advogado. Empresa: critérios de contratação, área, disponibilidade, escopo e entrevista. Advogado: organização, comunicação, currículo, entrevistas e carreira, conforme o tema.
Nunca invente profissionais, vagas, leis, jurisprudência, fatos, valores ou prazos. Os cartões reais de profissionais são apresentados separadamente pelo site; oriente comparar esses cartões e ajustar os filtros, sem ranking ou promessa de resultado. Para carreira, indique o Banco de Oportunidades da OAB/SC, sem afirmar consulta a vagas ao vivo ou acesso garantido.
Não tem acesso a registros, documentos, mensagens, tribunais, sites externos ou ferramentas. Não afirme consultas automáticas. Só informação geral, sujeita a erros. Questões concretas, urgências, direito vigente e prazos devem ser confirmados com o advogado responsável. Se não for possível responder ao tema genérico, sugira perguntas gerais e buscar orientação profissional. Não solicite dados pessoais ou sigilosos no chat.`;
}

const stages: [RegExp, string][] = [
  [/^(juntada|documento juntado)\b/, "Juntada costuma indicar a inclusão de um documento nos autos. Isso, por si só, não significa decisão ou vitória."],
  [/^conclusos\b/, "Conclusos costuma indicar o encaminhamento dos autos ao juiz para análise. Não informa qual será a decisão nem quando ela ocorrerá."],
  [/^citacao\b/, "Citação costuma ser a comunicação formal para participação no processo. Providências e eventuais prazos precisam ser conferidos pelo advogado."],
  [/^intimacao\b/, "Intimação costuma comunicar um ato ou decisão. O conteúdo integral deve ser conferido pelo advogado; esta explicação não calcula prazo."],
  [/^sentenca\b/, "Sentença é uma decisão judicial. A anotação não permite concluir o resultado, se cabe recurso ou se houve trânsito em julgado."],
  [/^audiencia\b/, "Uma anotação de audiência pode tratar de agendamento ou realização. Confirme data, formato e providências com o profissional responsável."],
  [/^recurso\b/, "Recurso se relaciona ao pedido de revisão de uma decisão. O registro isolado não revela admissibilidade, prazo ou resultado."],
  [/^arquivamento\b/, "Arquivamento indica uma etapa de armazenamento ou encerramento dos autos, conforme o contexto. Não permite presumir o motivo ou resultado."],
];
export type PrivateCase = { movement: string; movement_date: string };
export function explainPrivateCases(records: PrivateCase[], available: boolean) {
  if (!available) return "Os registros de processos ainda estão indisponíveis. Ative a tabela no banco e registre uma movimentação. Não há consulta automática a tribunais.";
  if (!records.length) return "Não há andamentos cadastrados na sua conta. Abra Meus processos e registre a movimentação e a data recebidas da fonte oficial ou do advogado. Não consultei tribunais.";
  const explanations = records.map((record, index) => {
    const stage = stages.find(([pattern]) => pattern.test(normalize(record.movement.trim())));
    const date = record.movement_date.split("-").reverse().join("/");
    return `Registro ${index + 1}, de ${date}, informado por você: ${stage?.[1] || "Não reconheci com segurança uma etapa nesta anotação. Peça ao advogado que explique o texto integral e confira a fonte indicada em Meus processos."}`;
  });
  return `Explicação local dos registros, sem enviar seu conteúdo ao Gemini:\n\n${explanations.join("\n\n")}\n\nSão anotações suas, não consulta ao tribunal. Confirme o significado, as providências e os prazos com o advogado responsável.`;
}
