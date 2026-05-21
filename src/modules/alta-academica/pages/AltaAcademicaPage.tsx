import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../../store/AuthContext';
import { altaAcademicaApi } from '../../../api/alta-academica.api';
import {
  NIVELES, TURNOS, NIVEL_LABEL, TURNO_LABEL,
  type Curso, type Materia, type Periodo, type CicloLectivo,
} from '../../../shared/types/alta-academica.types';

// ─── Modal genérico ───────────────────────────────────────────────

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{title}</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tarjeta genérica ─────────────────────────────────────────────

function Card({ title, onAdd, children }: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <h2 style={S.cardTitle}>{title}</h2>
      </div>
      <div style={S.cardBody}>{children}</div>
      <div style={S.cardFooter}>
        <button style={S.btnCreate} onClick={onAdd}>
          + Crear {title}
        </button>
      </div>
    </div>
  );
}

// ─── Fila de ítem ─────────────────────────────────────────────────

function ItemRow({ label, sublabel, activo, onToggle, onEdit }: {
  label: string;
  sublabel?: string;
  activo: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div style={{ ...S.itemRow, opacity: activo ? 1 : 0.5 }}>
      <div style={{ flex: 1 }}>
        <span style={S.itemLabel}>{label}</span>
        {sublabel && <span style={S.itemSub}>{sublabel}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={S.btnEdit} onClick={onEdit} title="Editar">✏</button>
        <button
          style={{ ...S.btnToggle, ...(activo ? {} : S.btnToggleOff) }}
          onClick={onToggle}
          title={activo ? 'Desactivar' : 'Activar'}
        >
          {activo ? '●' : '○'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal Curso ──────────────────────────────────────────────────

function ModalCurso({ initial, materias, onClose, onSave }: {
  initial?: Curso;
  materias: Materia[];
  onClose: () => void;
  onSave: (data: { nombre: string; anio_academico: number; nivel?: string; turno?: string; materia_ids: string[] }) => void;
}) {
  const [form, setForm] = useState({
    nombre:         initial?.nombre ?? '',
    anio_academico: initial?.anio_academico ?? new Date().getFullYear(),
    nivel:          initial?.nivel ?? '',
    turno:          initial?.turno ?? '',
  });
  const [selectedMaterias, setSelectedMaterias] = useState<Set<string>>(
    new Set(initial?.materia_ids ?? []),
  );

  function toggleMateria(id: string) {
    setSelectedMaterias((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const activeMaterias = materias.filter((m) => m.activo);

  return (
    <Modal title={initial ? 'Editar curso' : 'Nuevo curso'} onClose={onClose}>
      <div style={S.formGroup}>
        <label style={S.label}>
          Nombre del curso *
          <input
            style={S.input}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: 1° Año A"
            autoFocus
          />
        </label>
        <label style={S.label}>
          Año académico *
          <input
            type="number"
            style={S.input}
            value={form.anio_academico}
            onChange={(e) => setForm((f) => ({ ...f, anio_academico: Number(e.target.value) }))}
            min={2000} max={2100}
          />
        </label>
        <label style={S.label}>
          Nivel
          <select style={S.input} value={form.nivel}
            onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}>
            <option value="">Sin especificar</option>
            {NIVELES.map((n) => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
          </select>
        </label>
        <label style={S.label}>
          Turno
          <select style={S.input} value={form.turno}
            onChange={(e) => setForm((f) => ({ ...f, turno: e.target.value }))}>
            <option value="">Sin especificar</option>
            {TURNOS.map((t) => <option key={t} value={t}>{TURNO_LABEL[t]}</option>)}
          </select>
        </label>

        {/* ── Materias ── */}
        <div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, marginBottom: 6 }}>
            Materias asignadas
            {selectedMaterias.size > 0 && (
              <span style={{ marginLeft: 6, color: '#2563eb', fontWeight: 600 }}>
                ({selectedMaterias.size})
              </span>
            )}
          </div>
          {activeMaterias.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No hay materias activas. Creá una en Alta Académica.
            </p>
          ) : (
            <div style={S.materiasChecklist}>
              {activeMaterias.map((m) => {
                const checked = selectedMaterias.has(m.id);
                return (
                  <label key={m.id} style={{ ...S.materiaCheckRow, background: checked ? '#eff6ff' : '#fff' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMateria(m.id)}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <span style={{ fontSize: 13, color: '#1e293b' }}>{m.nombre}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={S.modalActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          style={{ ...S.btnPrimary, opacity: !form.nombre ? 0.5 : 1 }}
          disabled={!form.nombre}
          onClick={() => onSave({
            nombre:         form.nombre,
            anio_academico: form.anio_academico,
            nivel:          form.nivel || undefined,
            turno:          form.turno || undefined,
            materia_ids:    [...selectedMaterias],
          })}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal simple (Materia / Periodo) ────────────────────────────

function ModalSimple({ title, placeholder, initial, onClose, onSave }: {
  title: string;
  placeholder: string;
  initial?: string;
  onClose: () => void;
  onSave: (nombre: string) => void;
}) {
  const [nombre, setNombre] = useState(initial ?? '');
  return (
    <Modal title={title} onClose={onClose}>
      <div style={S.formGroup}>
        <label style={S.label}>
          Nombre *
          <input
            style={S.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && nombre && onSave(nombre)}
          />
        </label>
      </div>
      <div style={S.modalActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          style={{ ...S.btnPrimary, opacity: !nombre ? 0.5 : 1 }}
          disabled={!nombre}
          onClick={() => onSave(nombre)}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal Ciclo Lectivo ──────────────────────────────────────────

function ModalCiclo({ initial, onClose, onSave }: {
  initial?: CicloLectivo;
  onClose: () => void;
  onSave: (anio: number) => void;
}) {
  const [anio, setAnio] = useState(initial?.anio ?? new Date().getFullYear());
  return (
    <Modal title={initial ? 'Editar ciclo' : 'Nuevo ciclo lectivo'} onClose={onClose}>
      <div style={S.formGroup}>
        <label style={S.label}>
          Año *
          <input
            type="number"
            style={S.input}
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            min={2000} max={2100}
            autoFocus
          />
        </label>
      </div>
      <div style={S.modalActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={() => onSave(anio)}>Guardar</button>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────

type ModalState =
  | { type: 'curso_new' }
  | { type: 'curso_edit'; item: Curso }
  | { type: 'materia_new' }
  | { type: 'materia_edit'; item: Materia }
  | { type: 'periodo_new' }
  | { type: 'periodo_edit'; item: Periodo }
  | { type: 'ciclo_new' }
  | { type: 'ciclo_edit'; item: CicloLectivo }
  | null;

export function AltaAcademicaPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState('');

  const { data: cursos   = [] } = useQuery({ queryKey: ['aa', 'cursos'],   queryFn: altaAcademicaApi.getCursos });
  const { data: materias = [] } = useQuery({ queryKey: ['aa', 'materias'], queryFn: altaAcademicaApi.getMaterias });
  const { data: periodos = [] } = useQuery({ queryKey: ['aa', 'periodos'], queryFn: altaAcademicaApi.getPeriodos });
  const { data: ciclos   = [] } = useQuery({ queryKey: ['aa', 'ciclos'],   queryFn: altaAcademicaApi.getCiclos });

  function invalidate(key: string) {
    qc.invalidateQueries({ queryKey: ['aa', key] });
  }

  function mutOpts(key: string) {
    return {
      onSuccess: () => { invalidate(key); setModal(null); setError(''); },
      onError:   (e: Error) => setError(e.message),
    };
  }

  // ── Cursos
  const createCurso  = useMutation({ mutationFn: altaAcademicaApi.createCurso,  ...mutOpts('cursos') });
  const updateCurso  = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof altaAcademicaApi.updateCurso>[1] }) => altaAcademicaApi.updateCurso(id, data), ...mutOpts('cursos') });
  const toggleCurso  = useMutation({ mutationFn: altaAcademicaApi.toggleCurso,  ...mutOpts('cursos') });

  // ── Materias
  const createMateria = useMutation({ mutationFn: altaAcademicaApi.createMateria, ...mutOpts('materias') });
  const updateMateria = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof altaAcademicaApi.updateMateria>[1] }) => altaAcademicaApi.updateMateria(id, data), ...mutOpts('materias') });
  const toggleMateria = useMutation({ mutationFn: altaAcademicaApi.toggleMateria, ...mutOpts('materias') });

  // ── Periodos
  const createPeriodo = useMutation({ mutationFn: altaAcademicaApi.createPeriodo, ...mutOpts('periodos') });
  const updatePeriodo = useMutation({ mutationFn: ({ id, nombre }: { id: string; nombre: string }) => altaAcademicaApi.updatePeriodo(id, nombre), ...mutOpts('periodos') });
  const togglePeriodo = useMutation({ mutationFn: altaAcademicaApi.togglePeriodo, ...mutOpts('periodos') });

  // ── Ciclos
  const createCiclo  = useMutation({ mutationFn: altaAcademicaApi.createCiclo,  ...mutOpts('ciclos') });
  const updateCiclo  = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof altaAcademicaApi.updateCiclo>[1] }) => altaAcademicaApi.updateCiclo(id, data), ...mutOpts('ciclos') });
  const toggleCiclo  = useMutation({ mutationFn: altaAcademicaApi.toggleCiclo,  ...mutOpts('ciclos') });

  const noEsStaff = !user?.roles?.some(r => ['admin', 'directivo', 'administrativo'].includes(r));
  if (noEsStaff) return <Navigate to="/calificaciones" replace />;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Alta Académica</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
          Configuración de cursos, materias, períodos y ciclos lectivos
        </p>
      </div>

      {error && (
        <div style={S.errorBox} onClick={() => setError('')}>
          {error} <span style={{ float: 'right', cursor: 'pointer' }}>✕</span>
        </div>
      )}

      <div style={S.grid}>

        {/* ── CURSOS ── */}
        <Card title="Cursos" onAdd={() => setModal({ type: 'curso_new' })}>
          {cursos.length === 0
            ? <p style={S.empty}>¿Desea crear un curso?</p>
            : cursos.map((c) => (
                <ItemRow
                  key={c.id}
                  label={c.nombre}
                  sublabel={`${c.anio_academico}${c.nivel ? ' · ' + NIVEL_LABEL[c.nivel] : ''}${c.turno ? ' · ' + TURNO_LABEL[c.turno] : ''}`}
                  activo={c.activo}
                  onEdit={() => setModal({ type: 'curso_edit', item: c })}
                  onToggle={() => toggleCurso.mutate(c.id)}
                />
              ))
          }
        </Card>

        {/* ── MATERIAS ── */}
        <Card title="Materias" onAdd={() => setModal({ type: 'materia_new' })}>
          {materias.length === 0
            ? <p style={S.empty}>¿Desea crear una materia?</p>
            : materias.map((m) => (
                <ItemRow
                  key={m.id}
                  label={m.nombre}
                  sublabel={m.codigo ?? undefined}
                  activo={m.activo}
                  onEdit={() => setModal({ type: 'materia_edit', item: m })}
                  onToggle={() => toggleMateria.mutate(m.id)}
                />
              ))
          }
        </Card>

        {/* ── PERIODOS ── */}
        <Card title="Periodos" onAdd={() => setModal({ type: 'periodo_new' })}>
          {periodos.length === 0
            ? <p style={S.empty}>¿Desea crear un periodo?</p>
            : periodos.map((p) => (
                <ItemRow
                  key={p.id}
                  label={p.nombre}
                  activo={p.activo}
                  onEdit={() => setModal({ type: 'periodo_edit', item: p })}
                  onToggle={() => togglePeriodo.mutate(p.id)}
                />
              ))
          }
        </Card>

        {/* ── CICLOS LECTIVOS ── */}
        <Card title="Ciclos Lectivos" onAdd={() => setModal({ type: 'ciclo_new' })}>
          {ciclos.length === 0
            ? <p style={S.empty}>¿Desea crear un ciclo lectivo?</p>
            : ciclos.map((cl) => (
                <ItemRow
                  key={cl.id}
                  label={cl.nombre}
                  activo={cl.activo}
                  onEdit={() => setModal({ type: 'ciclo_edit', item: cl })}
                  onToggle={() => toggleCiclo.mutate(cl.id)}
                />
              ))
          }
        </Card>

      </div>

      {/* ── MODALES ── */}

      {(modal?.type === 'curso_new') && (
        <ModalCurso
          materias={materias}
          onClose={() => setModal(null)}
          onSave={(data) => createCurso.mutate(data)}
        />
      )}
      {(modal?.type === 'curso_edit') && (
        <ModalCurso
          initial={modal.item}
          materias={materias}
          onClose={() => setModal(null)}
          onSave={(data) => updateCurso.mutate({ id: modal.item.id, data })}
        />
      )}

      {(modal?.type === 'materia_new') && (
        <ModalSimple
          title="Nueva materia"
          placeholder="Ej: Matemática"
          onClose={() => setModal(null)}
          onSave={(nombre) => createMateria.mutate({ nombre })}
        />
      )}
      {(modal?.type === 'materia_edit') && (
        <ModalSimple
          title="Editar materia"
          placeholder="Ej: Matemática"
          initial={modal.item.nombre}
          onClose={() => setModal(null)}
          onSave={(nombre) => updateMateria.mutate({ id: modal.item.id, data: { nombre } })}
        />
      )}

      {(modal?.type === 'periodo_new') && (
        <ModalSimple
          title="Nuevo periodo"
          placeholder="Ej: 1er trimestre"
          onClose={() => setModal(null)}
          onSave={(nombre) => createPeriodo.mutate(nombre)}
        />
      )}
      {(modal?.type === 'periodo_edit') && (
        <ModalSimple
          title="Editar periodo"
          placeholder="Ej: 1er trimestre"
          initial={modal.item.nombre}
          onClose={() => setModal(null)}
          onSave={(nombre) => updatePeriodo.mutate({ id: modal.item.id, nombre })}
        />
      )}

      {(modal?.type === 'ciclo_new') && (
        <ModalCiclo
          onClose={() => setModal(null)}
          onSave={(anio) => createCiclo.mutate(anio)}
        />
      )}
      {(modal?.type === 'ciclo_edit') && (
        <ModalCiclo
          initial={modal.item}
          onClose={() => setModal(null)}
          onSave={(anio) => updateCiclo.mutate({ id: modal.item.id, data: { anio, nombre: String(anio) } })}
        />
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 340,
  },
  cardHeader: {
    padding: '18px 20px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  cardBody: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
    maxHeight: 320,
  },
  cardFooter: {
    padding: '12px 20px',
    borderTop: '1px solid #f1f5f9',
  },
  empty: {
    margin: 0,
    padding: '32px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '9px 20px',
    borderBottom: '1px solid #f8fafc',
    gap: 8,
  },
  itemLabel: {
    display: 'block',
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 500,
  },
  itemSub: {
    display: 'block',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  btnCreate: {
    width: '100%',
    padding: '9px 0',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnEdit: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    padding: '3px 7px',
    color: '#64748b',
  },
  btnToggle: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 7px',
    color: '#16a34a',
  },
  btnToggleOff: {
    color: '#94a3b8',
  },
  btnPrimary: {
    padding: '9px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '9px 18px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  materiasChecklist: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    maxHeight: 180,
    overflowY: 'auto',
  },
  materiaCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    userSelect: 'none' as const,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '2px 6px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 20,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
  },
  input: {
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    background: '#fff',
  },
  modalActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#b91c1c',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
    cursor: 'pointer',
  },
};
