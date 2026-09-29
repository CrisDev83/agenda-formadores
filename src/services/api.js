// Obtém a URL da API (do Google Apps Script Web App) definida no arquivo de ambiente (.env)
const API_URL = 'https://script.google.com/macros/s/AKfycbzzKmPcseRHE4ay3O98iuIX1Hqeigvc3WDSS49fK6SWNvUxYEV9sMEnNDgxQ5zJWp-Emg/exec';

// Função assíncrona principal responsável por realizar todas as chamadas HTTP para o backend
export async function apiCall(paramsObj = {}) {
  // Verifica se a URL da API está configurada e se não é o placeholder padrão de exemplo
  if (!API_URL || API_URL.includes('SUA_URL_DA_WEB_APP_AQUI')) {
    throw new Error('URL da API não configurada. Verifique as variáveis de ambiente (.env).');
  }

  // Objeto para armazenar os parâmetros após a formatação/serialização
  const formattedParams = {};
  
  // Percorre cada chave/propriedade enviada no objeto de parâmetros
  Object.keys(paramsObj).forEach(key => {
    const val = paramsObj[key];
    // Se o valor for um objeto ou array (e não nulo), converte para uma string JSON
    if (typeof val === 'object' && val !== null) {
      formattedParams[key] = JSON.stringify(val);
    } else if (val !== undefined && val !== null) {
      // Se for um tipo primitivo (texto, número, booleano), mantém o valor original
      formattedParams[key] = val;
    }
  });

 
  // Cria um controlador de cancelamento para implementar um timeout customizado
  const controller = new AbortController();
  // Define o tempo limite máximo de espera para 50 segundos (adequado para possíveis inicializações lentas do Google Apps Script)
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    // Executa a requisição HTTP GET para a URL montada
    const response = await fetch(API_URL, {
  method: 'POST',
  redirect: 'follow',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8',
  },
  body: JSON.stringify(formattedParams), // Envia os parâmetros no corpo da requisição em vez da URL
  signal: controller.signal
});

    // Cancela o timer de timeout caso a requisição responda antes dos 50 segundos
    clearTimeout(timeoutId);

    // Lança um erro se o status HTTP não estiver na faixa de sucesso (200-299)
    if (!response.ok) {
      throw new Error(`Servidor respondeu com status HTTP ${response.status}`);
    }

    // 2. Lê a resposta primeiro em formato texto puro para evitar falha catastrófica de parse caso o Google retorne uma página HTML de erro
    const text = await response.text();

    // Se o texto retornado começar com '<' (ex: <!DOCTYPE html>), indica que veio uma página de erro/login do Google em vez do JSON esperado
    if (text.trim().startsWith('<')) {
      throw new Error('O Google Apps Script retornou HTML em vez de JSON. Verifique se a implantação do Web App está configurada para "Qualquer pessoa" (Anyone).');
    }

    // Converte a string de texto para o objeto JSON nativo
    const json = JSON.parse(text);

    // Valida o contrato da resposta do backend (espera uma propriedade "ok: true")
    if (!json.ok) {
      throw new Error(json.error || 'Erro na resposta do servidor.');
    }

    // Retorna apenas a propriedade 'data' contida na resposta bem-sucedida
    return json.data;

  } catch (err) {
    // Garante a limpeza do timer de timeout em caso de exceção no bloco try
    clearTimeout(timeoutId);

    // Trata e identifica especificamente o erro de tempo limite excedido (AbortError)
    if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('signal')) {
      console.warn('Requisição cancelada/abortada por tempo limite:', err.message);
      throw new Error('A requisição demorou muito para responder e foi cancelada. Tente novamente.');
    }

    // Propaga qualquer outro erro não tratado
    throw err;
  }
}