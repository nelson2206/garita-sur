import type { DataProvider } from './provider';
import { LocalProvider } from './local';
import { ArtifactProvider } from './artifact';

export const ES_ARTIFACT = import.meta.env.MODE === 'artifact';

/** Fuente de datos cuando no hay Supabase: almacén compartido de la página publicada o, si no está disponible, el navegador. */
export async function crearProviderDemo(): Promise<DataProvider> {
  if (ES_ARTIFACT) {
    const a = new ArtifactProvider();
    try { await a.init(); return a; } catch (e) { console.warn('almacén compartido no disponible, uso datos locales', e); }
  }
  const l = new LocalProvider(); await l.init(); return l;
}
