// Envía leads ficticios a la landing por el mismo formulario público.
// Uso: node scripts/semilla.js https://tu-app.up.railway.app
const url = process.argv[2] ?? 'http://localhost:3000';
const nombres = ['Carolina Gómez', 'Andrés Restrepo', 'Luisa Fernanda Ríos', 'Julián Mejía', 'Paola Cardona',
  'Santiago Úsuga', 'Marcela Ochoa', 'Felipe Arango', 'Daniela Zapata', 'Camilo Henao', 'Natalia Vélez',
  'Esteban Montoya', 'Valeria Posada', 'Mateo Giraldo', 'Sara Londoño', 'Juan David Correa', 'Manuela Álvarez',
  'Sebastián Toro', 'Alejandra Muñoz', 'David Echeverri', 'Laura Betancur', 'Tomás Gaviria', 'Isabel Uribe'];
// Más demanda el primer fin de semana y el 11-12; el 3, 7 y 9 quedan casi vacíos.
const dias = ['2026-12-01', '2026-12-04', '2026-12-04', '2026-12-05', '2026-12-05', '2026-12-05', '2026-12-05',
  '2026-12-05', '2026-12-05', '2026-12-05', '2026-12-12', '2026-12-12', '2026-12-12', '2026-12-12', '2026-12-12',
  '2026-12-11', '2026-12-11', '2026-12-11', '2026-12-02', '2026-12-10', '2026-12-09', '2026-12-04', '2026-12-12'];
const fuentes = ['instagram', 'instagram', 'facebook', 'whatsapp', 'directo'];
const letras = 'BCDFGHJKLMNPRSTVWXYZ';

let ok = 0;
for (let i = 0; i < nombres.length; i++) {
  const placa = letras[i % 20] + letras[(i * 7) % 20] + letras[(i * 3 + 5) % 20] + String(200 + i * 31).slice(-3);
  const cuerpo = { nombre: nombres[i], whatsapp: `3${String(100000000 + i * 7654321).slice(0, 9)}`, placa, dia: dias[i], fuente: fuentes[i % 5] };
  const r = await fetch(`${url}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  if (r.ok) ok++; else console.log(placa, (await r.json()).error);
}
console.log(`${ok} leads creados en ${url}`);
