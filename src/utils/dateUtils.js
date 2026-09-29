// Array constante contendo os nomes dos 5 dias úteis da semana para exibição no formulário
export const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

// Função que calcula e retorna a data da Segunda-feira da semana atual em formato ISO ('AAAA-MM-DD')
export function getMondayOfCurrentWeek(d = new Date()) {
  // Cria uma nova instância de Date para não alterar o objeto de data original
  const date = new Date(d);
  // Obtém o dia da semana atual (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
  const day = date.getDay();
  // Calcula a diferença de dias necessária para recuar/avançar até à Segunda-feira
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  // Ajusta o dia do mês para o dia da Segunda-feira encontrada
  const monday = new Date(date.setDate(diff));
  // Extrai o ano com 4 dígitos
  const year = monday.getFullYear();
  // Extrai o mês (adicionando 1 pois em JS começa em 0) e adiciona o '0' à esquerda se tiver 1 dígito
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  // Extrai o dia do mês e adiciona o '0' à esquerda se tiver 1 dígito
  const mDay = String(monday.getDate()).padStart(2, '0');
  // Retorna a data formatada no padrão internacional 'AAAA-MM-DD'
  return `${year}-${month}-${mDay}`;
}

// Função auxiliar que converte uma data ISO ('AAAA-MM-DD') para o formato brasileiro ('DD/MM/AAAA')
export function formatDateBR(isoString) {
  // Se a string da data vier vazia ou nula, retorna um texto vazio
  if (!isoString) return '';
  // Divide a string nos traços para separar ano, mês e dia
  const [year, month, day] = isoString.split('-');
  // Monta e retorna no padrão brasileiro 'DD/MM/AAAA'
  return `${day}/${month}/${year}`;
}

// Função que recebe a data de uma Segunda-feira em ISO ('AAAA-MM-DD') e calcula a data da Sexta-feira correspondente
export function getFridayFromMonday(mondayIso) {
  // Converte a string 'AAAA-MM-DD' em números para criar a data exata da segunda-feira
  const [year, month, day] = mondayIso.split('-').map(Number);
  const mondayDate = new Date(year, month - 1, day);
  // Cria uma cópia da data de Segunda-feira
  const fridayDate = new Date(mondayDate);
  // Soma 4 dias à Segunda-feira para obter a Sexta-feira da mesma semana
  fridayDate.setDate(mondayDate.getDate() + 4);
  // Extrai o ano da Sexta-feira
  const fYear = fridayDate.getFullYear();
  // Extrai e formata o mês com 2 dígitos
  const fMonth = String(fridayDate.getMonth() + 1).padStart(2, '0');
  // Extrai e formata o dia com 2 dígitos
  const fDay = String(fridayDate.getDate()).padStart(2, '0');
  // Retorna a data da Sexta-feira no formato 'AAAA-MM-DD'
  return `${fYear}-${fMonth}-${fDay}`;
}