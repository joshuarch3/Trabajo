# Look de Fin de Año · Navaja Barber Club

Taller corto **Landing + MCP + Zernio** aplicado a una barbería (negocio y cifras ficticios).

**Oferta:** corte a tu estilo + barba con navaja + toalla caliente + cejas + bebida.
De COP 70.000 a **COP 39.000**. 12 cupos por día (3 barberos × 4 turnos), del 14 al 23 de diciembre (sin el domingo 20).
Reservas hasta el 12 de diciembre.

```
Landing captura leads → MCP los expone → Claude analiza y escribe → Zernio publica → más tráfico a la landing
```

## Qué hay
| Pieza | Dónde |
|---|---|
| Landing: precio ancla, cupos reales por día, cuenta regresiva y formulario | `public/index.html` |
| API del formulario (`POST /api/leads`, `GET /api/campana`) | `src/servidor.js` |
| Validación (WhatsApp de 10 dígitos, día y estilo válidos, un cupo por WhatsApp) | `src/validacion.js` |
| Leads en memoria o Postgres; un candado por día evita sobrevender cupos | `src/almacen.js` |
| Servidor MCP (Streamable HTTP) en `/mcp/<MCP_TOKEN>` | `src/mcp.js` |

### Herramientas del MCP
- `estado_campana`: oferta, precio, días de atención, fecha límite y enlace de la landing.
- `cupos_por_dia`: ocupados y libres por día ("¿qué días siguen vacíos?").
- `listar_leads`: reservas recientes, con nombre corto y WhatsApp enmascarado.
- `resumen_campana`: leads, ocupación, ingreso proyectado, fuentes, estilos pedidos y días más vacíos.

## Cómo correrlo
```
npm install
npm test                                     # 8 pruebas
MCP_TOKEN=<clave-larga> npm start            # http://localhost:3000
node scripts/semilla.js http://localhost:3000   # 34 reservas ficticias por el formulario público
```
Conectar el MCP a Claude Code:
```
claude mcp add --transport http --scope local navaja-barber http://localhost:3000/mcp/<clave-larga>
claude mcp add --transport http --scope local zernio https://mcp.zernio.com/mcp
```

## Seguridad
- Ninguna clave en el código: `MCP_TOKEN`, `DATABASE_URL` y `URL_PUBLICA` van en variables de entorno (`.env.example` está vacío).
- El MCP solo responde en `/mcp/<MCP_TOKEN>`; sin token (o con uno de menos de 24 caracteres) queda apagado.
- Claude nunca recibe el WhatsApp ni el apellido completos.
- Zernio publica solo en una cuenta de prueba y solo después de aprobar el post.
