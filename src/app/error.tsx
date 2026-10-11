"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="public-container"><h1>Não foi possível carregar esta página.</h1><p className="muted">Verifique a conexão e a configuração do Supabase.</p><button className="button" onClick={reset}>Tentar novamente</button></main>;}
