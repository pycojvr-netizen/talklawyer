"use client";

import Link from "next/link";
import { ArrowUpRight, Landmark, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  ["Início", "/#inicio"],
  ["Como funciona", "/#como-funciona"],
  ["Áreas do Direito", "/#areas"],
  ["Para advogados", "/#para-advogados"],
  ["Para empresas", "/#para-empresas"],
  ["Conteúdo", "/#conteudo"],
] as const;

export function Header({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Talklawyer — página inicial" onClick={() => setOpen(false)}>
        <span className="brand-icon"><Landmark size={23} /></span>
        <strong>Talk</strong><span>lawyer</span>
      </Link>
      <nav className={`topnav ${open ? "topnav-open" : ""}`} aria-label="Navegação principal">
        {navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="icon-button header-search" href="/lawyers" aria-label="Pesquisar advogados"><Search size={18} /></Link>
        <ThemeToggle />
        <Link href={signedIn ? "/dashboard" : "/auth?mode=login"} className="login-link">{signedIn ? "Meu painel" : "Entrar"}</Link>
        <Link className="button button-small" href={signedIn ? "/dashboard" : "/auth?mode=signup"}>{signedIn ? "Abrir painel" : "Cadastrar-se"}<ArrowUpRight size={16} /></Link>
        <button className="icon-button menu-toggle" type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
    </header>
  );
}
