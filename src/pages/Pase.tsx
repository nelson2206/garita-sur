import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { crearProviderDemo } from '../lib/data';
import type { Pase, Unidad, Condominio } from '../lib/types';
import { fmtDT } from '../lib/util';
import { QrView } from '../components/ui';

type Vista = { nombre: string; codigo: string; lote: string; propietario: string; condominio: string; detalle: string };

/** Página pública del pase: el invitado la abre desde el enlace de WhatsApp. */
export default function PasePublico() {
  const { codigo = '' } = useParams();
  const [v, setV] = useState<Vista | null | undefined>(undefined);
  useEffect(() => {
    const cod = codigo.toUpperCase();
    (async () => {
      if (supabase) {
        const { data, error } = await supabase.rpc('pase_publico', { p_codigo: cod });
        if (error || !data || !data.length) { setV(null); return; }
        const r = data[0];
        setV({ nombre: r.nombre, codigo: r.codigo, lote: r.lote, propietario: r.propietario, condominio: r.condominio, detalle: r.tipo === 'personal' ? `Horario ${r.hora_desde} a ${r.hora_hasta}.` : `Válido de ${fmtDT(r.desde)} a ${fmtDT(r.hasta)}. ${r.usos_max - r.usos} ingreso(s) disponible(s).` });
      } else {
        const p = await crearProviderDemo();
        const pase = p.all<Pase>('pases').find(x => x.codigo === cod);
        if (!pase) { setV(null); return; }
        const u = p.get<Unidad>('unidades', pase.unidad_id); const c = p.condominio() as Condominio | undefined;
        setV({ nombre: pase.nombre, codigo: pase.codigo, lote: u?.lote || '', propietario: u?.propietario || '', condominio: c?.nombre || '', detalle: pase.tipo === 'personal' ? `Horario ${pase.hora_desde} a ${pase.hora_hasta}.` : `Válido de ${fmtDT(pase.desde)} a ${fmtDT(pase.hasta)}. ${pase.usos_max - pase.usos} ingreso(s) disponible(s).` });
      }
    })();
  }, [codigo]);
  return (
    <main className="login">
      <div className="card">
        {v === undefined && <p className="muted">Cargando pase…</p>}
        {v === null && <><h2>Pase no encontrado</h2><p className="small">Pide a quien te invitó que te reenvíe el enlace.</p></>}
        {v && <>
          <span className="eyebrow">{v.condominio}</span>
          <h2>Pase de {v.nombre}</h2>
          <QrView texto={'GS:' + v.codigo} />
          <div className="code">{v.codigo}</div>
          <p className="small">Invita: {v.propietario}, {v.lote}. {v.detalle}</p>
          <p className="muted">Muestra este código en la garita. No necesitas instalar nada.</p>
        </>}
      </div>
    </main>
  );
}
