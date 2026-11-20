import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almacenMemoria } from '../src/almacen.js';
import { CAMPANA, cuposPorDia, nombreDia } from '../src/campana.js';
import { calcularResumen, enmascararWhatsapp, nombreCorto } from '../src/mcp.js';
import { crearApp } from '../src/servidor.js';
import { validarLead } from '../src/validacion.js';

const base = { nombre: 'Andrés Restrepo', whatsapp: '300 123 4567', dia: '2026-12-14', estilo: 'Fade' };
const lead = (extra = {}) => validarLead({ ...base, ...extra }).lead;

test('valida y normaliza el lead', () => {
  assert.deepEqual(validarLead({ ...base, whatsapp: '+57 300 123 4567' }).lead,
    { nombre: 'Andrés Restrepo', whatsapp: '3001234567', dia: '2026-12-14', estilo: 'Fade', fuente: 'directo' });
  assert.equal(validarLead({ ...base, estilo: '' }).lead.estilo, 'Lo decido allá');
  assert.match(validarLead({ ...base, whatsapp: '6041234567' }).error, /WhatsApp/);
  assert.match(validarLead({ ...base, dia: '2026-12-20' }).error, /día/); // domingo
  assert.match(validarLead({ ...base, estilo: 'Mohicano' }).error, /estilo/);
});

test('nombra los días en español', () => {
  assert.equal(nombreDia('2026-12-14'), 'lunes 14 de diciembre');
  assert.equal(nombreDia('2026-12-23'), 'miércoles 23 de diciembre');
});

test('los cupos no se sobrevenden y el WhatsApp no se repite', async () => {
  const a = almacenMemoria();
  for (let i = 0; i < CAMPANA.cuposPorDia; i++) {
    assert.ok((await a.insertarLead(lead({ whatsapp: `30000000${String(i).padStart(2, '0')}` }), CAMPANA.cuposPorDia)).lead);
  }
  assert.equal((await a.insertarLead(lead({ whatsapp: '3109999999' }), CAMPANA.cuposPorDia)).error, 'sin_cupo');
  assert.equal((await a.insertarLead(lead({ whatsapp: '3000000000', dia: '2026-12-15' }), CAMPANA.cuposPorDia)).error, 'duplicado');
  const dias = cuposPorDia(await a.conteoPorDia());
  assert.equal(dias[0].libres, 0);
  assert.equal(dias[1].libres, CAMPANA.cuposPorDia);
});

test('el resumen calcula ocupación, ingreso y estilos', async () => {
  const a = almacenMemoria();
  await a.insertarLead(lead(), CAMPANA.cuposPorDia);
  const r = await calcularResumen(a, new Date('2026-12-01T12:00:00-05:00'));
  assert.equal(r.leads_totales, 1);
  assert.equal(r.cupos_libres, CAMPANA.cuposPorDia * CAMPANA.dias.length - 1);
  assert.equal(r.ingreso_proyectado, 'COP 39.000');
  assert.deepEqual(r.estilos_pedidos, { Fade: 1 });
  assert.equal(r.dias_para_fecha_limite, 12);
});

test('el MCP no expone datos personales completos', () => {
  assert.equal(enmascararWhatsapp('3001234567'), '300****567');
  assert.equal(nombreCorto('Andrés Restrepo Ruiz'), 'Andrés R.');
});

async function conServidor(opciones, fn) {
  const srv = crearApp(almacenMemoria(), opciones).listen(0);
  try { await fn(`http://127.0.0.1:${srv.address().port}`); } finally { srv.close(); }
}

test('el endpoint MCP exige el token y lista las herramientas', async () => {
  const token = 'x'.repeat(32);
  await conServidor({ mcpToken: token }, async (url) => {
    const cuerpo = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const cab = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    assert.equal((await fetch(`${url}/mcp/malo`, { method: 'POST', headers: cab, body: cuerpo })).status, 404);
    const txt = await (await fetch(`${url}/mcp/${token}`, { method: 'POST', headers: cab, body: cuerpo })).text();
    for (const h of ['estado_campana', 'cupos_por_dia', 'listar_leads', 'resumen_campana']) assert.match(txt, new RegExp(h));
  });
});

test('sin token configurado el MCP queda apagado', async () => {
  await conServidor({ mcpToken: '' }, async (url) => {
    assert.equal((await fetch(`${url}/mcp/cualquiera`, { method: 'POST' })).status, 404);
  });
});

test('el formulario guarda el lead y rechaza duplicados', async () => {
  await conServidor({ mcpToken: '' }, async (url) => {
    const enviar = () => fetch(`${url}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(base) });
    assert.equal((await enviar()).status, 201);
    assert.equal((await enviar()).status, 409);
    const c = await (await fetch(`${url}/api/campana`)).json();
    assert.equal(c.dias[0].ocupados, 1);
  });
});
