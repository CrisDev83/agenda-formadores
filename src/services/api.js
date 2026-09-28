const API_URL = import.meta.env.VITE_API_URL;

export async function apiCall(paramsObj = {}) {
  if (!API_URL || API_URL.includes('SUA_URL_DA_WEB_APP_AQUI')) {
    throw new Error('URL da API não configurada.');
  }

  // 1. Converte os dados em Query Parameters (GET) para evitar bloqueios de Proxy
  const queryParams = new URLSearchParams({
    ...paramsObj,
    _t: Date.now() // Anti-cache
  }).toString();

  const fullUrl = API_URL.includes('?')
    ? `${API_URL}&${queryParams}`
    : `${API_URL}?${queryParams}`;

  const controller = new AbortController();
  // 2. Aumentado o timeout de 15s para 50s (garante tempo suficiente para o Google Apps Script)
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

    // 3. Lê primeiro como texto para evitar crash de parse do JSON caso venha erro HTML
    const text = await response.text();

    if (text.trim().startsWith('<')) {
      throw new Error('O Google Apps Script retornou uma página HTML em vez de JSON. Verifique as permissões de acesso da implantação ("Qualquer pessoa").');
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
      throw new Error('A requisição demorou muito e foi cancelada. Tente novamente.');
    }

    throw err;
  }
}