import { useState, type FormEvent } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import { abrirTurno, anotarOcurrencia, cerrarTurno, turnoAbierto } from '../lib/acciones';
import type { Ocurrencia } from '../lib/types';
import { fmtDT, fmtT } from '../lib/util';
import { Modal, toast } from '../components/ui';

/** Barra de turno: quién está de guardia y desde cuándo, con relevo. */
export function BarraTurno() {
  const { perfil } = useSesion(); const p = useDatos();
  const turno = turnoAbierto(p);
  const [modal, setModal] = useState<null | 'abrir' | 'cerrar'>(null);
  const [notas, setNotas] = useState('');
  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (modal === 'abrir') { await abrirTurno(p, perfil!, notas); toast('Turno iniciado'); }
    else if (turno) { await cerrarTurno(p, turno, notas); toast('Turno entregado'); }
    setNotas(''); setModal(null);
  }
  return <>
    {turno
      ? <span className="pill ok">Turno de {turno.vigilante} desde {fmtT(turno.inicio)}</span>
      : <span className="pill warn">Sin turno abierto</span>}
    {turno
      ? <button className="btn sm" onClick={() => setModal('cerrar')}>Entregar turno</button>
      : <button className="btn sm primary" onClick={() => setModal('abrir')}>Iniciar turno</button>}
    {modal && <Modal onClose={() => setModal(null)}>
      <span className="eyebrow">{modal === 'abrir' ? 'Inicio de turno' : 'Entrega de turno'}</span>
      <h3>{modal === 'abrir' ? `Turno de ${perfil?.nombre}` : `Entregar el turno de ${turno?.vigilante}`}</h3>
      {modal === 'abrir' && <p className="small">Todo lo que registres desde ahora queda a tu nombre en la bitácora.</p>}
      <form onSubmit={confirmar} className="grid">
        <label>{modal === 'abrir' ? 'Novedades recibidas del turno anterior' : 'Novedades que dejas al relevo'}
          <textarea rows={4} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. portón peatonal con chapa floja; la obra del lote 21 sigue mañana" />
        </label>
        <button className="btn primary block">{modal === 'abrir' ? 'Iniciar turno' : 'Entregar turno'}</button>
      </form>
      <button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button>
    </Modal>}
  </>;
}

/** Libro de ocurrencias: notas e incidentes del turno, con fecha, hora y autor. */
export function Ocurrencias() {
  const { perfil } = useSesion(); const p = useDatos();
  const turno = turnoAbierto(p);
  const lista = p.all<Ocurrencia>('ocurrencias').sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8);
  const [texto, setTexto] = useState(''); const [grave, setGrave] = useState(false);
  async function anotar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    await anotarOcurrencia(p, perfil!, texto.trim(), grave ? 'incidente' : 'nota');
    setTexto(''); setGrave(false); toast('Anotado en el libro de ocurrencias');
  }
  return <div className="card">
    <div className="row between"><h3>Libro de ocurrencias</h3>{turno?.notas_apertura && <span className="pill nv">Relevo con novedades</span>}</div>
    {turno?.notas_apertura && <p className="small">Recibido del turno anterior: {turno.notas_apertura}</p>}
    <form onSubmit={anotar} className="grid">
      <label>Anotar novedad<textarea rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Qué pasó, a qué hora y qué se hizo" /></label>
      <div className="row between">
        <label className="switch"><input type="checkbox" checked={grave} onChange={e => setGrave(e.target.checked)} />Marcar como incidente</label>
        <button className="btn dark sm">Anotar</button>
      </div>
    </form>
    <div className="list">{lista.length ? lista.map(o => <div key={o.id} className="item">
      <div className="row between"><span className="t">{o.gravedad === 'incidente' ? <span className="pill bad">Incidente</span> : <span className="pill nv">Nota</span>} {o.texto}</span><span className="small">{fmtT(o.ts)}</span></div>
      <span className="s">{o.vigilante} · {fmtDT(o.ts)}</span>
    </div>) : <p className="muted">Sin novedades registradas.</p>}</div>
  </div>;
}
