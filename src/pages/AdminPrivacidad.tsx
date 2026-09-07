import { useState } from 'react';
import { useDatos, useSesion } from '../lib/auth';
import { AVISO_PRIVACIDAD, abrirCartel } from '../lib/privacidad';
import type { Condominio, Evento } from '../lib/types';
import { toast } from '../components/ui';

/** Obligaciones de la Ley 29733: aviso, cartel en cada acceso y borrado de fotos. */
export function Privacidad() {
  const { modo } = useSesion(); const p = useDatos();
  const c = p.condominio() as Condominio | undefined;
  const [resp, setResp] = useState(c?.responsable_datos || '');
  const dias = c?.retencion_dias ?? 30;
  const limite = Date.now() - dias * 86400000;
  const conFoto = p.all<Evento>('eventos').filter(e => e.foto_url);
  const vencidas = conFoto.filter(e => new Date(e.ts).getTime() < limite);

  async function guardar() {
    if (!c) return;
    await p.upsert('condominios', { ...c, responsable_datos: resp }); toast('Responsable guardado');
  }
  async function purgar() {
    if (!vencidas.length) return toast('No hay fotos vencidas');
    for (const e of vencidas) await p.upsert('eventos', { ...e, foto_url: null } as unknown as { id: string });
    toast(`${vencidas.length} foto(s) eliminadas`);
  }

  return <div className="card">
    <h3>Privacidad y datos personales</h3>
    <p className="small">El registro de visitas es un banco de datos. Antes de cargar datos reales hay que inscribirlo en el Registro Nacional de Protección de Datos Personales, poner el cartel en cada acceso y respetar el plazo de borrado.</p>
    <label>Responsable de datos del condominio<input value={resp} onChange={e => setResp(e.target.value)} placeholder="Ej. Administración, correo de contacto" /></label>
    <div className="row"><button className="btn dark" onClick={guardar}>Guardar responsable</button>
      <button className="btn" onClick={() => { if (!abrirCartel(c?.nombre || '', resp)) toast('El navegador bloqueó la ventana de impresión'); }}>Imprimir cartel de zona vigilada</button></div>

    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <h4>Aviso que se muestra al visitante</h4>
      {AVISO_PRIVACIDAD(c?.nombre || 'El condominio', resp, dias).map((t, i) => <p key={i} className="small">{t}</p>)}
    </div>

    <div className="row between">
      <div><h4>Borrado de fotos</h4><p className="small">Retención configurada: {dias} días. Fotos guardadas: {conFoto.length}. Vencidas: {vencidas.length}.</p></div>
      <button className="btn ghost danger" onClick={purgar} disabled={!vencidas.length}>Borrar fotos vencidas</button>
    </div>
    <p className="muted">{modo === 'nube'
      ? 'En la nube, además de este botón, conviene programar la función limpiar_fotos() para que se ejecute cada noche.'
      : 'En modo demo el borrado solo afecta los datos de este navegador.'}</p>
  </div>;
}
