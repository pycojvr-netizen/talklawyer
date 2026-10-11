import { Header } from "@/components/header";
import { AuthForm } from "@/components/auth-form";
import { configured } from "@/lib/supabase/server";
export default async function Auth({searchParams}:{searchParams:Promise<{mode?:string;error?:string}>}){const q=await searchParams;const mode=["login","signup","recover","update"].includes(q.mode||"")?q.mode!:"login";return <><Header/><main className="auth-shell"><section className="auth-art"><div className="eyebrow">TALKLAWYER</div><h1>Boas conexões<br/>começam com<br/>confiança.</h1><p>Um espaço para aproximar pessoas e profissionais do Direito, com informação, respeito e privacidade.</p></section><section className="auth-area"><AuthForm mode={mode} configured={configured()} error={q.error}/></section></main></>;}
