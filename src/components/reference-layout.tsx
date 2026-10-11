"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AREAS, STATES } from "@/lib/constants";
import "./reference-layout.css";

type Screen = "home" | "process";

export function ReferenceLayout({ signedIn }: { signedIn: boolean }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [transition, setTransition] = useState(false);
  const [pending, setPending] = useState<Screen>("process");
  const [muted, setMuted] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!transition) return;
    skip.current?.focus();
    const timeout = window.setTimeout(finish, 13000);
    return () => window.clearTimeout(timeout);
  }, [transition]);

  function finish() {
    setScreen(pending);
    setTransition(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  }

  function navigate(next: Screen, button: HTMLButtonElement) {
    if (next === screen) return;
    trigger.current = button;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScreen(next);
      return;
    }
    setPending(next);
    setTransition(true);
    setMuted(true);
  }

  const process = screen === "process";
  const auth = signedIn ? "/dashboard" : "/auth?mode=signup";

  return <main className="reference-site">
    <div className={`reference-stage ${process ? "reference-process" : "reference-home"}`}>
      <img className="reference-art" src={process ? "/media/reference-process.png" : "/media/reference-home.png"} alt="" />
      <h1 className="visually-hidden">{process ? "Do seu problema à solução, em poucos passos." : "Encontre o advogado ideal para o seu caso."}</h1>
      <nav aria-label="Navegação principal">
        <button className="reference-hit ref-logo" aria-label="Talklawyer — início" onClick={e => navigate("home", e.currentTarget)} />
        <button className="reference-hit ref-home" aria-label="Início" aria-current={!process ? "page" : undefined} onClick={e => navigate("home", e.currentTarget)} />
        <button className="reference-hit ref-process" aria-label="Como funciona" aria-current={process ? "page" : undefined} onClick={e => navigate("process", e.currentTarget)} />
        <Link className="reference-hit ref-areas" aria-label="Áreas do Direito" href="/lawyers" />
        <Link className="reference-hit ref-lawyer" aria-label="Para advogados" href={auth} />
        {process && <Link className="reference-hit ref-company" aria-label="Para empresas" href={auth} />}
        <Link className="reference-hit ref-content" aria-label="Conteúdo" href="/terms" />
        <Link className="reference-hit ref-search" aria-label="Pesquisar advogados" href="/lawyers" />
        <Link className="reference-hit ref-login" aria-label={signedIn ? "Meu painel" : "Entrar"} href={signedIn ? "/dashboard" : "/auth?mode=login"} />
        <Link className="reference-hit ref-signup" aria-label="Cadastrar-se" href={auth} />
      </nav>

      {!process ? <>
        <form className="reference-search-form" action="/lawyers">
          <label className="reference-need"><span className="visually-hidden">Qual é a sua necessidade?</span><select name="area" defaultValue=""><option value="">Qual é a sua necessidade?</option>{AREAS.map(area => <option key={area}>{area}</option>)}</select></label>
          <label className="reference-state"><span className="visually-hidden">Cidade ou estado</span><select name="state" defaultValue=""><option value="">Cidade ou estado</option>{STATES.map(state => <option key={state}>{state}</option>)}</select></label>
          <button className="reference-hit ref-submit" type="submit" aria-label="Buscar advogados" />
        </form>
        <Link className="reference-hit ref-verified" href="/lawyers" aria-label="Profissionais verificados" />
        <Link className="reference-hit ref-private" href="/privacy" aria-label="Atendimento seguro e confidencial" />
        <Link className="reference-hit ref-brazil" href="/lawyers" aria-label="Suporte em todo o Brasil" />
      </> : <>
        <Link className="reference-hit ref-learn" href="/lawyers" aria-label="Conheça o passo a passo: comece buscando um advogado" />
        <Link className="reference-hit ref-step-one" href="/lawyers" aria-label="1. Busque: encontre advogados por especialidade e localização" />
        <Link className="reference-hit ref-step-two" href="/lawyers" aria-label="2. Compare: conheça perfis e áreas de atuação" />
        <Link className="reference-hit ref-step-three" href={signedIn ? "/dashboard/contacts" : auth} aria-label="3. Entre em contato" />
        <Link className="reference-hit ref-step-four" href={signedIn ? "/dashboard" : auth} aria-label="4. Resolva seu caso" />
      </>}
    </div>
    <footer className="reference-footer"><Link href="/terms">Termos de uso</Link><Link href="/privacy">Privacidade</Link><span>© {new Date().getFullYear()} Talklawyer</span></footer>
    {transition && <div className="reference-video" role="dialog" aria-modal="true" aria-label="Transição Talklawyer" onKeyDown={e => { if (e.key === "Escape") finish(); }}>
      <video ref={video} autoPlay playsInline muted={muted} onEnded={finish} onError={finish} src="/media/talklawyer-transition.mp4" />
      <div className="reference-video-actions"><button onClick={() => setMuted(!muted)}>{muted ? "Ativar som" : "Desativar som"}</button><button ref={skip} onClick={finish}>Pular transição</button></div>
    </div>}
  </main>;
}
