import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CAMPANA, cop, cuposPorDia, inscripcionesAbiertas, nombreDia } from './campana.js';

// Datos personales: Claude ve el nombre corto y el WhatsApp enmascarado, nunca completos.
export function enmascararWhatsapp(numero) {
  return numero.slice(0, 3) + '****' + numero.slice(-3);
}
export function nombreCorto(nombre) {
  const [primero, segundo] = nombre.split(' ');
  return segundo ? `${primero} ${segundo[0]}.` : primero;
}

function texto(datos) {
  return { content: [{ type: 'text', text: JSON.stringify(datos, null, 2) }] };
}

export async function calcularResumen(almacen, ahora = new Date()) {
  const [leads, conteo] = await Promise.all([almacen.listarLeads(), almacen.conteoPorDia()]);
  const dias = cuposPorDia(conteo);
  const capacidad = CAMPANA.cuposPorDia * CAMPANA.dias.length;
  const ocupados = dias.reduce((s, d) => s + d.ocupados, 0);
  const hace7 = ahora.getTime() - 7 * 24 * 3600 * 1000;
  const porFuente = {};
  for (const l of leads) porFuente[l.fuente] = (porFuente[l.fuente] ?? 0) + 1;
  const ordenados = [...dias].sort((a, b) => b.libres - a.libres);
  const msRestantes = new Date(CAMPANA.fechaLimite).getTime() - ahora.getTime();
  return {
    negocio: CAMPANA.negocio,
    oferta: CAMPANA.oferta,
    precio: `${cop(CAMPANA.precioOferta)} (antes ${cop(CAMPANA.precioAncla)})`,
    inscripciones_abiertas: inscripcionesAbiertas(ahora),
    dias_para_fecha_limite: Math.max(Math.ceil(msRestantes / 86400000), 0),
    fecha_limite: CAMPANA.fechaLimite,
    leads_totales: leads.length,
    leads_ultimos_7_dias: leads.filter((l) => new Date(l.creado_en).getTime() >= hace7).length,
    cupos_totales: capacidad,
    cupos_ocupados: ocupados,
    cupos_libres: capacidad - ocupados,
    ocupacion_pct: Math.round((ocupados / capacidad) * 1000) / 10,
    ingreso_proyectado: cop(ocupados * CAMPANA.precioOferta),
    leads_por_fuente: porFuente,
    dias_mas_vacios: ordenados.slice(0, 3).map((d) => `${d.nombre}: ${d.libres} libres`),
    dias_llenos: dias.filter((d) => d.libres === 0).map((d) => d.nombre),
  };
}

export function crearServidorMcp(almacen, urlLanding) {
  const servidor = new McpServer({ name: 'campana-taller-restrepo', version: '1.0.0' });

  servidor.registerTool('estado_campana', {
    title: 'Estado de la campaña',
    description: 'Oferta, precio, fecha límite, enlace de la landing y si las inscripciones siguen abiertas.',
    inputSchema: {},
  }, async () => texto({
    negocio: `${CAMPANA.negocio} (${CAMPANA.ciudad})`,
    oferta: CAMPANA.oferta,
    incluye: CAMPANA.incluye,
    precio_ancla: cop(CAMPANA.precioAncla),
    precio_oferta: cop(CAMPANA.precioOferta),
    descuento_pct: Math.round((1 - CAMPANA.precioOferta / CAMPANA.precioAncla) * 100),
    cupos_por_dia: CAMPANA.cuposPorDia,
    dias_de_atencion: CAMPANA.dias.map(nombreDia),
    fecha_limite: CAMPANA.fechaLimite,
    inscripciones_abiertas: inscripcionesAbiertas(),
    url_landing: urlLanding,
  }));

  servidor.registerTool('cupos_por_dia', {
    title: 'Cupos por día',
    description: 'Cupos ocupados y libres de cada día de atención. Útil para saber qué días siguen vacíos.',
    inputSchema: { solo_con_cupo: z.boolean().optional().describe('true = solo días con cupos libres') },
  }, async ({ solo_con_cupo }) => {
    const dias = cuposPorDia(await almacen.conteoPorDia());
    return texto(solo_con_cupo ? dias.filter((d) => d.libres > 0) : dias);
  });

  servidor.registerTool('listar_leads', {
    title: 'Listar leads',
    description: 'Reservas recibidas desde la landing (más recientes primero). WhatsApp enmascarado.',
    inputSchema: {
      dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filtrar por día, formato AAAA-MM-DD'),
      limite: z.number().int().min(1).max(200).optional().describe('Máximo de filas (por defecto 50)'),
    },
  }, async ({ dia, limite = 50 }) => {
    const leads = (await almacen.listarLeads()).filter((l) => !dia || l.dia === dia);
    return texto({
      total: leads.length,
      leads: leads.slice(0, limite).map((l) => ({
        nombre: nombreCorto(l.nombre),
        whatsapp: enmascararWhatsapp(l.whatsapp),
        placa: l.placa,
        dia: nombreDia(l.dia),
        fuente: l.fuente,
        creado_en: l.creado_en,
      })),
    });
  });

  servidor.registerTool('resumen_campana', {
    title: 'Resumen de la campaña',
    description: 'KPI de la campaña: leads, ocupación, ingreso proyectado, fuentes y días más vacíos.',
    inputSchema: {},
  }, async () => texto(await calcularResumen(almacen)));

  return servidor;
}
