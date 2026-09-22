export const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

export function getMondayOfCurrentWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const mDay = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${mDay}`;
}

export function formatDateBR(isoString) {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-');
  return `${day}/${month}/${year}`;
}

export function getFridayFromMonday(mondayIso) {
  const [year, month, day] = mondayIso.split('-').map(Number);
  const mondayDate = new Date(year, month - 1, day);
  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(mondayDate.getDate() + 4);
  const fYear = fridayDate.getFullYear();
  const fMonth = String(fridayDate.getMonth() + 1).padStart(2, '0');
  const fDay = String(fridayDate.getDate()).padStart(2, '0');
  return `${fYear}-${fMonth}-${fDay}`;
}