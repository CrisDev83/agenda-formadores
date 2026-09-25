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
  // 2. Limite de tempo de 35 segundos
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(urlWithCacheBuster, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // 3. Validação de status HTTP do servidor (evita 404/500 do Google)
    if (!response.ok) {
      console.warn(`O servidor do Google retornou status HTTP ${response.status}`);
      return null;
    }

    // 4. Ler o corpo da resposta como texto bruto primeiro
    const text = await response.text();

    // 5. Verificar se o Google retornou HTML de erro (ex: <!DOCTYPE html> ou <html>)
    if (text.trim().startsWith('<')) {
      console.warn('O Google Apps Script retornou uma página HTML em vez de JSON.');
      return null; // Retorna null para o sistema usar dados locais/fallback em vez de quebrar a tela
    }

    // 6. Converter para JSON com segurança
    const json = JSON.parse(text);
    
    if (!json.ok) {
      throw new Error(json.error || 'Erro no servidor.');
    }
    return json.data;

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('signal')) {
      console.warn('Requisição cancelada/abortada por timeout:', err.message);
      return null;
    }
    throw err;
  }
}