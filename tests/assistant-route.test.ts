import { beforeEach, test, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({session:vi.fn(),generate:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock("@/lib/session",()=>({session:mocks.session}));
vi.mock("@/lib/gemini",async original=>({...await original<typeof import('../src/lib/gemini')>(),generateAnswer:mocks.generate}));
import { POST } from "../src/app/api/assistant/route";
import { GeminiError } from "../src/lib/gemini";
const userId="00000000-0000-4000-8000-000000000002";
const record={movement:"Juntada de contrato sigiloso",movement_date:"2026-10-11"};
function request(question="Preciso de um advogado",origin="http://localhost:3000") {
 return new NextRequest("http://localhost:3000/api/assistant",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"assistant",content:"segredo anterior"},{role:"user",content:question}],city:"Cidade privada"})});
}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_SITE_URL","http://localhost:3000");
 mocks.session.mockResolvedValue({user:{id:userId},profile:{role:"client"},db:{rpc:mocks.rpc,from:mocks.from}});
 mocks.rpc.mockImplementation(async(name:string)=>name==="claim_ai_request"?{data:"lease-id",error:null}:name==="search_lawyers"?{data:[{user_id:"00000000-0000-4000-8000-000000000003",display_name:"Profissional real",verification_status:"approved",available:true,areas:["Trabalhista"],city:"Cidade",state:"RS"}],error:null}:{data:null,error:null});
 mocks.from.mockImplementation(()=>{const q={select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn()};q.select.mockReturnValue(q);q.eq.mockReturnValue(q);q.order.mockReturnValue(q);q.limit.mockResolvedValue({data:[record],error:null});return q;});
 mocks.generate.mockResolvedValue("Orientação geral.");
});
test("rota exige sessão válida e rejeita origem estrangeira antes de chamar IA",async()=>{
 mocks.session.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);
 expect((await POST(request("teste","https://foreign.example"))).status).toBe(403);
 expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
test("rota mantém cartões reais, sem enviar registros, filtros, PII ou histórico ao Gemini",async()=>{
 const response=await POST(request("Meu CPF 123.456.789-00; quero comparar advogados"));
 expect(response.status).toBe(200);
 const json=await response.json();expect(json.data.lawyers[0].display_name).toBe("Profissional real");
 expect(mocks.generate.mock.calls[0][0]).toEqual({role:"client",intent:"comparar_profissionais"});
 expect(JSON.stringify(mocks.generate.mock.calls)).not.toContain("sigiloso");
 expect(mocks.rpc).toHaveBeenCalledWith("release_ai_request",{token:"lease-id"});
 expect(mocks.from).toHaveBeenCalledTimes(1);
 expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith("owner_id",userId);
});
test("processos usam explicação local e nenhuma chamada à IA externa",async()=>{
 const response=await POST(request("Explique meu último andamento do processo"));
 expect(response.status).toBe(200);expect((await response.json()).data.answer).toContain("Explicação local");
 expect(mocks.generate).not.toHaveBeenCalled();
});
test("429 de cota compartilhada devolve Retry-After sem acessar dados privados",async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{message:"AI_RATE_LIMIT:60"}});
 const response=await POST(request());expect(response.status).toBe(429);expect(response.headers.get("Retry-After")).toBe("60");
 expect(mocks.from).not.toHaveBeenCalled();expect(mocks.generate).not.toHaveBeenCalled();
});
test("429 do provedor é seguro e libera reserva mesmo na falha",async()=>{
 mocks.generate.mockRejectedValue(new GeminiError(429,"Cota da IA atingida.",60));
 const response=await POST(request());expect(response.status).toBe(429);expect(response.headers.get("Retry-After")).toBe("60");
 expect(mocks.rpc).toHaveBeenCalledWith("release_ai_request",{token:"lease-id"});
});
test("migração ausente bloqueia IA em vez de ignorar proteção",async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{message:"function missing"}});
 expect((await POST(request())).status).toBe(503);expect(mocks.generate).not.toHaveBeenCalled();
});
test("corpo acima do limite é recusado e libera a reserva",async()=>{
 const huge=new NextRequest("http://localhost:3000/api/assistant",{method:"POST",headers:{origin:"http://localhost:3000","Content-Type":"application/json"},body:"x".repeat(140000)});
 expect((await POST(huge)).status).toBe(413);expect(mocks.generate).not.toHaveBeenCalled();
 expect(mocks.rpc).toHaveBeenCalledWith("release_ai_request",{token:"lease-id"});
});

test("triagem local aplica área inferida à busca real, mas nunca envia tema privado ao Gemini",async()=>{
 const response=await POST(request("Fui demitido. Quero um advogado para minha rescisão. CPF privado."));
 expect(response.status).toBe(200);const json=await response.json();expect(json.data.recommendedArea).toBe("Trabalhista");expect(json.data.answer).toContain("Profissional real");
 expect(mocks.rpc).toHaveBeenCalledWith("search_lawyers",expect.objectContaining({area_filter:"Trabalhista"}));
 expect(JSON.stringify(mocks.generate.mock.calls)).not.toContain("rescisão");
});

test("API rejeita formato errado e indicação de origem cross-site",async()=>{
 const plain=new NextRequest("http://localhost:3000/api/assistant",{method:"POST",headers:{origin:"http://localhost:3000","content-type":"text/plain"},body:"{}"});
 expect((await POST(plain)).status).toBe(415);
 const foreign=request();foreign.headers.set("sec-fetch-site","cross-site");expect((await POST(foreign)).status).toBe(403);expect(mocks.generate).not.toHaveBeenCalled();
});
