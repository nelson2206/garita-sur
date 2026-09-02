import { useEffect, useState } from 'react';
import { useDatos } from '../lib/auth';
import { Offline } from '../lib/offline';
import { toast } from '../components/ui';
import { EscanearModal, NoAnunciadoModal, ValidarModal } from './GaritaModales';
import { BitacoraTurno, Busqueda, Dentro, Solicitudes } from './GaritaListas';

export type ModalGarita = null | { k: 'scan' } | { k: 'validar'; codigo: string; foto: string } | { k: 'noanunciado'; unidadId?: string };

export default function Garita() {
  const p = useDatos();
  const [, tick] = useState(0); const [modal, setModal] = useState<ModalGarita>(null);
  useEffect(() => { Offline.cargar(); return Offline.subscribe(() => tick(t => t + 1)); }, []);
  const online = Offline.online;
  useEffect(() => { if (online) Offline.sincronizar(p).then(n => { if (n) toast(`${n} registro(s) sincronizados`); }); }, [online, p]);
  const c = p.condominio();
  return (
    <main>
      <div className="barra">
        <div><span className="eyebrow">{c?.nombre}</span><h2>Garita principal</h2></div>
        <span className={'pill ' + (online ? 'ok' : 'warn')}>{online ? 'En línea' : 'Sin internet · registrando en local'}</span>
        <span className="pill nv">{Offline.cola.length ? `${Offline.cola.length} por sincronizar` : 'Todo sincronizado'}</span>
        <label className="switch"><input type="checkbox" checked={Offline.forzarOffline} onChange={e => Offline.setForzar(e.target.checked)} />Simular corte de internet</label>
        <div className="row" style={{ marginLeft: 'auto' }}>
          <button className="btn primary" onClick={() => setModal({ k: 'scan' })}>Escanear QR</button>
          <button className="btn" onClick={() => setModal({ k: 'noanunciado' })}>Visita no anunciada</button>
        </div>
      </div>
      <div className="garita">
        <div className="col"><Busqueda setModal={setModal} /><Dentro /></div>
        <div className="col"><Solicitudes /><BitacoraTurno /></div>
      </div>
      {modal?.k === 'scan' && <EscanearModal onClose={() => setModal(null)} onCodigo={(codigo, foto) => setModal({ k: 'validar', codigo, foto })} />}
      {modal?.k === 'validar' && <ValidarModal codigo={modal.codigo} foto={modal.foto} onClose={() => setModal(null)} onNoAnunciado={id => setModal({ k: 'noanunciado', unidadId: id })} />}
      {modal?.k === 'noanunciado' && <NoAnunciadoModal unidadId={modal.unidadId} onClose={() => setModal(null)} />}
    </main>
  );
}
