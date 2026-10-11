import { ReferenceLayout } from "@/components/reference-layout";
import { session } from "@/lib/session";

export default async function Home() {
  const s = await session();
  return <ReferenceLayout signedIn={!!s} />;
}
