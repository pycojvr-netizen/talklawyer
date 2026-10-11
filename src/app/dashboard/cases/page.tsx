import { CaseRecords } from "@/components/case-records";
import { requireSession } from "@/lib/session";
export default async function CasesPage() { await requireSession(); return <CaseRecords/>; }
