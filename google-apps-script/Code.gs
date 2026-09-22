function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Retorna o catálogo de Formadores e Atividades
    if (action === 'catalog') {
      return responseJSON({
        teachers: getNormalizedSheetData(ss.getSheetByName('Formadores')),
        activities: getNormalizedSheetData(ss.getSheetByName('Atividades'))
      });
    }

    // 2. Carrega TODOS os planejamentos da semana (para o Dashboard)
    if (action === 'load_all') {
      var sheet = ss.getSheetByName('Planejamentos');
      var week = contents.week;
      var plans = loadAllPlanningsForWeek(sheet, week);
      return responseJSON({ plans: plans });
    }

    // 3. Carrega o planejamento de um formador específico
    if (action === 'load') {
      var sheet = ss.getSheetByName('Planejamentos');
      var teacher = contents.teacher;
      var week = contents.week;

      if (!teacher || teacher === 'ALL') {
        var plans = loadAllPlanningsForWeek(sheet, week);
        return responseJSON({ plans: plans });
      }

      var row = findPlanningRow(sheet, teacher, week);
      if (row) {
        var data = sheet.getRange(row, 1, 1, 5).getValues()[0];
        return responseJSON({
          slots: JSON.parse(data[3] || '[]'),
          revision: Number(data[4]) || 0,
          isLocked: true
        });
      } else {
        return responseJSON({
          slots: Array(10).fill(''),
          revision: 0,
          isLocked: false
        });
      }
    }

    // 4. Salva o planejamento (Formador - Validação Obrigatoriedade dos 10 Períodos)
    if (action === 'save') {
      var sheet = ss.getSheetByName('Planejamentos');
      if (!sheet) {
        sheet = ss.insertSheet('Planejamentos');
        sheet.appendRow(['ID', 'Teacher', 'Week', 'Slots', 'Revision', 'UpdatedAt']);
      }
      var teacher = contents.teacher;
      var week = contents.week;
      var slots = contents.slots;

      // Validação backend: garante que nenhum dos 10 slots esteja em branco
      if (!slots || slots.length < 10 || slots.some(function(s) { return !s || String(s).trim() === ''; })) {
        throw new Error('Todos os 10 períodos da semana devem estar preenchidos para enviar o planejamento.');
      }

      var row = findPlanningRow(sheet, teacher, week);

      if (row) {
        throw new Error('O planejamento para esta semana já foi enviado e não pode ser alterado pelo formador.');
      }

      sheet.appendRow([
        Utilities.getUuid(),
        String(teacher),
        normalizeDateStr(week),
        JSON.stringify(slots),
        1,
        new Date()
      ]);

      return responseJSON({ revision: 1 });
    }

    // 5. Salva / Atualiza o planejamento (Exclusivo para ADMINISTRADOR)
    if (action === 'admin_save') {
      var sheet = ss.getSheetByName('Planejamentos');
      if (!sheet) {
        sheet = ss.insertSheet('Planejamentos');
        sheet.appendRow(['ID', 'Teacher', 'Week', 'Slots', 'Revision', 'UpdatedAt']);
      }
      var teacher = contents.teacher;
      var week = contents.week;
      var slots = contents.slots;

      var row = findPlanningRow(sheet, teacher, week);
      var now = new Date();

      if (row) {
        var currentRev = Number(sheet.getRange(row, 5).getValue()) || 0;
        sheet.getRange(row, 4).setValue(JSON.stringify(slots));
        sheet.getRange(row, 5).setValue(currentRev + 1);
        sheet.getRange(row, 6).setValue(now);
      } else {
        sheet.appendRow([
          Utilities.getUuid(),
          String(teacher),
          normalizeDateStr(week),
          JSON.stringify(slots),
          1,
          now
        ]);
      }

      return responseJSON({ ok: true });
    }

    throw new Error('Ação inválida.');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeHeaderKey(key) {
  var k = String(key || '').trim().toLowerCase();
  if (k === 'id' || k === 'código' || k === 'codigo') return 'id';
  if (k === 'nome' || k === 'formador' || k === 'atividade' || k === 'descrição' || k === 'descricao') return 'nome';
  return k;
}

function getNormalizedSheetData(sheet) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var rawHeaders = values[0];
  var headers = rawHeaders.map(function(h) { return normalizeHeaderKey(h); });

  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j] || ('col_' + j);
      obj[key] = String(values[i][j]).trim();
    }
    if (obj.id || obj.nome) {
      if (!obj.id) obj.id = String(i);
      result.push(obj);
    }
  }
  return result;
}

function normalizeDateStr(val) {
  if (!val) return '';
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
  var match = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
  }
  var matchBR = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (matchBR) {
    return matchBR[3] + '-' + ('0' + matchBR[2]).slice(-2) + '-' + ('0' + matchBR[1]).slice(-2);
  }
  return s;
}

function cleanVal(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\.0$/, '');
}

function findPlanningRow(sheet, teacher, week) {
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  var targetTeacher = cleanVal(teacher);
  var targetWeek = normalizeDateStr(week);

  for (var i = 1; i < values.length; i++) {
    var rowTeacher = cleanVal(values[i][1]);
    var rowWeek = normalizeDateStr(values[i][2]);

    if ((rowTeacher === targetTeacher || rowTeacher.toLowerCase() === targetTeacher.toLowerCase()) && rowWeek === targetWeek) {
      return i + 1;
    }
  }
  return null;
}

function loadAllPlanningsForWeek(sheet, week) {
  var plans = {};
  if (!sheet) return plans;
  var values = sheet.getDataRange().getValues();
  var targetWeek = normalizeDateStr(week);

  for (var i = 1; i < values.length; i++) {
    var rowTeacher = cleanVal(values[i][1]);
    var rowWeek = normalizeDateStr(values[i][2]);

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