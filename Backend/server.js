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
// RUTAS PARA RESERVAS
// ==========================================
app.get('/api/reservas', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_reserva,
                r.fecha_hora_reserva,
                r.valor_total,
                r.estado,
                c.nombres || ' ' || c.apellidos AS cliente_nombre,
                c.correo AS cliente_email,
                c.telefono AS cliente_telefono,
                v.cod_vuelo,
                co.nombre AS origen,
                cd.nombre AS destino,
                (SELECT COUNT(*) FROM tiquetes t WHERE t.id_reserva = r.id_reserva) AS numero_boletos,
                COALESCE(pt.nombre, 'Ninguno') AS paquete_turistico
            FROM reservas r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo
            JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            LEFT JOIN reserva_paquete rp ON r.id_reserva = rp.id_reserva
            LEFT JOIN paquetes_turisticos pt ON rp.id_paquete = pt.id_paquete
            ORDER BY r.id_reserva ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo reservas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
// Actualizar el estado de una reserva (Editar)
app.put('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        await pool.query('UPDATE reservas SET estado = $1 WHERE id_reserva = $2', [estado, id]);
        res.json({ message: 'Reserva actualizada correctamente' });
    } catch (error) {
        console.error("Error al actualizar reserva:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Eliminar una reserva permanentemente (Borrar)
app.delete('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Gracias a que configuraste "ON DELETE CASCADE" en tu base de datos, 
        // al borrar la reserva, se borrarán automáticamente sus tiquetes asociados.
        await pool.query('DELETE FROM reservas WHERE id_reserva = $1', [id]);
        res.json({ message: 'Reserva eliminada permanentemente' });
    } catch (error) {
        console.error("Error al eliminar reserva:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ==========================================
// RUTAS PARA BOLETOS (TIQUETES)
// ==========================================

// Obtener todos los boletos
app.get('/api/boletos', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.id_tiquete,
                t.clase,
                t.num_asiento,
                t.precio_final,
                r.id_reserva,
                c.nombres || ' ' || c.apellidos AS nombre_pasajero
            FROM tiquetes t
            JOIN reservas r ON t.id_reserva = r.id_reserva
            JOIN clientes c ON r.id_cliente = c.id_cliente
            ORDER BY t.id_tiquete ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo boletos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Actualizar un boleto (Editar o Mejorar)
app.put('/api/boletos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { clase, num_asiento, precio_final } = req.body;
        
        await pool.query(
            'UPDATE tiquetes SET clase = $1, num_asiento = $2, precio_final = $3 WHERE id_tiquete = $4', 
            [clase, num_asiento, precio_final, id]
        );
        res.json({ message: 'Boleto actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar boleto:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});