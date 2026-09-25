import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_TEACHERS, DEFAULT_ACTIVITIES } from '../constants/defaults';
import { DAYS_OF_WEEK, getMondayOfCurrentWeek, formatDateBR, getFridayFromMonday } from '../utils/dateUtils';
import { apiCall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EMAILS_OCULTOS } from '../constants/hiddenAccounts';



export default function FormadorView() {
  const { user, isAdmin } = useAuth();
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
  const activeLoadRef = useRef(null);

  useEffect(() => {
    fetchCatalog();
  }, []);
  

  // 2. Seleciona o formador logado automaticamente (Admin ou Formador)
  useEffect(() => {
    // Só seleciona se ainda não houver nenhum selecionado e a lista tiver formadores
    if (user && user.nome && teachers.length > 0 && !selectedTeacher) {

      // Cancela a auto-seleção se o e-mail estiver na lista de e-mails ocultos
      const emailLogado = String(user?.email || '').trim().toLowerCase();
      if (EMAILS_OCULTOS.some(o => o.trim().toLowerCase() === emailLogado)) return;

      const formadorEncontrado = teachers.find(
        t => t.nome?.trim().toLowerCase() === user.nome?.trim().toLowerCase() ||
             t.id?.trim().toLowerCase() === user.nome?.trim().toLowerCase()
      );

      if (formadorEncontrado) {
        setSelectedTeacher(formadorEncontrado.id);
      }
    }
  }, [user, teachers, selectedTeacher]);


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
      if (data?.teachers?.length > 0) {
        setTeachers(data.teachers.map(t => ({
          id: String(t.id || t.nome || ''),
          nome: t.nome || t.id,
          email: t.email || ''
        })));
      }
      if (data?.activities?.length > 0) {
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
  // Identificador único para a combinação do formador + semana
  const currentRequestKey = `${teacherId}_${week}`;

  // SE JÁ HOUVER UMA REQUISIÇÃO IGUAL EM ANDAMENTO, CANCELA A SEGUNDA!
  if (activeLoadRef.current === currentRequestKey) return;

  activeLoadRef.current = currentRequestKey;
  setLoading(true);

  try {
    const data = await apiCall({ action: 'load', teacher: teacherId, week: week });

    // Se o usuário trocou de formador antes da resposta chegar, ignora
    if (activeLoadRef.current !== currentRequestKey) return;

    if (!data) return;

    let rawSlots = data.slots;
    if (typeof rawSlots === 'string') {
      try { rawSlots = JSON.parse(rawSlots); } catch (e) { rawSlots = Array(10).fill(''); }
    }

    setSlots(Array.isArray(rawSlots) ? rawSlots : Array(10).fill(''));
    setRevision(data.revision || 0);
    setIsLocked(Boolean(data.isLocked));
    setIsDirty(false);
  } catch (err) {
    console.error(`Erro ao carregar planejamento: ${err.message}`);
  } finally {
    if (activeLoadRef.current === currentRequestKey) {
      setLoading(false);
      activeLoadRef.current = null;
    }
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
      if (!data) return;

      let rawSlots = data.slots;
      if (typeof rawSlots === 'string') {
        try { rawSlots = JSON.parse(rawSlots); } catch (e) { rawSlots = Array(10).fill(''); }
      }
      const prevSlots = Array.isArray(rawSlots) ? rawSlots : Array(10).fill('');

      if (prevSlots.every(s => !s)) {
        alert('A semana anterior está vazia.');
        return;
      }

      setSlots(prevSlots);
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
              disabled={loading || saving || !isAdmin}
          >
              <option value="">[Selecione o nome]</option>
              {teachers
                .filter(t => {
                  const emailFormador = String(t.email || '').trim().toLowerCase();
                  return !EMAILS_OCULTOS.some(o => o.trim().toLowerCase() === emailFormador);
                })
                .map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))
              }
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