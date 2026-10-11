import { AREAS } from "./constants";
import { uuid } from "./validation";
import type { Lawyer } from "./types";
const rules: [typeof AREAS[number],RegExp][] = [
 ["Trabalhista",/demissa|rescis|salario|trabalhist|empregador|justa causa/],
 ["Família e Sucessões",/divorci|guarda de|pensao aliment|inventario|heranca|sucessao/],
 ["Consumidor",/consumidor|produto defeit|compra|loja|cobranca indevida/],
 ["Previdenciário",/aposent|previdenc|inss/], ["Tributário",/tribut|imposto|fiscal/],
 ["Criminal",/criminal|prisao|crime|defesa penal/], ["Imobiliário",/imobili|aluguel|locacao|despejo|imovel/],
 ["Digital",/digital|vazamento|hack|dados pessoais|invasao de conta/],
 ["Empresarial",/empresarial|societ|socio|contrato empresarial/],
 ["Ambiental",/ambiental|poluicao/], ["Administrativo",/administrativo|licitacao|servidor publico/],
];
export function suggestArea(question:string): typeof AREAS[number] | "" {
 const text=question.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const found=rules.filter(([,pattern])=>pattern.test(text));
 if(found.length===1)return found[0][0];
 if(!found.length && /civil|contrato|indeniz/.test(text))return "Civil";
 return ""; // Ambiguous: ask instead of inventing a legal diagnosis.
}
export function matchingLawyers(found:Lawyer[],area:string) {
 return found.filter(l=>uuid.safeParse(l.user_id).success && l.verification_status==="approved" && l.available===true && Array.isArray(l.areas) && (!area || l.areas.includes(area))).slice(0,6);
}
export function matchingExplanation(lawyers:Lawyer[],area:string,inferred:boolean) {
 const heading=area ? `${inferred?"Área sugerida a partir do tema, a confirmar com o profissional":"Área escolhida por você"}: ${area}.` : "Para indicar profissionais mais pertinentes, escolha a área de atuação e, se desejar, cidade e estado.";
 return `${heading}\n\n${lawyers.length ? "Perfis reais, aprovados na plataforma e disponíveis para contato, dentro dos filtros aplicados:\n"+lawyers.map(l=>`• ${l.display_name} — ${l.areas.join(", ")} · ${l.city}/${l.state}`).join("\n") : "Não encontrei profissionais aprovados e disponíveis nesta página de resultados. Ajuste os filtros ou consulte a busca completa; não criei perfis substitutos."}\n\nA correspondência usa área e localização, não um ranking de qualidade nem garantia de resultado. Abra o perfil, confira a inscrição profissional e converse sobre escopo e condições antes de contratar.`;
}
