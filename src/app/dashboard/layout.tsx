import Link from "next/link";
import { Bot,ShieldCheck } from "lucide-react";
import { Notifications } from "@/components/notifications";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import "@/components/assistant-chat.css";
import { requireSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/constants";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:React.ReactNode}){const s=await requireSession();return <div className="workspace"><Sidebar name={s.profile.full_name} role={ROLE_LABELS[s.profile.role]} isAdmin={s.isAdmin}/><div className="workspace-body"><header className="workspace-top"><span>Seu espaço de conexões profissionais</span><div><ShieldCheck size={16}/><span>Conexão privada</span><Notifications/><ThemeToggle/><Link href="/dashboard/profile" className="avatar" aria-label="Meu perfil">{s.profile.full_name.slice(0,1)}</Link></div></header><main className="workspace-content">{children}</main><Link className="assistant-launch" href="/dashboard/assistant"><Bot size={20}/>Assistente IA</Link></div></div>;}
