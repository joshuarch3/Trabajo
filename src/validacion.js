import { CAMPANA } from './campana.js';

// Valida y normaliza un lead del formulario. Devuelve { lead } o { error }.
export function validarLead(entrada) {
  const nombre = String(entrada?.nombre ?? '').trim().replace(/\s+/g, ' ');
  const whatsapp = String(entrada?.whatsapp ?? '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  const dia = String(entrada?.dia ?? '');
  const estilo = String(entrada?.estilo ?? '') || 'Lo decido allá';
  const fuente = String(entrada?.fuente ?? 'directo').slice(0, 40).replace(/[^\w-]/g, '') || 'directo';

  if (nombre.length < 2 || nombre.length > 80) return { error: 'Escribe tu nombre.' };
  if (!/^3\d{9}$/.test(whatsapp)) return { error: 'El WhatsApp debe ser un celular de 10 dígitos que empiece por 3.' };
  if (!CAMPANA.dias.includes(dia)) return { error: 'Elige uno de los días disponibles.' };
  if (!CAMPANA.estilos.includes(estilo)) return { error: 'Elige un estilo de la lista.' };
  return { lead: { nombre, whatsapp, dia, estilo, fuente } };
}
