import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
const DAYS_OF_WEEK = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const DEFAULT_TEACHERS = [
  { id: '1', nome: 'Rosiani - CRECHE', email: 'rosiane.boeing@edu.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '2', nome: 'Patrícia Leite - PRÉ-ESCOLAR', email: 'patricia.leite@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '3', nome: 'Vânia - AI - 1º ao 4º', email: 'vania.cardoso@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '4', nome: 'Luciana - AI - 5º e AF - 6º ao 8º', email: 'luciana.wachholz@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '5', nome: 'Daiane - EDUCAÇÃO PELO SENSÍVEL', email: 'daiane.gava@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '6', nome: 'Rosane Palandi - EDUCAÇÃO ESPECIAL', email: 'rosane.palandi@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '7', nome: 'Marizete - EDUCAÇÃO FÍSICA', email: 'marizete.augusto@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '8', nome: 'Gabrielle - ARTE', email: 'gabrielle.teixeira@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '9', nome: 'Cleusa - Ética e Cidadania/ ERER', email: 'cleusa.araujo@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '10', nome: 'Sandra Fock - AVALIAÇÕES AI', email: 'sandra.fock@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '11', nome: 'Evandro - AVALIAÇÕES AF', email: 'evandro.leithold@prof.garuva.sc.gov.br', perfil: 'Formador' },
  { id: '12', nome: 'Adriane - NTE/ Educação Digital', email: 'adriane.galando@edu.garuva.sc.gov.br', perfil: 'Admin' },
  { id: '13', nome: 'Cris Vieira - Dev', email: 'cristhian.vieira@edu.garuva.sc.gov.br', perfil: 'Admin' },
  { id: '14', nome: 'Cris - Teste', email: 'cristhian.dev83@gmail.com', perfil: 'Formador' }
];

const DEFAULT_ACTIVITIES = [
  { id: 'act_1', nome: 'Formação na Escola' },
  { id: 'act_2', nome: 'Formação Fora da Escola' },
  { id: 'act_3', nome: 'Hora Atividade' },
  { id: 'act_4', nome: 'Evento Externo' },
  { id: 'act_5', nome: 'Médico / Atestado' },
  { id: 'act_6', nome: 'Assunto Particular' },
  { id: 'act_7', nome: 'Banco de Horas' },
  { id: 'act_8', nome: 'Mestrado / Doutorado' },
  { id: 'act_9', nome: 'Regente Turma' },
  { id: 'act_10', nome: 'Visita a Escola' },
  { id: 'act_11', nome: 'Sem Expediente' },
  { id: 'act_12', nome: 'Folga / Feriado' },
  { id: 'act_13', nome: 'Licença' }
];

function getMondayOfCurrentWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const mDay = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${mDay}`;
}

function formatDateBR(isoString) {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-');
  return `${day}/${month}/${year}`;
}

function getFridayFromMonday(mondayIso) {
  const [year, month, day] = mondayIso.split('-').map(Number);
  const mondayDate = new Date(year, month - 1, day);
  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(mondayDate.getDate() + 4);
  const fYear = fridayDate.getFullYear();
  const fMonth = String(fridayDate.getMonth() + 1).padStart(2, '0');
  const fDay = String(fridayDate.getDate()).padStart(2, '0');
  return `${fYear}-${fMonth}-${fDay}`;
}

async function apiCall(body) {
  if (!API_URL || API_URL.includes('SUA_URL_DA_WEB_APP_AQUI')) {
    throw new Error('URL da API não configurada.');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
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
    
    // TRATAMENTO DO ERRO DE ABORTO (Ignora alertas na tela)
    if (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('signal')) {
      console.warn('Requisição cancelada/abortada:', err.message);
      return null;
    }
    
    throw err;
  }
}

// COMPONENTE DASHBOARD (ADMINISTRATIVO)
function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activitiesMap, setActivitiesMap] = useState({});
  const [currentMonday, setCurrentMonday] = useState(getMondayOfCurrentWeek());
  const [plans, setPlans] = useState({});

  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editSlots, setEditSlots] = useState(Array(10).fill(''));
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [currentMonday]);

async function loadDashboardData() {
    setLoading(true);
    try {
      const catalogData = await apiCall({ action: 'catalog' });
      if (!catalogData) return;

      let teacherList = DEFAULT_TEACHERS;
      let actList = DEFAULT_ACTIVITIES;

      if (catalogData.teachers && catalogData.teachers.length > 0) {
        teacherList = catalogData.teachers.map(t => ({
          id: String(t.id || t.nome || ''),
          nome: t.nome || t.id
        }));
        setTeachers(teacherList);
      }

      if (catalogData.activities && catalogData.activities.length > 0) {
        actList = catalogData.activities.map(a => ({
          id: String(a.id || a.nome || ''),
          nome: a.nome || a.id
        }));
        setActivities(actList);
      }

      const actMap = {};
      actList.forEach(a => {
        actMap[a.id] = a.nome;
        actMap[a.nome] = a.nome;
      });
      setActivitiesMap(actMap);

      const allPlansRes = await apiCall({ action: 'load_all', week: currentMonday });
      if (!allPlansRes) return;

      const plansData = allPlansRes.plans || allPlansRes || {};
      setPlans(plansData);

    } catch (err) {
      console.error('Erro no Dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleWeekChange(deltaWeeks) {
    const [year, month, day] = currentMonday.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaWeeks * 7);
    const mYear = d.getFullYear();
    const mMonth = String(d.getMonth() + 1).padStart(2, '0');
    const mDay = String(d.getDate()).padStart(2, '0');
    setCurrentMonday(`${mYear}-${mMonth}-${mDay}`);
  }

  function openEditModal(teacher) {
    const currentSlots = plans[teacher.id] || plans[teacher.nome] || plans[String(teacher.id)] || Array(10).fill('');
    setEditingTeacher(teacher);
    setEditSlots([...currentSlots]);
  }

  function handleSlotChangeInModal(index, val) {
    const updated = [...editSlots];
    updated[index] = val;
    setEditSlots(updated);
  }

  async function handleAdminSave() {
    if (!editingTeacher) return;
    setSavingAdmin(true);
    try {
      await apiCall({
        action: 'admin_save',
        teacher: editingTeacher.id,
        week: currentMonday,
        slots: editSlots
      });
      alert(`Planejamento de ${editingTeacher.nome} atualizado com sucesso!`);
      setEditingTeacher(null);
      loadDashboardData();
    } catch (err) {
      alert(`Erro ao salvar alteração: ${err.message}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  const fridayIso = getFridayFromMonday(currentMonday);

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <h1 className="app-title">Visão Geral da Administração</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <label className="label">Semana em Exibição</label>
        <div className="week-selector">
          <button className="btn btn-secondary" onClick={() => handleWeekChange(-1)} disabled={loading}>
            Anterior
          </button>
          <span className="week-text">
            {formatDateBR(currentMonday)} a {formatDateBR(fridayIso)}
          </span>
          <button className="btn btn-secondary" onClick={() => handleWeekChange(1)} disabled={loading}>
            Próxima
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-box">Carregando planejamentos da equipe...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {teachers.map((teacher) => {
            const slots = plans[teacher.id] || 
              plans[String(teacher.id)] || 
              plans[Number(teacher.id)] || 
              plans[teacher.nome] || 
              Array(10).fill('');
            const isFilled = slots.length === 10 && slots.every(s => s && s !== '');

            return (
              <div key={teacher.id} className="card" style={{ margin: 0, padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{teacher.nome}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: isFilled ? '#dcfce7' : '#fee2e2',
                      color: isFilled ? '#166534' : '#991b1b'
                    }}>
                      {isFilled ? 'Completo' : 'Incompleto'}
                    </span>
                    <button
                      onClick={() => openEditModal(teacher)}
                      title="Editar planejamento deste formador"
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '0.85rem'
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  {DAYS_OF_WEEK.map((dayName, dayIdx) => {
                    const matSlot = slots[dayIdx * 2];
                    const vesSlot = slots[dayIdx * 2 + 1];

                    const matAct = activitiesMap[matSlot] || matSlot || '-';
                    const vesAct = activitiesMap[vesSlot] || vesSlot || '-';

                    return (
                      <div key={dayName} style={{ borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                        <div style={{ fontWeight: '600', color: '#475569' }}>{dayName}</div>
                        <div style={{ paddingLeft: '8px', color: '#334155' }}>
                          • Manhã: <strong style={{ color: matAct !== '-' ? '#2563eb' : '#dc2626' }}>{matAct}</strong><br/>
                          • Tarde: <strong style={{ color: vesAct !== '-' ? '#2563eb' : '#dc2626' }}>{vesAct}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO ADMINISTRATIVA */}
      {editingTeacher && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
            maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#1e293b' }}>
              Editar Planejamento: <span style={{ color: '#2563eb' }}>{editingTeacher.nome}</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Semana de {formatDateBR(currentMonday)} a {formatDateBR(fridayIso)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {DAYS_OF_WEEK.map((dayName, dayIdx) => {
                const matIdx = dayIdx * 2;
                const vesIdx = dayIdx * 2 + 1;

                return (
                  <div key={dayName} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#334155' }}>{dayName}</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Matutino</label>
                        <select
                          className="select-input"
                          style={{ fontSize: '0.85rem', padding: '6px' }}
                          value={editSlots[matIdx] || ''}
                          onChange={(e) => handleSlotChangeInModal(matIdx, e.target.value)}
                        >
                          <option value="">Não informado</option>
                          {activities.map(act => (
                            <option key={act.id} value={act.id}>{act.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Vespertino</label>
                        <select
                          className="select-input"
                          style={{ fontSize: '0.85rem', padding: '6px' }}
                          value={editSlots[vesIdx] || ''}
                          onChange={(e) => handleSlotChangeInModal(vesIdx, e.target.value)}
                        >
                          <option value="">Não informado</option>
                          {activities.map(act => (
                            <option key={act.id} value={act.id}>{act.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setEditingTeacher(null)} disabled={savingAdmin}>
                Cancelar
              </button>
              <button className="btn btn-save" onClick={handleAdminSave} disabled={savingAdmin} style={{ margin: 0, width: 'auto' }}>
                {savingAdmin ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE PRINCIPAL (FORMULÁRIO DO FORMADOR)
export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDashboard = urlParams.get('view') === 'dashboard';

  if (isDashboard) {
    return <DashboardView />;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [currentMonday, setCurrentMonday] = useState(getMondayOfCurrentWeek());
  const [slots, setSlots] = useState(Array(10).fill(''));
  const [revision, setRevision] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      loadPlanning(selectedTeacher, currentMonday);
    } else {
      setSlots(Array(10).fill(''));
      setRevision(0);
      setIsLocked(false);
      setIsDirty(false);
    }
  }, [selectedTeacher, currentMonday]);

  async function fetchCatalog() {
    setLoading(true);
    try {
      const data = await apiCall({ action: 'catalog' });
      if (data.teachers && data.teachers.length > 0) {
        setTeachers(data.teachers.map(t => ({
          id: String(t.id || t.nome || ''),
          nome: t.nome || t.id
        })));
      }
      if (data.activities && data.activities.length > 0) {
        setActivities(data.activities.map(a => ({
          id: String(a.id || a.nome || ''),
          nome: a.nome || a.id
        })));
      }
    } catch (err) {
      console.warn('Usando catálogo padrão:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlanning(teacherId, week) {
    setLoading(true);
    try {
      const data = await apiCall({ action: 'load', teacher: teacherId, week: week });
      if (!data) return; // Se a requisição foi cancelada, encerra sem dar erro

      setSlots(data.slots || Array(10).fill(''));
      setRevision(data.revision || 0);
      setIsLocked(Boolean(data.isLocked));
      setIsDirty(false);
    } catch (err) {
      alert(`Erro ao carregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleTeacherChange(e) {
    const newTeacher = e.target.value;
    if (isDirty) {
      if (window.confirm('Você possui alterações não salvas. Deseja trocar de formador mesmo assim?')) {
        setSelectedTeacher(newTeacher);
      }
    } else {
      setSelectedTeacher(newTeacher);
    }
  }

  function handleWeekChange(deltaWeeks) {
    if (isDirty) {
      if (window.confirm('Você possui alterações não salvas. Deseja mudar de semana mesmo assim?')) {
        changeWeek(deltaWeeks);
      }
    } else {
      changeWeek(deltaWeeks);
    }
  }

  function changeWeek(deltaWeeks) {
    const [year, month, day] = currentMonday.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaWeeks * 7);
    const mYear = d.getFullYear();
    const mMonth = String(d.getMonth() + 1).padStart(2, '0');
    const mDay = String(d.getDate()).padStart(2, '0');
    setCurrentMonday(`${mYear}-${mMonth}-${mDay}`);
  }

  function handleSlotChange(index, value) {
    if (isLocked) return;
    const newSlots = [...slots];
    newSlots[index] = value;
    setSlots(newSlots);
    setIsDirty(true);
  }

async function handleCopyPreviousWeek() {
    if (!selectedTeacher) {
      alert('Selecione um formador primeiro.');
      return;
    }
    if (isLocked) {
      alert('Este planejamento já foi enviado e não pode ser alterado.');
      return;
    }

    const [year, month, day] = currentMonday.split('-').map(Number);
    const prevDate = new Date(year, month - 1, day);
    prevDate.setDate(prevDate.getDate() - 7);
    const pYear = prevDate.getFullYear();
    const pMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const pDay = String(prevDate.getDate()).padStart(2, '0');
    const prevMonday = `${pYear}-${pMonth}-${pDay}`;

    setLoading(true);
    try {
      const data = await apiCall({ action: 'load', teacher: selectedTeacher, week: prevMonday });
      
      // TRATAMENTO CASO A REQUISIÇÃO SEJA ABORTADA
      if (!data) return;

      if (!data.slots || data.slots.every(s => !s)) {
        alert('A semana anterior está vazia.');
        return;
      }

      setSlots(data.slots);
      setIsDirty(true);
      alert('Semana anterior copiada para a tela. Lembre-se de salvar.');
    } catch (err) {
      alert(`Erro ao copiar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedTeacher) {
      alert('Selecione o seu nome de formador.');
      return;
    }
    if (isLocked) {
      alert('Este planejamento já foi enviado e está bloqueado.');
      return;
    }

    // VALIDAÇÃO DE OBRIGATORIEDADE DOS 10 PERÍODOS
    const emptyCount = slots.filter(s => !s || s.trim() === '').length;
    if (emptyCount > 0) {
      alert(`Atenção: Você precisa preencher todos os 10 períodos da semana antes de enviar!\n\nAinda restam ${emptyCount} período(s) sem preenchimento.`);
      return;
    }

    setSaving(true);
    try {
      await apiCall({
        action: 'save',
        teacher: selectedTeacher,
        week: currentMonday,
        slots: slots,
        revision: revision
      });

      alert('Planejamento salvo com sucesso!');
      setIsLocked(true);
      setIsDirty(false);
    } catch (err) {
      alert(`Falha ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const filledCount = slots.filter(s => s && s !== '').length;
  const fridayIso = getFridayFromMonday(currentMonday);

  return (
    <div className="container">
      <h1 className="app-title">Agenda dos Formadores</h1>

      <div className="card">
        <label className="label">Nome do formador *</label>
        <select
          className="select-input"
          value={selectedTeacher}
          onChange={handleTeacherChange}
          disabled={loading || saving}
        >
          <option value="">[Selecione o nome]</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <label className="label">Semana de Planejamento</label>
        <div className="week-selector">
          <button className="btn btn-secondary" onClick={() => handleWeekChange(-1)} disabled={loading || saving}>
            Anterior
          </button>
          <span className="week-text">
            {formatDateBR(currentMonday)} a {formatDateBR(fridayIso)}
          </span>
          <button className="btn btn-secondary" onClick={() => handleWeekChange(1)} disabled={loading || saving}>
            Próxima
          </button>
        </div>

        <div className="counter-wrapper">
          <span className="counter-text">
            Períodos preenchidos: <span className="counter-value" style={{ color: filledCount === 10 ? '#166534' : '#dc2626' }}>{filledCount}/10</span>
          </span>
          <button
            className="btn"
            onClick={handleCopyPreviousWeek}
            disabled={loading || saving || !selectedTeacher || isLocked}
          >
            Copiar semana anterior
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-box">Carregando dados...</div>
      ) : (
        <div className="days-grid">
          {DAYS_OF_WEEK.map((dayName, dayIndex) => {
            const matIndex = dayIndex * 2;
            const vesIndex = dayIndex * 2 + 1;

            return (
              <div key={dayName} className="day-card">
                <h3 className="day-title">{dayName}</h3>

                <div className="slot-block">
                  <span className="period-label">Matutino *</span>
                  <select
                    className="select-input"
                    style={{ borderColor: (!slots[matIndex] && selectedTeacher) ? '#fca5a5' : '#cbd5e1' }}
                    value={slots[matIndex] || ''}
                    onChange={(e) => handleSlotChange(matIndex, e.target.value)}
                    disabled={saving || isLocked}
                  >
                    <option value="">[ Selecione a atividade ]</option>
                    {activities.map(act => (
                      <option key={act.id} value={act.id}>{act.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="slot-block">
                  <span className="period-label">Vespertino *</span>
                  <select
                    className="select-input"
                    style={{ borderColor: (!slots[vesIndex] && selectedTeacher) ? '#fca5a5' : '#cbd5e1' }}
                    value={slots[vesIndex] || ''}
                    onChange={(e) => handleSlotChange(vesIndex, e.target.value)}
                    disabled={saving || isLocked}
                  >
                    <option value="">[ Selecione a atividade ]</option>
                    {activities.map(act => (
                      <option key={act.id} value={act.id}>{act.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLocked ? (
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fcd34d',
          padding: '14px 20px',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          marginTop: '20px',
          fontSize: '0.95rem'
        }}>
          🔒 Este planejamento já foi enviado e está bloqueado para alterações.
        </div>
      ) : (
        <button
          className="btn btn-save"
          onClick={handleSave}
          disabled={saving || loading || !selectedTeacher}
        >
          {saving ? 'Salvando...' : 'Salvar Agenda Semanal'}
        </button>
      )}
    </div>
  );
}