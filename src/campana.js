// Datos de la campaña. Negocio y cifras ficticios (ejercicio académico).
export const CAMPANA = {
  negocio: 'Navaja Barber Club',
  ciudad: 'Laureles, Medellín',
  oferta: 'Look de Fin de Año',
  incluye: [
    'Corte a tu estilo (clásico o fade)',
    'Perfilado de barba con navaja',
    'Toalla caliente y masaje facial',
    'Arreglo de cejas',
    'Bebida de cortesía',
  ],
  estilos: ['Clásico', 'Fade', 'Barba completa', 'Lo decido allá'],
  precioAncla: 70000,
  precioOferta: 39000,
  cuposPorDia: 12, // 3 barberos x 4 turnos
  // Inscripciones hasta el 12 de diciembre a las 23:59 (hora Colombia).
  fechaLimite: '2026-12-12T23:59:00-05:00',
  // Días de atención: 14 al 23 de diciembre, sin el domingo 20.
  dias: ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18',
    '2026-12-19', '2026-12-21', '2026-12-22', '2026-12-23'],
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

// Cupos por día a partir del conteo de reservas { '2026-12-14': 3, ... }.
export function cuposPorDia(conteo) {
  return CAMPANA.dias.map((dia) => {
    const ocupados = conteo[dia] ?? 0;
    return { dia, nombre: nombreDia(dia), ocupados, libres: Math.max(CAMPANA.cuposPorDia - ocupados, 0), capacidad: CAMPANA.cuposPorDia };
  });
}
