// Datos de la campaña. Negocio real del curso, cifras de la oferta ficticias.
export const CAMPANA = {
  negocio: 'Taller Hermanos Restrepo',
  ciudad: 'Itagüí',
  oferta: 'Chequeo Vacaciones Seguras',
  incluye: [
    'Revisión de frenos (pastillas, discos y líquido)',
    'Alineación y balanceo',
    'Suspensión y dirección',
    'Luces, batería y niveles',
    'Informe con fotos por WhatsApp',
  ],
  precioAncla: 240000,
  precioOferta: 129000,
  cuposPorDia: 8, // 4 bahías x 2 turnos
  // Inscripciones hasta el 30 de noviembre a las 23:59 (hora Colombia).
  fechaLimite: '2026-11-30T23:59:00-05:00',
  // Días de atención: 1 al 12 de diciembre, sin domingo ni el festivo del 8.
  dias: ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05',
    '2026-12-07', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12'],
};

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function nombreDia(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return `${NOMBRES_DIA[fecha.getUTCDay()]} ${d} de diciembre`;
}

export function cop(valor) {
  return 'COP ' + valor.toLocaleString('es-CO');
}

export function inscripcionesAbiertas(ahora = new Date()) {
  return ahora.getTime() <= new Date(CAMPANA.fechaLimite).getTime();
}

// Cupos por día a partir del conteo de reservas { '2026-12-01': 3, ... }.
export function cuposPorDia(conteo) {
  return CAMPANA.dias.map((dia) => {
    const ocupados = conteo[dia] ?? 0;
    return {
      dia,
      nombre: nombreDia(dia),
      ocupados,
      libres: Math.max(CAMPANA.cuposPorDia - ocupados, 0),
      capacidad: CAMPANA.cuposPorDia,
    };
  });
}
