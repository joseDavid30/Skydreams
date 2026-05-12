const { Pool } = require('pg');

// Configuración de la conexión a PostgreSQL

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'SkiDreams',
  password: 'admin123',
  port: 5432,
});

// Prueba rápida para ver si conecta
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.stack);
  } else {
    console.log('✅ Conectado a PostgreSQL exitosamente. Hora del servidor:', res.rows[0].now);
  }
});

module.exports = pool;