# Campaña de temporada · Taller Hermanos Restrepo

Taller corto **Landing + MCP + Zernio** aplicado al Taller Hermanos Restrepo (Itagüí).

**Oferta:** Chequeo Vacaciones Seguras (frenos, alineación y balanceo, suspensión, luces y batería):
de COP 240.000 a **COP 129.000**. 8 cupos por día, del 1 al 12 de diciembre (sin domingo ni el festivo del 8).
Inscripciones hasta el 30 de noviembre. *Cifras de la oferta ficticias.*

```
Landing captura leads → MCP los expone → Claude analiza y escribe → Zernio publica → más tráfico a la landing
```

## Qué hay
| Pieza | Dónde |
|---|---|
| Landing (precio ancla, cupos reales por día, cuenta regresiva, formulario) | `public/index.html` |
| API del formulario (`POST /api/leads`, `GET /api/campana`) | `src/servidor.js` |
| Validación (placa `ABC123`, WhatsApp de 10 dígitos, día válido) | `src/validacion.js` |
| Leads en Postgres; un candado por día evita sobrevender cupos | `src/almacen.js` |
| Servidor MCP (Streamable HTTP) en `/mcp/<MCP_TOKEN>` | `src/mcp.js` |

### Herramientas del MCP
- `estado_campana`: oferta, precio, fecha límite y enlace de la landing.
- `cupos_por_dia`: ocupados y libres por día ("¿qué días siguen vacíos?").
- `listar_leads`: reservas recientes, con nombre corto y WhatsApp enmascarado.
- `resumen_campana`: leads, ocupación, ingreso proyectado, fuentes y días más vacíos.

## Seguridad
- Ninguna clave en el código: `DATABASE_URL`, `MCP_TOKEN` y `URL_PUBLICA` van en Variables de Railway (`.env.example` está vacío).
- El MCP solo responde en `/mcp/<MCP_TOKEN>`; sin token (o con uno de menos de 24 caracteres) queda apagado.
- Claude nunca recibe el WhatsApp completo ni el apellido completo.
- Zernio publica solo en una cuenta de prueba y solo después de aprobar el post.

## Comandos
```
npm install
npm test                 # 7 pruebas
npm run dev              # http://localhost:3000 (sin DATABASE_URL usa memoria)
node scripts/semilla.js <url>   # leads ficticios por el formulario público
```
