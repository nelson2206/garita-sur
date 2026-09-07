// Avisos al propietario: notificación del navegador cuando la app está abierta o instalada,
// y enlace de WhatsApp como camino seguro cuando el celular está apagado o sin la app.

export const avisosSoportados = () => typeof Notification !== 'undefined';
export const avisosActivos = () => avisosSoportados() && Notification.permission === 'granted';

export async function pedirPermisoAvisos(): Promise<boolean> {
  if (!avisosSoportados()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; }
}

export function avisar(titulo: string, cuerpo: string) {
  if (!avisosActivos()) return false;
  try { new Notification(titulo, { body: cuerpo, tag: 'garita-sur' }); return true; } catch { return false; }
}

// Enlace de WhatsApp. Si el teléfono no es utilizable, abre WhatsApp con el texto para elegir contacto.
export function waLink(telefono: string | null | undefined, texto: string) {
  const num = (telefono || '').replace(/[^0-9]/g, '');
  const destino = num.length === 9 ? '51' + num : num.length >= 11 ? num : '';
  return 'https:' + '//wa.me/' + destino + '?text=' + encodeURIComponent(texto);
}

export const telefonoUtil = (t: string | null | undefined) => (t || '').replace(/[^0-9]/g, '').length >= 9;
