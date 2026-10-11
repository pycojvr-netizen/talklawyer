export async function mutate(path:string,body:unknown,method="POST") {
 const response=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const json=await response.json();if(!response.ok) throw new Error(json.error || "Não foi possível concluir.");return json.data;
}
