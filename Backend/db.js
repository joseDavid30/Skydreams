const { Pool } = require('pg');

const pool = new Pool({
  // Pega aquí tu link largo de Neon.tech (el que usamos en pgAdmin)
  connectionString: 'postgresql://neondb_owner:npg_4Ys6JWGkxmhw@ep-small-wind-aqirx9zb-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false // Súper importante para la nube
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a la BD:', err.stack);
  } else {
    console.log('✅ Conectado a Neon.tech exitosamente. Hora:', res.rows[0].now);
  }
});

module.exports = pool;