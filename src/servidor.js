import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { crearAlmacen } from './almacen.js';
import { CAMPANA, cuposPorDia, inscripcionesAbiertas } from './campana.js';
import { crearServidorMcp } from './mcp.js';
import { validarLead } from './validacion.js';

function tokenValido(recibido, esperado) {
  if (!esperado || esperado.length < 24) return false; // sin token fuerte, el MCP queda apagado
  const a = Buffer.from(String(recibido));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function crearApp(almacen, { mcpToken = process.env.MCP_TOKEN, urlPublica = process.env.URL_PUBLICA ?? '' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.get('/api/campana', async (_req, res, next) => {
    try {
      res.json({
        oferta: CAMPANA.oferta,
        estilos: CAMPANA.estilos,
        precioAncla: CAMPANA.precioAncla,
        precioOferta: CAMPANA.precioOferta,
        fechaLimite: CAMPANA.fechaLimite,
        abiertas: inscripcionesAbiertas(),
        dias: cuposPorDia(await almacen.conteoPorDia()),
      });
    } catch (e) { next(e); }
  });

  app.post('/api/leads', async (req, res, next) => {
    try {
      if (req.body?.empresa) return res.status(201).json({ ok: true }); // trampa para bots
      if (!inscripcionesAbiertas()) return res.status(410).json({ error: 'La oferta ya cerró.' });
      const { lead, error } = validarLead(req.body);
      if (error) return res.status(400).json({ error });
      const r = await almacen.insertarLead(lead, CAMPANA.cuposPorDia);
      if (r.error === 'sin_cupo') return res.status(409).json({ error: 'Ese día se acaba de llenar. Elige otro.' });
      if (r.error === 'duplicado') return res.status(409).json({ error: 'Ese WhatsApp ya tiene un cupo reservado.' });
      res.status(201).json({ ok: true, dia: r.lead.dia });
    } catch (e) { next(e); }
  });

  // MCP (Streamable HTTP, sin sesión). La URL lleva un token secreto que vive en variables de entorno.
  app.post('/mcp/:token', async (req, res, next) => {
    if (!tokenValido(req.params.token, mcpToken)) return res.status(404).end();
    try {
      const servidor = crearServidorMcp(almacen, urlPublica);
      const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { transporte.close(); servidor.close(); });
      await servidor.connect(transporte);
      await transporte.handleRequest(req, res, req.body);
    } catch (e) { next(e); }
  });
  app.all('/mcp/:token', (req, res) => {
    if (!tokenValido(req.params.token, mcpToken)) return res.status(404).end();
    res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Método no permitido' }, id: null });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Algo falló. Intenta de nuevo.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const almacen = crearAlmacen();
  await almacen.iniciar();
  const puerto = Number(process.env.PORT ?? 3000);
  crearApp(almacen).listen(puerto, () => {
    console.log(`Campaña lista en el puerto ${puerto} (almacén: ${almacen.tipo}, MCP: ${process.env.MCP_TOKEN ? 'activo' : 'apagado'})`);
  });
}
