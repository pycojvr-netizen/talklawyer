"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { mutate } from "@/lib/http";
import "./assistant-chat.css";

type Record = {id:string;title:string;number:string;court:string;movement:string;movement_date:string;source_url:string;updated_at:string};
export function CaseRecords() {
  const [records,setRecords]=useState<Record[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(() => {const abort=new AbortController();fetch("/api/cases",{signal:abort.signal}).then(async r => {const j=await r.json();if(!r.ok)throw Error(j.error);setRecords(j.data);}).catch(e => {if(e.name!=="AbortError")setError(e.message);}).finally(()=>setLoading(false));return()=>abort.abort();},[]);
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError("");setNotice("");
    const form=e.currentTarget;
    try{const values=Object.fromEntries(new FormData(form));const record:Record=await mutate("/api/cases",values);setRecords(prev=>[record,...prev]);form.reset();setNotice("Andamento salvo. O assistente já pode usar este registro.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setBusy(false);}
  }
  return <><div className="page-title"><div><div className="eyebrow">SEUS REGISTROS PRIVADOS</div><h1>Andamentos de processos</h1></div><Link className="button" href="/dashboard/assistant">Explicar com a IA</Link></div><p className="cases-source-note">Registre informações recebidas do tribunal ou do profissional responsável. Esta página não consulta processos automaticamente. Cada nova movimentação fica como uma anotação datada, visível apenas na sua conta.</p>{error&&<div className="alert alert-error" role="alert">{error}</div>}{notice&&<div className="alert alert-success" role="status">{notice}</div>}<div className="cases-grid"><form className="panel" onSubmit={save}><h2 style={{marginBottom:22}}>Registrar uma movimentação</h2><div className="field"><label htmlFor="case-title">Identificação do caso</label><input id="case-title" name="title" required minLength={3} maxLength={120} placeholder="Ex.: Revisão de contrato"/></div><div className="field"><label htmlFor="case-number">Número do processo (opcional)</label><input id="case-number" name="number" maxLength={40}/></div><div className="field"><label htmlFor="case-court">Tribunal (opcional)</label><input id="case-court" name="court" maxLength={100}/></div><div className="field"><label htmlFor="case-date">Data da movimentação</label><input id="case-date" type="date" name="movement_date" required/></div><div className="field"><label htmlFor="case-movement">Movimentação informada</label><textarea id="case-movement" name="movement" required minLength={3} maxLength={3000} placeholder="Cole ou descreva a movimentação recebida."/></div><div className="field"><label htmlFor="case-source">Link da fonte oficial (opcional)</label><input id="case-source" name="source_url" type="url" pattern="https://.*" maxLength={1000} placeholder="https://…"/></div><button className="button" disabled={busy}>{busy?"Salvando…":"Salvar andamento"}</button></form><section aria-label="Andamentos registrados">{loading?<p role="status">Carregando registros…</p>:!records.length?<div className="panel"><h2>Nenhum andamento registrado</h2><p className="muted">Cadastre uma movimentação para consultá-la com o assistente.</p></div>:records.map(record=><article className="panel case-record" key={record.id}><h2>{record.title}</h2><small>{record.number}{record.court?` · ${record.court}`:""}</small><small>Movimentação em {record.movement_date.split("-").reverse().join("/")} · informada por você</small><p>{record.movement}</p>{record.source_url&&<a href={record.source_url} target="_blank" rel="noopener noreferrer">Abrir fonte informada ↗</a>}</article>)}</section></div></>;
}
