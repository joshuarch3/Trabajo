// Envía reservas ficticias a la landing por el mismo formulario público.
// Uso: node scripts/semilla.js http://localhost:3000
const url = process.argv[2] ?? 'http://localhost:3000';
const nombres = ['Andrés Restrepo', 'Julián Mejía', 'Santiago Úsuga', 'Felipe Arango', 'Camilo Henao', 'Esteban Montoya',
  'Mateo Giraldo', 'Juan David Correa', 'Sebastián Toro', 'David Echeverri', 'Tomás Gaviria', 'Simón Vélez',
  'Alejandro Posada', 'Nicolás Ochoa', 'Miguel Cardona', 'Daniel Zapata', 'Samuel Londoño', 'Emiliano Ríos',
  'Jerónimo Uribe', 'Martín Betancur', 'Pablo Álvarez', 'Lucas Muñoz', 'Jacobo Arias', 'Kevin Restrepo',
  'Brayan Gómez', 'Cristian Quintero', 'Óscar Duque', 'Iván Salazar', 'Hernán Pineda', 'Mauricio Lopera',
  'Ricardo Hoyos', 'Wilson Agudelo', 'Gustavo Tobón', 'Diego Herrera'];
// El fin de semana antes de Navidad (18, 19, 21, 22, 23) se llena; el 14, 15 y 16 quedan casi vacíos.
const dias = ['2026-12-19', '2026-12-19', '2026-12-19', '2026-12-19', '2026-12-19', '2026-12-19', '2026-12-19',
  '2026-12-19', '2026-12-19', '2026-12-19', '2026-12-19', '2026-12-23', '2026-12-23', '2026-12-23', '2026-12-23',
  '2026-12-23', '2026-12-23', '2026-12-23', '2026-12-23', '2026-12-18', '2026-12-18', '2026-12-18', '2026-12-18',
  '2026-12-18', '2026-12-22', '2026-12-22', '2026-12-22', '2026-12-21', '2026-12-21', '2026-12-17', '2026-12-17',
  '2026-12-16', '2026-12-14', '2026-12-19'];
const estilos = ['Fade', 'Fade', 'Clásico', 'Barba completa', 'Fade', 'Lo decido allá', 'Clásico'];
const fuentes = ['instagram', 'instagram', 'tiktok', 'whatsapp', 'instagram', 'directo'];

let ok = 0;
for (let i = 0; i < nombres.length; i++) {
  const cuerpo = { nombre: nombres[i], whatsapp: `3${String(10000000 + i * 2468013).padStart(9, '0').slice(0, 9)}`,
    dia: dias[i], estilo: estilos[i % estilos.length], fuente: fuentes[i % fuentes.length] };
  const r = await fetch(`${url}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  if (r.ok) ok++; else console.log(nombres[i], (await r.json()).error);
}
console.log(`${ok} reservas creadas en ${url}`);
