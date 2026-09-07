// Textos legales exigidos por la Ley 29733 y su reglamento (D.S. 016-2024-JUS)
// y por la Directiva 01-2020-JUS sobre videovigilancia.

export const AVISO_PRIVACIDAD = (condominio: string, responsable: string, dias: number) => [
  `${condominio} registra el ingreso y la salida de personas y vehículos para dar seguridad a los residentes y dejar constancia de quién entra y sale.`,
  'Datos que se tratan: nombre del visitante, placa del vehículo, lote que autoriza, fecha y hora, y una fotografía del momento del ingreso. No se registran huellas, rostro biométrico ni el número completo del documento.',
  `Conservación: las fotografías se eliminan a los ${dias} días. El registro de ingresos se conserva mientras dure la relación con el condominio.`,
  `Responsable del tratamiento: la administración del condominio${responsable ? `, a través de ${responsable}` : ''}. Los datos no se comparten con terceros salvo requerimiento de autoridad competente.`,
  'Derechos: puedes pedir acceso, rectificación, cancelación u oposición sobre tus datos escribiendo a la administración. También puedes reclamar ante la Autoridad Nacional de Protección de Datos Personales.',
];

export const TEXTO_CARTEL = (condominio: string, responsable: string) => ({
  titulo: 'ZONA VIGILADA',
  lineas: [
    'Este acceso cuenta con registro de ingresos y videovigilancia.',
    `Responsable: ${condominio}${responsable ? ` · ${responsable}` : ''}`,
    'Finalidad: seguridad de residentes y control de accesos.',
    'Ley 29733 de Protección de Datos Personales. Puedes ejercer tus derechos ante la administración.',
  ],
});

// Cartel para imprimir en A4, con el fondo amarillo y el tamaño mínimo que exige la directiva.
export function abrirCartel(condominio: string, responsable: string) {
  const t = TEXTO_CARTEL(condominio, responsable);
  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) return false;
  const li = t.lineas.map(l => '<li>' + l + '</li>').join('');
  const estilo = '@page{size:A4;margin:12mm}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#F2C200;color:#111}'
    + '.hoja{min-height:250mm;padding:18mm 14mm;display:flex;flex-direction:column;gap:14mm;border:6mm solid #111}'
    + 'h1{font-size:64pt;margin:0;letter-spacing:2pt;line-height:1}'
    + 'ul{font-size:17pt;line-height:1.5;padding-left:8mm;margin:0}'
    + '.pie{margin-top:auto;font-size:12pt}@media print{.no-print{display:none}}';
  const doc = '<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><title>Cartel de zona vigilada</title>'
    + '<style>' + estilo + '</style></head><body><div class="hoja"><h1>' + t.titulo + '</h1><ul>' + li + '</ul>'
    + '<p class="pie">Colocar este cartel en cada acceso, a la vista y antes del punto de registro.</p></div>'
    + '<button class="no-print" onclick="window.print()" style="position:fixed;top:8px;right:8px;padding:10px 16px;font-size:14pt">Imprimir</button>'
    + '</body></html>';
  w.document.write(doc);
  w.document.close();
  return true;
}
