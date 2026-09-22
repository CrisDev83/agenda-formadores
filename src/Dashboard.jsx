import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [currentMonday, setCurrentMonday] = useState(getMonday(new Date()));
  const [teachers, setTeachers] = useState([]);
  const [activities, setActivities] = useState({});
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(false);

  // Calcula a segunda-feira da semana
  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadCatalogAndPlans();
  }, [currentMonday]);

  async function loadCatalogAndPlans() {
    setLoading(true);
    try {
      // 1. Carrega o catálogo de formadores e atividades
      const catRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'catalog' })
      });
      const catData = await catRes.json();

      if (catData.teachers) {
        setTeachers(catData.teachers);
        
        // Mapeia atividades para fácil busca de nomes
        const actMap = {};
        (catData.activities || []).forEach(a => {
          actMap[a.id] = a.nome || a.name || a.id;
        });
        setActivities(actMap);

        // 2. Carrega os planejamentos de todos os formadores para esta semana
        const plansMap = {};
        await Promise.all(
          catData.teachers.map(async (t) => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'load', teacher: t.id, week: currentMonday })
              });
              const data = await res.json();
              if (data.slots) {
                plansMap[t.id] = data.slots;
              }
            } catch (e) {
              console.error(`Erro ao carregar planejamento do professor ${t.id}`, e);
            }
          })
        );
        setPlans(plansMap);
      }
    } catch (err) {
      alert('Erro ao carregar dados do Dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>Visão Geral da Administração</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Acompanhamento semanal de planejamentos</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Semana (Segunda-feira):</label>
          <input 
            type="date" 
            value={currentMonday} 
            onChange={(e) => setCurrentMonday(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando planejamentos da equipe...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {teachers.map((teacher) => {
            const teacherSlots = plans[teacher.id] || Array(10).fill('');
            const hasData = teacherSlots.some(slot => slot !== '');

            return (
              <div key={teacher.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#2563eb', fontSize: '1.1rem' }}>{teacher.nome || teacher.name}</h3>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: hasData ? '#dcfce7' : '#f1f5f9', color: hasData ? '#166534' : '#64748b' }}>
                    {hasData ? 'Preenchido' : 'Pendente'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                  {days.map((day, dayIdx) => {
                    const matutinoId = teacherSlots[dayIdx * 2];
                    const vespertinoId = teacherSlots[dayIdx * 2 + 1];

                    return (
                      <div key={day} style={{ borderBottom: '1px dashed #f1f5f9', paddingBottom: '4px' }}>
                        <strong>{day}:</strong>
                        <div style={{ paddingLeft: '8px', color: '#334155' }}>
                          • Manhã: {activities[matutinoId] || <span style={{ color: '#94a3b8' }}>-</span>}<br/>
                          • Tarde: {activities[vespertinoId] || <span style={{ color: '#94a3b8' }}>-</span>}
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
    </div>
  );
}