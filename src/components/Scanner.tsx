import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/** Captura una miniatura del video para la bitácora. */
export function capturar(v: HTMLVideoElement | null): string {
  try {
    if (!v || !v.videoWidth) return '';
    const cv = document.createElement('canvas'); const w = 240; cv.width = w; cv.height = Math.round(w * v.videoHeight / v.videoWidth);
    cv.getContext('2d')!.drawImage(v, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.6);
  } catch { return ''; }
}

type Detector = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };

/** Lee un QR con la cámara. Usa el detector nativo del navegador y, si no existe, jsQR. */
export function Scanner({ onCode }: { onCode: (code: string, foto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('Apunta la cámara al QR del celular del invitado.');
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let vivo = true;
    const cv = document.createElement('canvas'); const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    let det: Detector | null = null;
    try { if (W.BarcodeDetector) det = new W.BarcodeDetector({ formats: ['qr_code'] }); } catch { det = null; }
    const loop = async () => {
      if (!vivo) return;
      const v = video.current;
      if (v && v.readyState === 4) {
        try {
          let code = '';
          if (det) { const r = await det.detect(v); if (r.length) code = r[0].rawValue; }
          else { cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.drawImage(v, 0, 0); const im = ctx.getImageData(0, 0, cv.width, cv.height); const r = jsQR(im.data, im.width, im.height); if (r?.data) code = r.data; }
          if (code) { vivo = false; onCode(code, capturar(v)); return; }
        } catch { /* siguiente cuadro */ }
      }
      raf = requestAnimationFrame(loop);
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); } raf = requestAnimationFrame(loop); })
      .catch(() => setMsg('No hay cámara o no se dio permiso. Escribe el código de 6 caracteres.'));
    return () => { vivo = false; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [onCode]);
  return <><video ref={video} playsInline muted /><p className="muted">{msg}</p></>;
}
