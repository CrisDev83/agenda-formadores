// Armazena o ID único da Planilha Google (Google Sheets) que serve como banco de dados do sistema
var SPREADSHEET_ID = "1GeTLyjV-9NsUt1P5ZCTh8sr4wvUnct5He_M6g7deWF0";

// Função do Google Apps Script disparada quando é feita uma requisição HTTP do tipo GET
function doGet(e) {
  // Redireciona requisições GET para a função doPost para tratar todas da mesma forma
  return doPost(e);
}

// Função principal disparada quando o frontend faz uma requisição HTTP do tipo POST
function doPost(e) {
  try {
    // Converte o corpo (JSON) recebido na requisição em um objeto JavaScript
    var contents = JSON.parse(e.postData.contents);
    // Identifica qual ação/operação o frontend está solicitando (ex: 'login', 'catalog', 'save', etc.)
    var action = contents.action;
    // Abre a planilha do Google utilizando o ID configurado
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 0. Autenticação por E-mail
    if (action === 'login') {
      // Limpa e padroniza o e-mail enviado pelo usuário (em minúsculas e sem espaços extras)
      var emailInput = String(contents.email || '').trim().toLowerCase();
      // Valida se o e-mail não veio vazio
      if (!emailInput) {
        throw new Error('Por favor, informe o e-mail.');
      }

      // Busca e padroniza os dados da aba 'Formadores' na planilha
      var formadores = getNormalizedSheetData(ss.getSheetByName('Formadores'));
      // Procura na lista um formador que possua o mesmo e-mail informado
      var user = formadores.find(function(f) {
        var fEmail = String(f.email || f['e-mail'] || '').trim().toLowerCase();
        return fEmail === emailInput;
      });

      // Se não encontrar o e-mail cadastrado na aba 'Formadores', lança um erro
      if (!user) {
        throw new Error('E-mail não autorizado no sistema: ' + emailInput);
      }

      // Retorna os dados do usuário autenticado para o frontend em formato JSON
      return responseJSON({ user: user });
    }


    // 1. Retorna o catálogo de Formadores e Atividades
    if (action === 'catalog') {
      // Retorna as listas das abas 'Formadores' e 'Atividades' já formatadas
      return responseJSON({
        teachers: getNormalizedSheetData(ss.getSheetByName('Formadores')),
        activities: getNormalizedSheetData(ss.getSheetByName('Atividades'))
      });
    }

    // 2. Carrega TODOS os planejamentos da semana (para o Dashboard)
    if (action === 'load_all') {
      // Seleciona a aba 'Planejamentos'
      var sheet = ss.getSheetByName('Planejamentos');
      // Obtém a data da semana requisitada pelo frontend
      var week = contents.week;
      // Busca todos os planejamentos cadastrados para essa semana específica
      var plans = loadAllPlanningsForWeek(sheet, week);
      // Retorna o mapa de planejamentos no JSON
      return responseJSON({ plans: plans });
    }

    // 3. Carrega o planejamento de um formador específico
    if (action === 'load') {
      // Seleciona a aba 'Planejamentos'
      var sheet = ss.getSheetByName('Planejamentos');
      // Obtém o nome/ID do formador e a semana solicitada
      var teacher = contents.teacher;
      var week = contents.week;

      // Se nenhum formador for especificado ou se for pedido 'ALL', carrega todos os planejamentos da semana
      if (!teacher || teacher === 'ALL') {
        var plans = loadAllPlanningsForWeek(sheet, week);
        return responseJSON({ plans: plans });
      }

      // Procura a linha específica do planejamento deste formador nesta semana na planilha
      var row = findPlanningRow(sheet, teacher, week);
      if (row) {
        // Lê os dados da linha encontrada (colunas 1 a 5)
        var data = sheet.getRange(row, 1, 1, 5).getValues()[0];
        // Retorna os 10 períodos salvos, o número da revisão e bloqueia a edição para o formador
        return responseJSON({
          slots: JSON.parse(data[3] || '[]'),
          revision: Number(data[4]) || 0,
          isLocked: true
        });
      } else {
        // Se ainda não existir registro na planilha, retorna 10 períodos vazios e libera para preenchimento
        return responseJSON({
          slots: Array(10).fill(''),
          revision: 0,
          isLocked: false
        });
      }
    }

    // 4. Salva o planejamento (Formador - Validação Obrigatoriedade dos 10 Períodos)
    if (action === 'save') {
      // Obtém a aba 'Planejamentos'
      var sheet = ss.getSheetByName('Planejamentos');
      // Se a aba não existir, cria a aba automaticamente com o cabeçalho padrão
      if (!sheet) {
        sheet = ss.insertSheet('Planejamentos');
        sheet.appendRow(['ID', 'Teacher', 'Week', 'Slots', 'Revision', 'UpdatedAt']);
      }
      var teacher = contents.teacher;
      var week = contents.week;
      var slots = contents.slots;

      // Validação backend: garante que os 10 períodos existam e não estejam vazios
      if (!slots || slots.length < 10 || slots.some(function(s) { return !s || String(s).trim() === ''; })) {
        throw new Error('Todos os 10 períodos da semana devem estar preenchidos para enviar o planejamento.');
      }

      // Verifica se já existe um planejamento salvo para este formador nesta semana
      var row = findPlanningRow(sheet, teacher, week);

      // Se já existir, impede o formador de alterar (pois já foi bloqueado/enviado)
      if (row) {
        throw new Error('O planejamento para esta semana já foi enviado e não pode ser alterado pelo formador.');
      }

      // Insere uma nova linha na planilha com ID único (UUID), nome do formador, data da semana, os 10 períodos em formato texto JSON, revisão 1 e data atual
      sheet.appendRow([
        Utilities.getUuid(),
        String(teacher),
        normalizeDateStr(week),
        JSON.stringify(slots),
        1,
        new Date()
      ]);

      // Retorna sucesso com revisão 1
      return responseJSON({ revision: 1 });
    }

    // 5. Salva / Atualiza o planejamento (Exclusivo para ADMINISTRADOR)
    if (action === 'admin_save') {
      // Obtém a aba 'Planejamentos'
      var sheet = ss.getSheetByName('Planejamentos');
      // Cria a aba de planejamentos se ela ainda não existir na planilha
      if (!sheet) {
        sheet = ss.insertSheet('Planejamentos');
        sheet.appendRow(['ID', 'Teacher', 'Week', 'Slots', 'Revision', 'UpdatedAt']);
      }
      var teacher = contents.teacher;
      var week = contents.week;
      var slots = contents.slots;

      // Busca se o planejamento já existe para saber se vai atualizar ou criar novo
      var row = findPlanningRow(sheet, teacher, week);
      var now = new Date();

      if (row) {
        // Se a linha existir, incrementa o número da revisão e sobrescreve os 10 períodos e a data de atualização
        var currentRev = Number(sheet.getRange(row, 5).getValue()) || 0;
        sheet.getRange(row, 4).setValue(JSON.stringify(slots));
        sheet.getRange(row, 5).setValue(currentRev + 1);
        sheet.getRange(row, 6).setValue(now);
      } else {
        // Se não existir registro anterior, insere uma nova linha completa
        sheet.appendRow([
          Utilities.getUuid(),
          String(teacher),
          normalizeDateStr(week),
          JSON.stringify(slots),
          1,
          now
        ]);
      }

      // Retorna confirmação de sucesso para o administrador
      return responseJSON({ ok: true });
    }

    // Lança erro caso a ação enviada pelo frontend não coincida com nenhuma das opções acima
    throw new Error('Ação inválida.');
  } catch (err) {
    // Trata qualquer exceção ocorrida durante a execução e devolve uma resposta com ok: false e a mensagem de erro
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função auxiliar para formatar a resposta em JSON padrão de sucesso (ok: true)
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função auxiliar para padronizar o nome dos cabeçalhos das colunas das planilhas
function normalizeHeaderKey(key) {
  var k = String(key || '').trim().toLowerCase();
  if (k === 'id' || k === 'código' || k === 'codigo') return 'id';
  if (k === 'nome' || k === 'formador' || k === 'atividade' || k === 'descrição' || k === 'descricao') return 'nome';
  if (k === 'email' || k === 'e-mail') return 'email';
  if (k === 'perfil' || k === 'role') return 'perfil';
  return k;
}

// Função para ler dados de uma aba da planilha e converter em um array de objetos JSON organizados
function getNormalizedSheetData(sheet) {
  if (!sheet) return [];
  // Lê todos os valores preenchidos na aba
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  // Pega os cabeçalhos na primeira linha da aba
  var rawHeaders = values[0];
  // Padroniza os cabeçalhos das colunas
  var headers = rawHeaders.map(function(h) { return normalizeHeaderKey(h); });

  var result = [];
  // Percorre as linhas de dados (a partir da segunda linha)
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j] || ('col_' + j);
      obj[key] = String(values[i][j]).trim();
    }
    // Adiciona ao resultado apenas linhas que possuem id ou nome preenchidos
    if (obj.id || obj.nome) {
      if (!obj.id) obj.id = String(i);
      result.push(obj);
    }
  }
  return result;
}

// Função auxiliar para converter e padronizar formatos de datas para 'AAAA-MM-DD'
function normalizeDateStr(val) {
  if (!val) return '';
  // Se já for um objeto de data JavaScript
  if (val instanceof Date) {
    var y = val.getUTCFullYear();
    var m = ('0' + (val.getUTCMonth() + 1)).slice(-2);
    var d = ('0' + val.getUTCDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  var s = String(val).trim();
  if (s.indexOf('T') !== -1) {
    s = s.split('T')[0];
  }
  // Se a data vier no formato ISO/Ano-Mês-Dia (ex: 2026-09-28)
  var match = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
  }
  // Se a data vier no formato Brasileiro Dia/Mês/Ano (ex: 28/09/2026)
  var matchBR = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (matchBR) {
    return matchBR[3] + '-' + ('0' + matchBR[2]).slice(-2) + '-' + ('0' + matchBR[1]).slice(-2);
  }
  return s;
}

// Função auxiliar para limpar textos, nulos e remover decimais indesejados (como '.0')
function cleanVal(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\.0$/, '');
}

// Função para buscar o número da linha na planilha correspondente a um formador e semana específicos
function findPlanningRow(sheet, teacher, week) {
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  var targetTeacher = cleanVal(teacher).toLowerCase();
  var targetWeek = normalizeDateStr(week);

  var ss = sheet.getParent();
  // Busca o catálogo de formadores para permitir a comparação tanto por Nome, ID quanto por E-mail
  var formadores = getNormalizedSheetData(ss.getSheetByName('Formadores'));
  var matchedTeacher = formadores.find(function(f) {
    return cleanVal(f.id).toLowerCase() === targetTeacher ||
           cleanVal(f.nome).toLowerCase() === targetTeacher ||
           cleanVal(f.email).toLowerCase() === targetTeacher;
  });

  var possibleIdentifiers = [targetTeacher];
  if (matchedTeacher) {
    if (matchedTeacher.id) possibleIdentifiers.push(cleanVal(matchedTeacher.id).toLowerCase());
    if (matchedTeacher.nome) possibleIdentifiers.push(cleanVal(matchedTeacher.nome).toLowerCase());
    if (matchedTeacher.email) possibleIdentifiers.push(cleanVal(matchedTeacher.email).toLowerCase());
  }

  // Percorre todas as linhas cadastradas na aba 'Planejamentos'
  for (var i = 1; i < values.length; i++) {
    var rowTeacher = cleanVal(values[i][1]).toLowerCase();
    var rowWeek = normalizeDateStr(values[i][2]);

    // Se o identificador do formador e a data da semana baterem, retorna o número da linha
    if (possibleIdentifiers.indexOf(rowTeacher) !== -1 && rowWeek === targetWeek) {
      return i + 1;
    }
  }
  return null;
}

// Função para carregar todos os planejamentos referentes a uma semana específica
function loadAllPlanningsForWeek(sheet, week) {
  var plans = {};
  if (!sheet) return plans;
  var values = sheet.getDataRange().getValues();
  var targetWeek = normalizeDateStr(week);

  // Percorre as linhas de planejamentos salvos
  for (var i = 1; i < values.length; i++) {
    var rowTeacher = cleanVal(values[i][1]);
    var rowWeek = normalizeDateStr(values[i][2]);

    // Se pertencer à semana procurada, extrai os 10 períodos e monta o objeto do mapa
    if (rowWeek === targetWeek) {
      try {
        var slots = JSON.parse(values[i][3] || '[]');
        plans[rowTeacher] = slots;
      } catch(e) {
        plans[rowTeacher] = Array(10).fill('');
      }
    }
  }
  return plans;
}