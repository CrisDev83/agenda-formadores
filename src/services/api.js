const API_URL = import.meta.env.VITE_API_URL;

export async function apiCall(paramsObj = {}) {
  if (!API_URL || API_URL.includes('SUA_URL_DA_WEB_APP_AQUI')) {
    throw new Error('URL da API não configurada. Verifique as variáveis de ambiente (.env).');
  }

  // Serializa parâmetros complexos (Arrays ou Objetos) para JSON strings
  const formattedParams = {};
  Object.keys(paramsObj).forEach(key => {
    const val = paramsObj[key];
    if (typeof val === 'object' && val !== null) {
      formattedParams[key] = JSON.stringify(val);
    } else if (val !== undefined && val !== null) {
      formattedParams[key] = val;
    }
  });

  // 1. Converte os dados em Query Parameters (GET) para evitar bloqueios de CORS/Proxy
  const queryParams = new URLSearchParams({
    ...formattedParams,
    _t: Date.now() // Anti-cache
  }).toString();

  const fullUrl = API_URL.includes('?')
    ? `${API_URL}&${queryParams}`
    : `${API_URL}?${queryParams}`;

  const controller = new AbortController();
  // Timeout de 50s para suportar respostas lentas do Apps Script
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Servidor respondeu com status HTTP ${response.status}`);
    }

    // 2. Lê primeiro como texto para evitar crash de parse do JSON caso venha HTML de erro do Google
    const text = await response.text();

    if (text.trim().startsWith('<')) {
      throw new Error('O Google Apps Script retornou HTML em vez de JSON. Verifique se a implantação do Web App está configurada para "Qualquer pessoa" (Anyone).');
    }

    const json = JSON.parse(text);

    if (!json.ok) {
      throw new Error(json.error || 'Erro na resposta do servidor.');
    }

    return json.data;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('signal')) {
      console.warn('Requisição cancelada/abortada por tempo limite:', err.message);
      throw new Error('A requisição demorou muito para responder e foi cancelada. Tente novamente.');
    }

    throw err;
  }
}