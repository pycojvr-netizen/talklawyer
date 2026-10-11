import { requireSession } from "@/lib/session";
import { AssistantChat } from "@/components/assistant-chat";

export default async function AssistantPage() {
  const s = await requireSession();
  return <AssistantChat role={s.profile.role} name={s.profile.full_name.split(" ")[0]} />;
}
