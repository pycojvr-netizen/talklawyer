import { PageTitle } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/session";
import { dbError } from "@/lib/api";
export default async function ProfilePage(){const s=await requireSession();let lawyer=null;if(s.profile.role==="lawyer"){const {data,error}=await s.db.from("lawyer_profiles").select("*").eq("user_id",s.user.id).single();dbError(error);lawyer=data;}return <><PageTitle eyebrow="SUA IDENTIDADE NA PLATAFORMA" title="Meu perfil" description="Informações claras e atualizadas ajudam a construir relações de confiança."/><ProfileForm profile={s.profile} lawyer={lawyer}/></>;}
