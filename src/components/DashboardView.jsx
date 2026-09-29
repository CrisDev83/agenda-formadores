// Importa o React e hooks fundamentais para controle de estado, efeitos e otimização
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Importa listas e configurações padrão de formadores e atividades
import { DEFAULT_TEACHERS, DEFAULT_ACTIVITIES } from '../constants/defaults';

// Importa utilitários para manipulação de dias e formatação de datas
import { DAYS_OF_WEEK, getMondayOfCurrentWeek, formatDateBR, getFridayFromMonday } from '../utils/dateUtils';

// Importa o serviço centralizado para chamadas de API
import { apiCall } from '../services/api';

// Importa o componente do modal de edição administrativa
import EditModal from './EditModal';

// Importa a lista de e-mails de contas que devem ser ocultadas da visualização geral
import { EMAILS_OCULTOS } from '../constants/hiddenAccounts';

// Componente principal para a tela do painel de administração (Dashboard)
export default function DashboardView() {
  // Estado para controlar o carregamento dos dados da API
  const [loading, setLoading] = useState(true);

  // Estado para armazenar a data da segunda-feira da semana atualmente exibida
  const [currentMonday, setCurrentMonday] = useState(getMondayOfCurrentWeek());

  // Estado para armazenar os planejamentos dos formadores carregados do backend
  const [plans, setPlans] = useState({});

  // Estado para indicar qual formador está sendo editado no modal (null se nenhum)
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Estado temporário dos slots (10 turnos) do formador que está sendo editado
  const [editSlots, setEditSlots] = useState(Array(10).fill(''));

  // Estado de carregamento do botão de salvar dentro do modal de edição
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Catálogos estáticos vindos diretamente do defaults.js
  const teachers = DEFAULT_TEACHERS;
  const activities = DEFAULT_ACTIVITIES;

  // Mapeia os IDs das atividades para seus nomes para rápido acesso visual
  const activitiesMap = useMemo(() => {
    const actMap = {};
    activities.forEach(a => {
      actMap[a.id] = a.nome;
      actMap[a.nome] = a.nome;
    });
    return actMap;
  }, [activities]);

  // Carrega apenas os planejamentos cadastrados para a semana informada
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Faz a requisição à API passando a ação e a data da segunda-feira
      const allPlansRes = await apiCall({ action: 'load_all', week: currentMonday });

      if (!allPlansRes) return;

      // Extrai os planos do retorno da API de forma tolerante a diferentes formatos
      const rawPlans = allPlansRes.plans || allPlansRes || {};
      const normalizedPlans = {};

      // Caso a resposta venha como Array
      if (Array.isArray(rawPlans)) {
        rawPlans.forEach(p => {
          let s = p.slots || p.slots_json;
          if (typeof s === 'string') { try { s = JSON.parse(s); } catch(e) { s = []; } }
          if (p.teacher || p.teacher_id || p.id) {
            normalizedPlans[String(p.teacher || p.teacher_id || p.id)] = s;
          }
        });
      } else if (typeof rawPlans === 'object') {
        // Caso a resposta venha como Objeto/Dicionário
        Object.keys(rawPlans).forEach(key => {
          let item = rawPlans[key];
          if (typeof item === 'string') { try { item = JSON.parse(item); } catch(e) { item = []; } }
          if (item && item.slots) {
            let s = item.slots;
            if (typeof s === 'string') { try { s = JSON.parse(s); } catch(e) { s = []; } }
            normalizedPlans[key] = s;
          } else if (Array.isArray(item)) {
            normalizedPlans[key] = item;
          }
        });
      }

      // Atualiza o estado com os planos devidamente normalizados
      setPlans(normalizedPlans);
    } catch (err) {
      console.error('Erro no Dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonday]); 

  // Executa o carregamento sempre que a semana selecionada for alterada
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Função para retroceder ou avançar semanas
  function handleWeekChange(deltaWeeks) {
    const [year, month, day] = currentMonday.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + deltaWeeks * 7);
    const mYear = d.getFullYear();
    const mMonth = String(d.getMonth() + 1).padStart(2, '0');
    const mDay = String(d.getDate()).padStart(2, '0');
    setCurrentMonday(`${mYear}-${mMonth}-${mDay}`);
  }

  // Abre o modal de edição e carrega os slots do formador selecionado
  function openEditModal(teacher) {
    let currentSlots = plans[teacher.id] || plans[teacher.nome] || plans[String(teacher.id)] || Array(10).fill('');
    if (typeof currentSlots === 'string') {
      try { currentSlots = JSON.parse(currentSlots); } catch (e) { currentSlots = Array(10).fill(''); }
    }
    if (!Array.isArray(currentSlots)) currentSlots = Array(10).fill('');
    
    setEditingTeacher(teacher);
    setEditSlots([...currentSlots]);
  }

  // Atualiza um slot específico na lista temporária de edição do modal
  function handleSlotChangeInModal(index, val) {
    const updated = [...editSlots];
    updated[index] = val;
    setEditSlots(updated);
  }

  // Salva as alterações feitas pelo administrador diretamente na API
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
      loadDashboardData(); // Recarrega os dados para atualizar a tela
    } catch (err) {
      alert(`Erro ao salvar alteração: ${err.message}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  // Calcula a data da sexta-feira com base na segunda-feira atual
  const fridayIso = getFridayFromMonday(currentMonday);

  // Filtra os formadores removendo contas marcadas como ocultas
  const visibleTeachers = teachers.filter(t => {
    const emailFormador = String(t.email || '').trim().toLowerCase();
    return !EMAILS_OCULTOS.some(o => o.trim().toLowerCase() === emailFormador);
  });

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      {/* Título Principal */}
      <h1 className="app-title">Visão Geral da Administração</h1>

      {/* Card de Navegação de Semanas */}
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

      {/* Exibição condicional: Carregando vs Grid de Cards dos Formadores */}
      {loading ? (
        <div className="loading-box">Carregando planejamentos da equipe...</div>
      ) : (
        /* Grid responsivo contendo o card de cada formador */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {visibleTeachers.map((teacher) => {
            // Busca os slots do formador em múltiplos possíveis formatos de chave
            let rawSlots = plans[teacher.id] || 
                           plans[String(teacher.id)] || 
                           plans[Number(teacher.id)] || 
                           plans[teacher.nome] || 
                           Array(10).fill('');

            // Trata caso venha como string JSON
            if (typeof rawSlots === 'string') {
              try { rawSlots = JSON.parse(rawSlots); } catch (e) { rawSlots = Array(10).fill(''); }
            }
            const slots = Array.isArray(rawSlots) ? rawSlots : Array(10).fill('');
            
            // Verifica se todos os 10 turnos da semana foram preenchidos
            const isFilled = slots.length === 10 && slots.every(s => s && s !== '');

            return (
              <div key={teacher.id} className="card" style={{ margin: 0, padding: '16px', position: 'relative' }}>
                {/* Cabeçalho do Card: Nome do Formador + Status + Botão Editar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{teacher.nome}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Badge de status (Completo / Incompleto) */}
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
                    {/* Botão de edição rápida */}
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

                {/* Lista detalhada dos dias da semana e turnos (Manhã e Tarde) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  {DAYS_OF_WEEK.map((dayName, dayIdx) => {
                    const matSlot = slots[dayIdx * 2];
                    const vesSlot = slots[dayIdx * 2 + 1];

                    // Mapeia o ID/chave da atividade para seu nome amigável
                    const matAct = activitiesMap[matSlot] || matSlot || '-';
                    const vesAct = activitiesMap[vesSlot] || vesSlot || '-';

                    return (
                      <div key={dayName} style={{ borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                        <div style={{ fontWeight: '600', color: '#475569' }}>{dayName}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#334155' }}>
                          {/* Turno da Manhã */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>• Manhã:</span>
                            <strong style={{ color: matAct !== '-' ? '#2563eb' : '#dc2626', textAlign: 'right' }}>{matAct}</strong>
                          </div>
                          {/* Turno da Tarde */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>• Tarde:</span>
                            <strong style={{ color: vesAct !== '-' ? '#2563eb' : '#dc2626', textAlign: 'right' }}>{vesAct}</strong>
                          </div>
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

      {/* Modal de Edição Administrativa (Renderizado apenas se editingTeacher != null) */}
      <EditModal
        editingTeacher={editingTeacher}
        currentMonday={currentMonday}
        fridayIso={fridayIso}
        editSlots={editSlots}
        activities={activities}
        savingAdmin={savingAdmin}
        onSlotChange={handleSlotChangeInModal}
        onClose={() => setEditingTeacher(null)}
        onSave={handleAdminSave}
      />
    </div>
  );
}