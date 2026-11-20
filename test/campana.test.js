import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almacenMemoria } from '../src/almacen.js';
import { CAMPANA, cuposPorDia, nombreDia } from '../src/campana.js';
import { calcularResumen, enmascararWhatsapp, nombreCorto } from '../src/mcp.js';
import { crearApp } from '../src/servidor.js';
import { validarLead } from '../src/validacion.js';

const base = { nombre: 'Carolina Gómez', whatsapp: '300 123 4567', placa: 'abc-123', dia: '2026-12-01' };

test('valida y normaliza el lead', () => {
  const { lead } = validarLead({ ...base, whatsapp: '+57 300 123 4567' });
  assert.deepEqual(lead, { nombre: 'Carolina Gómez', whatsapp: '3001234567', placa: 'ABC123', dia: '2026-12-01', fuente: 'directo' });
  assert.match(validarLead({ ...base, placa: 'AB12' }).error, /placa/);
  assert.match(validarLead({ ...base, whatsapp: '6041234567' }).error, /WhatsApp/);
  assert.match(validarLead({ ...base, dia: '2026-12-06' }).error, /día/); // domingo
});

test('nombra los días en español', () => {
  assert.equal(nombreDia('2026-12-01'), 'martes 1 de diciembre');
  assert.equal(nombreDia('2026-12-12'), 'sábado 12 de diciembre');
});

test('los cupos no se sobrevenden y la placa no se repite', async () => {
  const a = almacenMemoria();
  for (let i = 0; i < CAMPANA.cuposPorDia; i++) {
    const r = await a.insertarLead({ ...validarLead(base).lead, placa: `AAA${100 + i}` }, CAMPANA.cuposPorDia);
    assert.ok(r.lead);
  }
  assert.equal((await a.insertarLead({ ...validarLead(base).lead, placa: 'ZZZ999' }, CAMPANA.cuposPorDia)).error, 'sin_cupo');
  assert.equal((await a.insertarLead({ ...validarLead(base).lead, placa: 'AAA100', dia: '2026-12-02' }, CAMPANA.cuposPorDia)).error, 'duplicado');
  const dias = cuposPorDia(await a.conteoPorDia());
  assert.equal(dias[0].libres, 0);
  assert.equal(dias[1].libres, CAMPANA.cuposPorDia);
});

test('el resumen calcula ocupación e ingreso', async () => {
  const a = almacenMemoria();
  await a.insertarLead(validarLead(base).lead, 8);
  const r = await calcularResumen(a, new Date('2026-11-20T12:00:00-05:00'));
  assert.equal(r.leads_totales, 1);
  assert.equal(r.cupos_libres, CAMPANA.cuposPorDia * CAMPANA.dias.length - 1);
  assert.equal(r.inscripciones_abiertas, true);
  assert.equal(r.dias_para_fecha_limite, 11);
});

test('el MCP no expone datos personales completos', () => {
  assert.equal(enmascararWhatsapp('3001234567'), '300****567');
  assert.equal(nombreCorto('Carolina Gómez Ruiz'), 'Carolina G.');
});

async function conServidor(opciones, fn) {
  const srv = crearApp(almacenMemoria(), opciones).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}`;
  try { await fn(url); } finally { srv.close(); }
}

test('el endpoint MCP exige el token y lista las herramientas', async () => {
  const token = 'x'.repeat(32);
  await conServidor({ mcpToken: token }, async (url) => {
    const cuerpo = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const cab = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    assert.equal((await fetch(`${url}/mcp/malo`, { method: 'POST', headers: cab, body: cuerpo })).status, 404);
    const r = await fetch(`${url}/mcp/${token}`, { method: 'POST', headers: cab, body: cuerpo });
    const txt = await r.text();
    for (const h of ['estado_campana', 'cupos_por_dia', 'listar_leads', 'resumen_campana']) assert.match(txt, new RegExp(h));
  });
});

test('sin token configurado el MCP queda apagado', async () => {
  await conServidor({ mcpToken: '' }, async (url) => {
    assert.equal((await fetch(`${url}/mcp/cualquiera`, { method: 'POST' })).status, 404);
  });
});
