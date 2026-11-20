import pg from 'pg';

// Almacén de leads. Con DATABASE_URL usa Postgres; sin ella, memoria (solo pruebas y desarrollo).
export function crearAlmacen(databaseUrl = process.env.DATABASE_URL) {
  return databaseUrl ? almacenPostgres(databaseUrl) : almacenMemoria();
}

export function almacenMemoria() {
  const leads = [];
  return {
    tipo: 'memoria',
    async iniciar() {},
    async insertarLead(lead, capacidad) {
      if (leads.some((l) => l.placa === lead.placa)) return { error: 'duplicado' };
      if (leads.filter((l) => l.dia === lead.dia).length >= capacidad) return { error: 'sin_cupo' };
      const fila = { id: leads.length + 1, ...lead, creado_en: new Date().toISOString() };
      leads.push(fila);
      return { lead: fila };
    },
    async listarLeads() {
      return [...leads].sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    },
    async conteoPorDia() {
      const conteo = {};
      for (const l of leads) conteo[l.dia] = (conteo[l.dia] ?? 0) + 1;
      return conteo;
    },
  };
}

function almacenPostgres(databaseUrl) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: /sslmode=require/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  return {
    tipo: 'postgres',
    async iniciar() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id         SERIAL PRIMARY KEY,
          nombre     TEXT NOT NULL,
          whatsapp   TEXT NOT NULL,
          placa      TEXT NOT NULL UNIQUE,
          dia        DATE NOT NULL,
          fuente     TEXT NOT NULL DEFAULT 'directo',
          creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
    },
    async insertarLead(lead, capacidad) {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        // Un candado por día evita sobrevender el último cupo con dos envíos simultáneos.
        await cliente.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lead.dia]);
        const { rows: [{ n }] } = await cliente.query('SELECT count(*)::int AS n FROM leads WHERE dia = $1', [lead.dia]);
        if (n >= capacidad) {
          await cliente.query('ROLLBACK');
          return { error: 'sin_cupo' };
        }
        const { rows } = await cliente.query(
          `INSERT INTO leads (nombre, whatsapp, placa, dia, fuente) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (placa) DO NOTHING
           RETURNING id, nombre, whatsapp, placa, to_char(dia, 'YYYY-MM-DD') AS dia, fuente, creado_en`,
          [lead.nombre, lead.whatsapp, lead.placa, lead.dia, lead.fuente],
        );
        await cliente.query('COMMIT');
        return rows.length ? { lead: rows[0] } : { error: 'duplicado' };
      } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        cliente.release();
      }
    },
    async listarLeads() {
      const { rows } = await pool.query(
        `SELECT id, nombre, whatsapp, placa, to_char(dia, 'YYYY-MM-DD') AS dia, fuente, creado_en
         FROM leads ORDER BY creado_en DESC`);
      return rows.map((r) => ({ ...r, creado_en: new Date(r.creado_en).toISOString() }));
    },
    async conteoPorDia() {
      const { rows } = await pool.query(
        `SELECT to_char(dia, 'YYYY-MM-DD') AS dia, count(*)::int AS n FROM leads GROUP BY dia`);
      return Object.fromEntries(rows.map((r) => [r.dia, r.n]));
    },
  };
}
