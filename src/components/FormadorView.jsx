// Importa o React e hooks para gerenciar estado, efeitos e callbacks memorizados
import React, { useState, useEffect, useCallback } from 'react';

// Importa listas estáticas de formadores e atividades
import { DEFAULT_TEACHERS, DEFAULT_ACTIVITIES } from '../constants/defaults';

// Importa utilitários de manipulação e formatação de datas
import { DAYS_OF_WEEK, getMondayOfCurrentWeek, formatDateBR, getFridayFromMonday } from '../utils/dateUtils';

// Importa a função de integração de API
import { apiCall } from '../services/api';

// Importa o contexto de autenticação para identificar o usuário logado
import { useAuth } from '../context/AuthContext';

// Importa a constante com e-mails que devem ser ocultados do menu de seleção
import { EMAILS_OCULTOS } from '../constants/hiddenAccounts';

export default function FormadorView() {
  // Extrai o usuário e perfil do contexto global
  const { user, isAdmin } = useAuth();
  
  // Estados de controle da interface (carregamento de dados e salvamento)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Referências para os catálogos padrão
  const teachers = DEFAULT_TEACHERS;
  const activities = DEFAULT_ACTIVITIES;

  // Estados locais do formulário de planejamento
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [currentMonday, setCurrentMonday] = useState(getMondayOfCurrentWeek());
  const [slots, setSlots] = useState(Array(10).fill(''));
  const [revision, setRevision] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Indica se há alterações pendentes de salvamento

  // 1. Efeito para auto-selecionar o formador caso o usuário logado corresponda a um formador cadastrado
  useEffect(() => {
    if (user && user.nome && teachers.length > 0 && !selectedTeacher) {
      const emailLogado = String(user?.email || '').trim().toLowerCase();
      // Ignora auto-seleção para contas ocultas (devs/admins)
      if (EMAILS_OCULTOS.some(o => o.trim().toLowerCase() === emailLogado)) return;

      const formadorEncontrado = teachers.find(
        t => t.nome?.trim().toLowerCase() === user.nome?.trim().toLowerCase() ||
             t.id?.trim().toLowerCase() === String(user.id || '').trim().toLowerCase() ||
             t.email?.trim().toLowerCase() === emailLogado
      );

      if (formadorEncontrado) {
        setSelectedTeacher(formadorEncontrado.id);
      }
    }
  }, [user, teachers, selectedTeacher]);

  // 2. Callback para carregar o planejamento de um formador para a semana selecionada
  const loadPlanning = useCallback(async (teacherId, week) => {
    setLoading(true);
    try {
      const data = await apiCall({ action: 'load', teacher: teacherId, week: week });
      if (!data) return;

      let rawSlots = data.slots;
      // Trata a conversão caso os slots venham do backend codificados em JSON string
      if (typeof rawSlots === 'string') {
        try { rawSlots = JSON.parse(rawSlots); } catch (e) { rawSlots = Array(10).fill(''); }
      }

      setSlots(Array.isArray(rawSlots) ? rawSlots : Array(10).fill(''));
      setRevision(data.revision || 0);
      setIsLocked(Boolean(data.isLocked));
      setIsDirty(false);
    } catch (err) {
      alert(`Erro ao carregar planejamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega os dados do planejamento sempre que trocar o formador ou a semana
  useEffect(() => {
    if (selectedTeacher) {
      loadPlanning(selectedTeacher, currentMonday);
    } else {
      setSlots(Array(10).fill(''));
      setRevision(0);
      setIsLocked(false);
      setIsDirty(false);
      setLoading(false);
    }
  }, [selectedTeacher, currentMonday, loadPlanning]);

  // Handler para troca manual do formador no select
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

  // Handler para trocar a semana (avançar ou recuar)
  function handleWeekChange(deltaWeeks) {
    if (isDirty) {
      if (window.confirm('Você possui alterações não salvas. Deseja mudar de semana mesmo assim?')) {
        changeWeek(deltaWeeks);
      }
    } else {
      changeWeek(deltaWeeks);
    }
  }

  // Calcula e atualiza a data da Segunda-feira deslocando o número de semanas
  function changeWeek(deltaWeeks) {
    const [year, month, day] = currentMonday.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaWeeks * 7);
    const mYear = d.getFullYear();
    const mMonth = String(d.getMonth() + 1).padStart(2, '0');
    const mDay = String(d.getDate()).padStart(2, '0');
    setCurrentMonday(`${mYear}-${mMonth}-${mDay}`);
  }

  // Atualiza o valor da atividade de um slot (0 a 9) e marca o formulário como modificado
  function handleSlotChange(index, value) {
    if (isLocked) return;
    const newSlots = [...slots];
    newSlots[index] = value;
    setSlots(newSlots);
    setIsDirty(true);
  }

  // Copia o planejamento da semana imediatamente anterior para a semana atual
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

  // Salva o planejamento da semana no backend via Google Apps Script
  async function handleSave() {
    if (!selectedTeacher) {
      alert('Selecione o seu nome de formador.');
      return;
    }
    if (isLocked) {
      alert('Este planejamento já foi enviado e está bloqueado.');
      return;
    }

    // Validação de obrigatoriedade: impede o envio caso falte preencher algum dos 10 períodos
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
      slots: JSON.stringify(slots), // <-- Adicione o JSON.stringify aqui
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

  // Cálculos visuais para contagem de preenchimento e exibição de intervalo da semana
  const filledCount = slots.filter(s => s && s !== '').length;
  const fridayIso = getFridayFromMonday(currentMonday);

  return (
    <div className="container">
      <h1 className="app-title">Agenda dos Formadores</h1>

      {/* Card de seleção do formador */}
      <div className="card">
        <label className="label">Nome do formador *</label>
        <select
          className="select-input"
          value={selectedTeacher}
          onChange={handleTeacherChange}
          disabled={loading || saving || !isAdmin} // Apenas administradores podem trocar o formador selecionado
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

      {/* Card de navegação de semanas e métricas */}
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

        {/* Contador dos 10 períodos semanais e botão de cópia */}
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

      {/* Grid de preenchimento dos dias da semana (Segunda a Sexta) */}
      {loading ? (
        <div className="loading-box">Carregando dados...</div>
      ) : (
        <div className="days-grid">
          {DAYS_OF_WEEK.map((dayName, dayIndex) => {
            const matIndex = dayIndex * 2;     // Mapeia os índices pares para o turno Matutino (0, 2, 4, 6, 8)
            const vesIndex = dayIndex * 2 + 1; // Mapeia os índices ímpares para o turno Vespertino (1, 3, 5, 7, 9)

            return (
              <div key={dayName} className="day-card">
                <h3 className="day-title">{dayName}</h3>

                {/* Bloco de seleção do turno Matutino */}
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

                {/* Bloco de seleção do turno Vespertino */}
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

      {/* Exibe aviso de bloqueio se já enviado, ou botão de salvamento caso aberto */}
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