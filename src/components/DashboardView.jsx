import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_TEACHERS, DEFAULT_ACTIVITIES } from '../constants/defaults';
import { DAYS_OF_WEEK, getMondayOfCurrentWeek, formatDateBR, getFridayFromMonday } from '../utils/dateUtils';
import { apiCall } from '../services/api';
import EditModal from './EditModal';

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activitiesMap, setActivitiesMap] = useState({});
  const [currentMonday, setCurrentMonday] = useState(getMondayOfCurrentWeek());
  const [plans, setPlans] = useState({});

  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editSlots, setEditSlots] = useState(Array(10).fill(''));
  const [savingAdmin, setSavingAdmin] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const catalogData = await apiCall({ action: 'catalog' });
      
      let teacherList = DEFAULT_TEACHERS;
      let actList = DEFAULT_ACTIVITIES;

      if (catalogData?.teachers && catalogData.teachers.length > 0) {
        teacherList = catalogData.teachers.map(t => ({
          id: String(t.id || t.nome || ''),
          nome: t.nome || t.id
        }));
        setTeachers(teacherList);
      }

      if (catalogData?.activities && catalogData.activities.length > 0) {
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

      const rawPlans = allPlansRes.plans || allPlansRes || {};
      const normalizedPlans = {};

      if (Array.isArray(rawPlans)) {
        rawPlans.forEach(p => {
          let s = p.slots || p.slots_json;
          if (typeof s === 'string') { try { s = JSON.parse(s); } catch(e) { s = []; } }
          if (p.teacher || p.teacher_id || p.id) {
            normalizedPlans[String(p.teacher || p.teacher_id || p.id)] = s;
          }
        });
      } else if (typeof rawPlans === 'object') {
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

      setPlans(normalizedPlans);
    } catch (err) {
      console.error('Erro no Dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
    let currentSlots = plans[teacher.id] || plans[teacher.nome] || plans[String(teacher.id)] || Array(10).fill('');
    if (typeof currentSlots === 'string') {
      try { currentSlots = JSON.parse(currentSlots); } catch (e) { currentSlots = Array(10).fill(''); }
    }
    if (!Array.isArray(currentSlots)) currentSlots = Array(10).fill('');
    
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
            let rawSlots = plans[teacher.id] || 
                           plans[String(teacher.id)] || 
                           plans[Number(teacher.id)] || 
                           plans[teacher.nome] || 
                           Array(10).fill('');

            if (typeof rawSlots === 'string') {
              try { rawSlots = JSON.parse(rawSlots); } catch (e) { rawSlots = Array(10).fill(''); }
            }
            const slots = Array.isArray(rawSlots) ? rawSlots : Array(10).fill('');
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>• Manhã:</span>
                          <strong style={{ color: matAct !== '-' ? '#2563eb' : '#dc2626', textAlign: 'right' }}>{matAct}</strong>
                        </div>
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