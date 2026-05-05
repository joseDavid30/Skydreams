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

// Ruta para obtener todos los vuelos de la base de datos
app.get('/api/vuelos', async (req, res) => {
  try {
    // Consulta a PostgreSQL
    const result = await pool.query('SELECT * FROM vuelos ORDER BY id ASC');
    // Enviamos los datos en formato JSON
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener vuelos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// POST: CREAR un nuevo vuelo (Create)
app.post('/api/vuelos', async (req, res) => {
  try {
    // Extraemos los datos que nos envía el formulario (Frontend)
    const { codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado } = req.body;
    
    // Insertamos en PostgreSQL usando $1, $2... por seguridad contra hackeos (Inyección SQL)
    const nuevoVuelo = await pool.query(
      `INSERT INTO vuelos (codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado]
    );
    
    res.json(nuevoVuelo.rows[0]); // Devolvemos el vuelo recién creado
  } catch (err) {
    console.error('Error al crear vuelo:', err.message);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
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