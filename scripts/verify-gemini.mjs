import nextEnv from '@next/env';
import { GoogleGenAI } from '@google/genai';
nextEnv.loadEnvConfig(process.cwd());
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
if (!key) {
  console.log('Não verificado: GEMINI_API_KEY ausente no servidor.');
  process.exitCode = 2;
} else if (!/^gemini-[a-z0-9.-]+$/.test(model)) {
  console.log('Modelo configurado inválido.');
  process.exitCode = 2;
} else {
  try {
    const client = new GoogleGenAI({apiKey:key, httpOptions:{timeout:15000, retryOptions:{attempts:1}}});
    const info = await client.models.get({model, config:{abortSignal:AbortSignal.timeout(15000)}});
    if (!info.supportedActions?.includes('generateContent')) throw {status:404};
    console.log(`Modelo disponível nesta conta: ${model}.`);
    if (process.argv.includes('--generate')) {
      const result = await client.models.generateContent({model, contents:'Responda somente: conexão funcionando.', config:{maxOutputTokens:40, abortSignal:AbortSignal.timeout(45000)}});
      console.log(result.text?.trim() ? 'Geração sintética concluída, sem dados pessoais.' : 'Geração sem texto.');
    }
  } catch (error) {
    const status = Number(error?.status) || 0;
    console.log(status === 429 ? 'Cota excedida (429); teste sem repetição automática.' : status === 404 ? 'Modelo indisponível nesta conta.' : status === 401 || status === 403 ? 'Credencial ou permissão inválida.' : 'Não foi possível verificar; confira conexão e configuração.');
    process.exitCode = 1;
  }
}
