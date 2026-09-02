// Convierte dist-artifact/index.html (un solo archivo) en un fragmento publicable como Artifact de claude.ai.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-artifact/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const quitar = [/<meta[^>]*>/gi, /<link rel="icon"[^>]*>/gi, /<link rel="apple-touch-icon"[^>]*>/gi, /<link rel="manifest"[^>]*>/gi];
let cabeza = head; for (const r of quitar) cabeza = cabeza.replace(r, '');
const salida = cabeza.trim() + '\n' + body.trim() + '\n';
writeFileSync('dist-artifact/artifact.html', salida);
console.log('fragmento listo:', (salida.length / 1024).toFixed(0), 'KB');
