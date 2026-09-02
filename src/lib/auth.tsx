import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataProvider } from './data/provider';
import { LocalProvider, CONDO_DEMO } from './data/local';
import { SupabaseProvider } from './data/supabase';
import type { Perfil, Rol } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const MODO: 'local' | 'nube' = supabase ? 'nube' : 'local';

interface Sesion {
  modo: 'local' | 'nube';
  cargando: boolean;
  perfil: Perfil | null;
  provider: DataProvider | null;
  error: string | null;
  enviarCodigo(email: string): Promise<void>;
  verificarCodigo(email: string, token: string): Promise<void>;
  entrarDemo(rol: Rol, unidadId?: string): void;
  salir(): Promise<void>;
}
const Ctx = createContext<Sesion | null>(null);
export const useSesion = () => { const s = useContext(Ctx); if (!s) throw new Error('Sin sesión'); return s; };

const PERFIL_DEMO_KEY = 'garitasur-perfil-demo';

export function SesionProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [provider, setProvider] = useState<DataProvider | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPerfilNube(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle();
    if (error) { setError(error.message); setCargando(false); return; }
    if (!data) { setError('Tu usuario existe pero aún no está asignado a un condominio. Pide al administrador que cree tu perfil.'); setPerfil(null); setProvider(null); setCargando(false); return; }
    const p = data as Perfil;
    const prov = new SupabaseProvider(supabase, p.condominio_id);
    await prov.init();
    setPerfil(p); setProvider(prov); setError(null); setCargando(false);
  }

  useEffect(() => {
    if (MODO === 'local') {
      const guardado = localStorage.getItem(PERFIL_DEMO_KEY);
      if (guardado) { const p = JSON.parse(guardado) as Perfil; const prov = new LocalProvider(); prov.init().then(() => { setPerfil(p); setProvider(prov); setCargando(false); }); }
      else setCargando(false);
      return;
    }
    const sb = supabase!;
    sb.auth.getSession().then(({ data }) => { if (data.session) cargarPerfilNube(data.session.user.id); else setCargando(false); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) cargarPerfilNube(session.user.id); else { setPerfil(null); setProvider(null); setCargando(false); } });
    return () => sub.subscription.unsubscribe();
  }, []);

  const valor = useMemo<Sesion>(() => ({
    modo: MODO, cargando, perfil, provider, error,
    async enviarCodigo(email) { const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }); if (error) throw new Error(error.message); },
    async verificarCodigo(email, token) { const { error } = await supabase!.auth.verifyOtp({ email, token, type: 'email' }); if (error) throw new Error(error.message); },
    entrarDemo(rol, unidadId) {
      const p: Perfil = { id: 'demo-' + rol, condominio_id: CONDO_DEMO, rol, nombre: rol === 'vigilante' ? 'Vigilante turno día' : rol === 'admin' ? 'Administración' : 'Propietario', unidad_id: unidadId || null };
      localStorage.setItem(PERFIL_DEMO_KEY, JSON.stringify(p));
      const prov = new LocalProvider(); setCargando(true);
      prov.init().then(() => { setPerfil(p); setProvider(prov); setCargando(false); });
    },
    async salir() { localStorage.removeItem(PERFIL_DEMO_KEY); if (supabase) await supabase.auth.signOut(); setPerfil(null); setProvider(null); },
  }), [cargando, perfil, provider, error]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Re-renderiza el componente cada vez que cambian los datos. */
export function useDatos() {
  const { provider } = useSesion();
  const [, setTick] = useState(0);
  useEffect(() => provider?.subscribe(() => setTick(t => t + 1)), [provider]);
  return provider!;
}
