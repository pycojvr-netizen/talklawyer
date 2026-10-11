import type { Metadata,Viewport } from "next";
import "./globals.css";
// All HTML gets a fresh request nonce, including terms/privacy and 404 pages.
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{default:"Talklawyer · Conexões jurídicas com confiança",template:"%s · Talklawyer"},description:"Encontre profissionais jurídicos verificados e organize seus atendimentos em um espaço seguro.",applicationName:"Talklawyer",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#142a47"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>;}
