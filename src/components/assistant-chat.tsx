"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, BriefcaseBusiness, FileClock, LoaderCircle, Search, Square, UserRound } from "lucide-react";
import { AREAS, STATES } from "@/lib/constants";
import { LawyerCard } from "./ui";
import type { Lawyer } from "@/lib/types";
import "./assistant-chat.css";

type Turn = {role:"user"|"assistant";content:string};
type Answer = {answer:string;lawyers:Lawyer[];recommendedArea:string;caseRecordsAvailable:boolean;careerSource:{title:string;url:string;description:string}|null};
const suggestions = {
  client:["Não sei qual área do Direito atende meu problema. Pode me ajudar?","Quais perguntas devo fazer antes de contratar um advogado?","Pode explicar o último andamento que registrei?"],
  lawyer:["Me ajude a organizar uma rotina de atendimento aos clientes.","Me ajude a preparar meu currículo e encontrar vagas na advocacia.","Quero me preparar para uma entrevista em um escritório."],
  company:["Qual especialidade jurídica minha empresa precisa?","Me ajude a comparar os profissionais disponíveis pelos filtros.","Crie um roteiro de entrevista para contratar assessoria jurídica."],
};

export function AssistantChat({role,name}:{role:"client"|"lawyer"|"company";name:string}) {
  const [messages,setMessages] = useState<Turn[]>([]);
  const [input,setInput] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [area,setArea] = useState("");
  const [state,setState] = useState("");
  const [city,setCity] = useState("");
  const [result,setResult] = useState<Answer|null>(null);
  const [retryUntil,setRetryUntil] = useState(0);
  const blocked=busy || retryUntil>Date.now();
  useEffect(()=>{if(!retryUntil)return;const timer=window.setTimeout(()=>setRetryUntil(0),Math.max(0,retryUntil-Date.now()));return()=>window.clearTimeout(timer);},[retryUntil]);
  const controller = useRef<AbortController|null>(null);
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,busy]);
  useEffect(() => () => controller.current?.abort(),[]);

  async function send(event:React.FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if(!question || blocked) return;
    const history:Turn[] = [...messages.slice(-79),{role:"user",content:question}];
    setMessages(history);setInput("");setBusy(true);setError("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:question}],area,state,city}),signal:controller.current.signal});
      const json = await response.json();
      if(!response.ok) {if(response.status===429){const seconds=Number(response.headers.get("Retry-After"))||60;setRetryUntil(Date.now()+Math.min(86400,Math.max(1,seconds))*1000);}throw new Error(json.error || "Não foi possível responder agora.");}
      const answer:Answer = json.data;
      if(!area && AREAS.includes(answer.recommendedArea as typeof AREAS[number]))setArea(answer.recommendedArea);
      setResult(answer);setMessages([...history,{role:"assistant",content:answer.answer}]);
    } catch(e) {
      setMessages(history.slice(0,-1));setInput(question);
      setError(e instanceof Error && e.name === "AbortError" ? "Resposta interrompida. Sua pergunta continua no campo abaixo." : e instanceof Error ? e.message : "Tente novamente.");
    } finally {setBusy(false);controller.current=null;}
  }

  return <div className="assistant-page">
    <div className="assistant-heading"><div><div className="eyebrow">SEU ASSISTENTE TALKLAWYER</div><h1>Vamos encontrar seu advogado.</h1><p>{role === "lawyer" ? "Organização profissional, carreira e apoio para suas dúvidas." : role === "company" ? "Encontre a especialidade e os profissionais para sua empresa." : "Identifique a especialidade e encontre profissionais reais, com privacidade."}</p></div><span className="assistant-free">Uso sujeito a limites de proteção</span></div>
    <div className="assistant-layout">
      <section className="assistant-conversation" aria-label="Chat com o assistente">
        <header><span className="assistant-symbol"><Bot size={23}/></span><div><strong>Assistente jurídico</strong><small>Google Gemini · Orientação geral</small></div><button type="button" className="text-button" disabled={busy || !messages.length} onClick={() => {setMessages([]);setResult(null);setError("");}}>Nova conversa</button></header>
        <div className="assistant-feed" role="log" aria-label="Mensagens da conversa" aria-live="polite" aria-busy={busy}>
          {!messages.length && <div className="assistant-welcome"><Bot size={35}/><h2>Olá, {name}.</h2><p>Conte o que você precisa. Podemos começar por uma destas perguntas:</p><div>{suggestions[role].map(text => <button key={text} disabled={busy} onClick={() => {setInput(text);textarea.current?.focus();}}>{text}<ArrowUp size={15}/></button>)}</div></div>}
          {messages.map((m,index) => <article className={`assistant-turn assistant-turn-${m.role}`} key={index}><span>{m.role === "user" ? <UserRound size={17}/> : <Bot size={17}/>}</span><div><strong>{m.role === "user" ? "Você" : "Talklawyer IA"}</strong><p>{m.content}</p></div></article>)}
          {busy && <div className="assistant-thinking"><LoaderCircle size={17} className="assistant-spin"/>Preparando sua resposta…<small>A resposta pode levar alguns instantes.</small></div>}
          <div ref={end}/>
        </div>
        <form className="assistant-compose" onSubmit={send}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <label className="visually-hidden" htmlFor="assistant-message">Sua mensagem para a IA</label>
          <div><textarea ref={textarea} id="assistant-message" value={input} onChange={e => setInput(e.target.value)} maxLength={6000} placeholder="Escreva sua dúvida ou descreva sua necessidade…" disabled={busy} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>{busy ? <button type="button" className="button" aria-label="Interromper resposta" onClick={() => controller.current?.abort()}><Square size={17}/></button> : <button className="button" type="submit" disabled={blocked || !input.trim()} aria-label="Enviar mensagem"><ArrowUp size={19}/></button>}</div>
          <p>Não envie dados pessoais, sigilosos ou documentos. O Gemini recebe apenas um tema genérico, não suas mensagens. Registros são explicados localmente. Confirme decisões e prazos com um advogado. Histórico somente nesta aba.</p>
        </form>
      </section>
      <aside className="assistant-tools">
        <section className="panel"><h2><Search size={19}/>Profissionais para sua necessidade</h2><p>Defina os filtros para a IA usar perfis reais da plataforma.</p><div className="field"><label htmlFor="assistant-area">Área de atuação</label><select id="assistant-area" value={area} onChange={e => setArea(e.target.value)} disabled={busy}><option value="">Todas as áreas</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></div><div className="field"><label htmlFor="assistant-state">Estado</label><select id="assistant-state" value={state} onChange={e => setState(e.target.value)} disabled={busy}><option value="">Todos os estados</option>{STATES.map(s => <option key={s}>{s}</option>)}</select></div><div className="field"><label htmlFor="assistant-city">Cidade</label><input id="assistant-city" value={city} onChange={e => setCity(e.target.value)} maxLength={80} placeholder="Ex.: São Paulo" disabled={busy}/></div><Link className="button button-outline" href={`/lawyers?${new URLSearchParams({area,state,city})}`}>Consultar profissionais</Link></section>
        <section className="panel"><h2><FileClock size={19}/>Andamentos registrados</h2><p>Cadastre a movimentação recebida do tribunal ou do advogado. A IA explica esses registros; não consulta tribunais automaticamente.</p><Link className="text-button" href="/dashboard/cases">Meus registros →</Link>{result && !result.caseRecordsAvailable && <p role="status">O registro de processos ainda aguarda configuração.</p>}</section>
        {role === "lawyer" && <section className="panel"><h2><BriefcaseBusiness size={19}/>Carreira e oportunidades</h2><p>Prepare seu currículo, entrevistas e candidaturas com a IA. Consulte vagas atuais na fonte.</p><a className="text-button" href="https://www2.oab-sc.org.br/banco-oportunidades" target="_blank" rel="noopener noreferrer">Banco de Oportunidades OAB/SC ↗</a><small>Consulte os requisitos de cadastro da seccional.</small></section>}
      </aside>
    </div>
    {result && <section className="assistant-results"><h2>Advogados correspondentes aos seus filtros</h2><p>Perfis aprovados e disponíveis. Ordem alfabética, sem destaque pago nem garantia de resultado.</p>{result.lawyers.length ? <div className="lawyer-grid">{result.lawyers.map(l => <LawyerCard key={l.user_id} lawyer={l}/>)}</div> : <p>Nenhum perfil disponível para estes filtros. Experimente outra área ou localização.</p>}</section>}
  </div>;
}
