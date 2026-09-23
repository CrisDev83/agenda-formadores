const API_URL = import.meta.env.VITE_API_URL;

export async function apiCall(body) {
  if (!API_URL || API_URL.includes('SUA_URL_DA_WEB_APP_AQUI')) {
    throw new Error('URL da API não configurada.');
  }

  // 1. Criar a URL com o parametro anti-cache (_t)
  const urlWithCacheBuster = API_URL.includes('?') 
    ? `${API_URL}&_t=${Date.now()}` 
    : `${API_URL}?_t=${Date.now()}`;

  const controller = new AbortController();
  // 2. Aumentar o tempo de limite de 15000 para 35000 (35 segundos)
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    // 3. Substituir API_URL por urlWithCacheBuster e adicionar cache: 'no-store'
    const response = await fetch(urlWithCacheBuster, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error || 'Erro no servidor.');
    }
    return json.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('signal')) {
      console.warn('Requisição cancelada/abortada:', err.message);
      return null;
    }
    throw err;
  }
}