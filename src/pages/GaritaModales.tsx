import { useCallback, useState, type FormEvent } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import { Offline } from '../lib/offline';
import { registrarIngreso } from '../lib/acciones';
import type { Pase, Unidad } from '../lib/types';
import { ETIQUETA_TIPO, limpiarCodigo, normPlate, nowIso, semaforo, uid, validarPase } from '../lib/util';
import { waLink } from '../lib/notificaciones';
import { AVISO_PRIVACIDAD } from '../lib/privacidad';
import { Modal, SemaforoBox, toast } from '../components/ui';
import { Scanner } from '../components/Scanner';

export function EscanearModal({ onClose, onCodigo }: { onClose: () => void; onCodigo: (codigo: string, foto: string) => void }) {
  const [manual, setManual] = useState('');
  const onCode = useCallback((c: string, foto: string) => onCodigo(limpiarCodigo(c), foto), [onCodigo]);
  return <Modal onClose={onClose}>
    <h3>Escanear QR del pase</h3>
    <Scanner onCode={onCode} />
    <form className="row" onSubmit={(e: FormEvent) => { e.preventDefault(); if (manual.trim()) onCodigo(limpiarCodigo(manual), ''); }}>
      <input value={manual} onChange={e => setManual(e.target.value)} placeholder="…o escribe el código de 6 caracteres" maxLength={6} autoComplete="off" style={{ flex: 1, textTransform: 'uppercase' }} />
      <button className="btn dark">Validar</button>
    </form>
    <button className="btn ghost" onClick={onClose}>Cancelar</button>
  </Modal>;
}

export function ValidarModal({ codigo, foto, onClose, onNoAnunciado }: { codigo: string; foto: string; onClose: () => void; onNoAnunciado: (unidadId?: string) => void }) {
  const { perfil } = useSesion(); const p = useDatos();
  const pase = p.all<Pase>('pases').find(x => x.codigo === codigo);
  const r = validarPase(pase);
  const u = p.get<Unidad>('unidades', pase?.unidad_id); const c = p.condominio();
  const [placa, setPlaca] = useState(pase?.placa || ''); const [doc, setDoc] = useState(''); const [ocupado, setOcupado] = useState(false);
  const [avisado, setAvisado] = useState(false); const [verAviso, setVerAviso] = useState(false);
  if (!r.ok || !pase) return <Modal onClose={onClose}>
    <span className="eyebrow">Pase {codigo}</span><h3 style={{ color: 'var(--bad)' }}>No válido</h3><p>{r.msg}</p>
    {pase && <p className="small">{pase.nombre} · {u?.lote}</p>}
    <p className="muted">Puedes registrar una visita no anunciada y pedir aprobación al residente.</p>
    <div className="row"><button className="btn" onClick={() => onNoAnunciado(pase?.unidad_id)}>Visita no anunciada</button><button className="btn ghost" onClick={onClose}>Cerrar</button></div>
  </Modal>;
  async function registrar(e: FormEvent) {
    e.preventDefault(); setOcupado(true);
    try {
      await registrarIngreso(p, perfil!, { nombre: pase!.nombre, placa: normPlate(placa), unidadId: pase!.unidad_id, medio: 'qr', autorizo: `${ETIQUETA_TIPO[pase!.tipo]} · ${u?.propietario || ''}${pase!.grupo ? ` · ${pase!.grupo}` : ''}${doc ? ` · doc ****${doc}` : ''}`, pase: pase!, foto, tipo: pase!.tipo });
      toast('Ingreso registrado'); onClose();
    } catch (err) { toast('No se pudo registrar: ' + (err as Error).message); } finally { setOcupado(false); }
  }
  return <Modal onClose={onClose}>
    <span className="eyebrow">Pase válido · {ETIQUETA_TIPO[pase.tipo]}</span><h3>{pase.nombre}</h3>
    <p className="small">{u?.lote} · {u?.propietario} {pase.rol ? `· ${pase.rol}` : ''}{pase.grupo ? ` · ${pase.grupo}` : ''}</p>
    <SemaforoBox s={semaforo(u, c)} titulo="Estado de cuenta del lote" />
    {foto && <>
      <div className="row"><img className="thumb" src={foto} alt="Foto capturada" /><span className="small">Foto para la bitácora (se borra a los {c?.retencion_dias ?? 30} días).</span></div>
      <label className="switch"><input type="checkbox" checked={avisado} onChange={e => setAvisado(e.target.checked)} />Se informó al visitante sobre el registro de sus datos</label>
      <button type="button" className="btn sm ghost" onClick={() => setVerAviso(v => !v)}>{verAviso ? 'Ocultar aviso' : 'Ver el aviso para leerlo al visitante'}</button>
      {verAviso && <div className="card" style={{ background: 'var(--surface-2)' }}>{AVISO_PRIVACIDAD(c?.nombre || 'El condominio', c?.responsable_datos || '', c?.retencion_dias ?? 30).map((t, i) => <p key={i} className="small">{t}</p>)}</div>}
    </>}
    <form onSubmit={registrar} className="grid">
      <label>Placa del vehículo (si viene en auto)<input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="ABC-123" /></label>
      <label>Documento mostrado (opcional, solo últimos 4 dígitos)<input value={doc} onChange={e => setDoc(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="Últimos 4 dígitos" inputMode="numeric" /></label>
      <button className="btn primary block" disabled={ocupado || (!!foto && !avisado)}>Registrar ingreso</button>
      {!!foto && !avisado && <p className="muted">Marca la casilla del aviso para poder registrar el ingreso con foto.</p>}
    </form>
    <button className="btn ghost" onClick={onClose}>Cancelar</button>
  </Modal>;
}

export function NoAnunciadoModal({ unidadId, onClose }: { unidadId?: string; onClose: () => void }) {
  const { perfil } = useSesion(); const p = useDatos();
  const unidades = p.all<Unidad>('unidades').sort((a, b) => a.lote.localeCompare(b.lote, undefined, { numeric: true }));
  const [f, setF] = useState({ unidadId: unidadId || unidades[0]?.id || '', nombre: '', placa: '', nota: '' });
  const [avisar, setAvisar] = useState(true);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));
  async function enviar(e: FormEvent) {
    e.preventDefault();
    const u = p.get<Unidad>('unidades', f.unidadId);
    await Offline.escribir(p, 'solicitudes', { id: uid(), condominio_id: perfil!.condominio_id, unidad_id: f.unidadId, ts: nowIso(), nombre: f.nombre.trim(), placa: normPlate(f.placa), nota: f.nota, estado: 'pendiente', resuelto_en: null });
    toast('Solicitud enviada al residente');
    // El aviso por WhatsApp llega aunque el propietario no tenga la app abierta.
    if (avisar) {
      const texto = `Garita de ${p.condominio()?.nombre ?? 'el condominio'}: ${f.nombre.trim()}${f.placa ? ` (placa ${normPlate(f.placa)})` : ''} pide ingresar a ${u?.lote ?? 'su lote'}${f.nota ? `. Motivo: ${f.nota}` : ''}. ¿Autoriza el ingreso?`;
      window.open(waLink(u?.telefono, texto), '_blank');
    }
    onClose();
  }
  return <Modal onClose={onClose}>
    <span className="eyebrow">Visita no anunciada</span><h3>Pedir aprobación al residente</h3>
    <form onSubmit={enviar} className="grid">
      <label>Lote que visita<select value={f.unidadId} onChange={e => set('unidadId', e.target.value)}>{unidades.map(u => <option key={u.id} value={u.id}>{u.lote} · {u.propietario}</option>)}</select></label>
      <label>Nombre del visitante<input required value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
      <label>Placa (opcional)<input value={f.placa} onChange={e => set('placa', e.target.value)} placeholder="ABC-123" /></label>
      <label>Motivo<input value={f.nota} onChange={e => set('nota', e.target.value)} placeholder="Ej. delivery, familiar, técnico" /></label>
      <label className="switch"><input type="checkbox" checked={avisar} onChange={e => setAvisar(e.target.checked)} />Avisar también por WhatsApp al propietario</label>
      <button className="btn primary block">Enviar solicitud al celular del residente</button>
    </form>
    <p className="muted">La solicitud aparece en la app del propietario. El aviso por WhatsApp llega aunque no la tenga abierta. Si contesta por teléfono, marca "Aprobó por teléfono" en la lista de solicitudes.</p>
    <button className="btn ghost" onClick={onClose}>Cancelar</button>
  </Modal>;
}
