import React from 'react';
import { DAYS_OF_WEEK, formatDateBR } from '../utils/dateUtils';

export default function EditModal({
  editingTeacher,
  currentMonday,
  fridayIso,
  editSlots,
  activities,
  savingAdmin,
  onSlotChange,
  onClose,
  onSave
}) {
  if (!editingTeacher) return null;

  return (
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
                      onChange={(e) => onSlotChange(matIdx, e.target.value)}
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
                      onChange={(e) => onSlotChange(vesIdx, e.target.value)}
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
          <button className="btn btn-secondary" onClick={onClose} disabled={savingAdmin}>
            Cancelar
          </button>
          <button className="btn btn-save" onClick={onSave} disabled={savingAdmin} style={{ margin: 0, width: 'auto' }}>
            {savingAdmin ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}