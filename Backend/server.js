const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos la conexión a la base de datos

const app = express();

// Middlewares (Permiten que el frontend se comunique con el backend)
app.use(cors());
app.use(express.json());

// ==========================================
// RUTAS (Endpoints)
// ==========================================

// Ruta de prueba para saber si el servidor está vivo
app.get('/', (req, res) => {
  res.send('¡El servidor backend está funcionando!');
});

// ==========================================
// GET: OBTENER TODOS LOS VUELOS
// ==========================================
app.get('/api/vuelos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id_vuelo AS id,
        v.cod_vuelo AS codigo,
        v.id_ciudad_origen AS origen_id,
        v.id_ciudad_destino AS destino_id,
        co.nombre AS origen,
        cd.nombre AS destino,
        v.fecha_hora_salida AS fecha_salida,
        v.fecha_hora_llegada AS fecha_llegada,
        v.precio_base,
        v.capacidad_total AS capacidad,
        v.estado_vuelo AS estado
      FROM vuelos v
      JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
      JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
      ORDER BY v.id_vuelo ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener vuelos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// POST: CREAR VUELO
// ==========================================
app.post('/api/vuelos', async (req, res) => {
  try {
    const { codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado } = req.body;
    
    // Usamos los nombres correctos de tus columnas
    const nuevoVuelo = await pool.query(
      `INSERT INTO vuelos (cod_vuelo, id_ciudad_origen, id_ciudad_destino, fecha_hora_salida, fecha_hora_llegada, precio_base, capacidad_total, estado_vuelo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado]
    );
    res.json(nuevoVuelo.rows[0]); 
  } catch (err) {
    console.error('Error al crear vuelo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUT: ACTUALIZAR VUELO
// ==========================================
app.put('/api/vuelos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado } = req.body;

    const vueloActualizado = await pool.query(
      `UPDATE vuelos 
       SET cod_vuelo = $1, id_ciudad_origen = $2, id_ciudad_destino = $3, fecha_hora_salida = $4, fecha_hora_llegada = $5, precio_base = $6, capacidad_total = $7, estado_vuelo = $8
       WHERE id_vuelo = $9 RETURNING *`,
      [codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado, id]
    );

    if (vueloActualizado.rows.length === 0) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    res.json(vueloActualizado.rows[0]);
  } catch (err) {
    console.error('Error al actualizar vuelo:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// DELETE: ELIMINAR un vuelo (Delete)
app.delete('/api/vuelos/:id', async (req, res) => {
  try {
    const { id } = req.params; // Obtenemos el ID de la URL
    await pool.query('DELETE FROM vuelos WHERE id = $1', [id]);
    res.json({ mensaje: 'Vuelo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar vuelo:', err.message);
    res.status(500).json({ error: 'Error al eliminar en la base de datos' });
  }
});



// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});