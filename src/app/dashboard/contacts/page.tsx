import { PageTitle } from "@/components/ui";
import { ContactList } from "@/components/contact-list";
import { requireSession } from "@/lib/session";
import { dbError } from "@/lib/api";
export default async function ContactsPage(){const s=await requireSession();const [{data:contacts,error:c},{data:names,error:n},{data:conversations,error:m}]=await Promise.all([s.db.from("contact_requests").select("*").order("created_at",{ascending:false}),s.db.rpc("contact_names"),s.db.from("conversations").select("id,request_id")]);[c,n,m].forEach(dbError);return <><PageTitle eyebrow="CONEXÕES EM ANDAMENTO" title="Solicitações de contato" description="O aceite abre uma conversa privada. Encerrar uma solicitação mantém o histórico e impede novas mensagens."/><ContactList contacts={contacts||[]} userId={s.user.id} names={Object.fromEntries((names||[]).map((x:{id:string;full_name:string})=>[x.id,x.full_name]))} conversations={Object.fromEntries((conversations||[]).map(x=>[x.request_id,x.id]))}/></>;}
