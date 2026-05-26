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
// RUTAS PARA PAQUETES TURÍSTICOS
// ==========================================

// Leer todos los paquetes
app.get('/api/paquetes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM paquetes_turisticos ORDER BY id_paquete ASC');
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo paquetes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// Crear un nuevo paquete
app.post('/api/paquetes', async (req, res) => {
    try {
        const { nombre, descripcion, sector_destino, duracion, precio, estado } = req.body;
        await pool.query(
            'INSERT INTO paquetes_turisticos (nombre, descripcion, sector_destino, duracion, precio, estado) VALUES ($1, $2, $3, $4, $5, $6)',
            [nombre, descripcion, sector_destino, duracion, precio, estado]
        );
        res.json({ message: 'Paquete creado con éxito' });
    } catch (error) {
        console.error("Error creando paquete:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// Actualizar un paquete (Editar todo o solo cambiar estado)
app.put('/api/paquetes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, sector_destino, duracion, precio, estado } = req.body;
        
        await pool.query(
            'UPDATE paquetes_turisticos SET nombre = $1, descripcion = $2, sector_destino = $3, duracion = $4, precio = $5, estado = $6 WHERE id_paquete = $7',
            [nombre, descripcion, sector_destino, duracion, precio, estado, id]
        );
        res.json({ message: 'Paquete actualizado' });
    } catch (error) {
        console.error("Error actualizando paquete:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// Eliminar un paquete permanentemente
app.delete('/api/paquetes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM paquetes_turisticos WHERE id_paquete = $1', [id]);
        res.json({ message: 'Paquete eliminado' });
    } catch (error) {
        console.error("Error eliminando paquete:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// ==========================================
// RUTAS PARA GESTIÓN DE CLIENTES
// ==========================================

// 1. Obtener todos los clientes (ACTUALIZADO para traer nombres separados)
app.get('/api/clientes', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id_cliente,
                c.nombres,
                c.apellidos,
                c.nombres || ' ' || c.apellidos AS nombre_completo,
                c.correo,
                c.telefono,
                c.direccion AS ciudad,
                c.fecha_registro,
                COUNT(r.id_reserva) AS total_reservas
            FROM clientes c
            LEFT JOIN reservas r ON c.id_cliente = r.id_cliente
            GROUP BY c.id_cliente
            ORDER BY c.id_cliente ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo clientes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// 2. Editar información del cliente
app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombres, apellidos, correo, telefono, ciudad } = req.body;
        
        await pool.query(
            'UPDATE clientes SET nombres = $1, apellidos = $2, correo = $3, telefono = $4, direccion = $5 WHERE id_cliente = $6',
            [nombres, apellidos, correo, telefono, ciudad, id]
        );
        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error("Error actualizando cliente:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// 3. Obtener el historial de reservas de un cliente específico
app.get('/api/clientes/:id/reservas', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                r.id_reserva,
                r.fecha_hora_reserva,
                r.valor_total,
                r.estado,
                v.cod_vuelo,
                co.nombre AS origen,
                cd.nombre AS destino
            FROM reservas r
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo
            JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            WHERE r.id_cliente = $1
            ORDER BY r.id_reserva DESC;
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo historial:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// ==========================================
// RUTAS PARA USUARIOS Y ROLES
// ==========================================

// Obtener todos los usuarios con sus roles
app.get('/api/usuarios', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id_usuario,
                u.username,
                u.email,
                u.estado,
                u.id_cliente,
                r.tipo_rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// Crear un nuevo usuario
app.post('/api/usuarios', async (req, res) => {
    try {
        const { username, email, contrasena, tipo_rol, id_cliente } = req.body;
        
        // Buscar el ID del rol
        const rolResult = await pool.query('SELECT id_rol FROM roles WHERE tipo_rol = $1', [tipo_rol]);
        const id_rol = rolResult.rows[0].id_rol;

        // 🛡️ EL BLINDAJE: Si viene vacío, nulo, o es un "0", lo forzamos a ser NULL
        const cliente_id = (id_cliente && id_cliente !== "0" && id_cliente !== 0) ? id_cliente : null;

        await pool.query(
            'INSERT INTO usuarios (username, email, contrasena, id_rol, id_cliente) VALUES ($1, $2, $3, $4, $5)',
            [username, email, contrasena, id_rol, cliente_id]
        );
        res.json({ message: 'Usuario creado' });
    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// Actualizar datos de un usuario
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, tipo_rol, id_cliente } = req.body;
        
        // Buscar el ID del rol
        const rolResult = await pool.query('SELECT id_rol FROM roles WHERE tipo_rol = $1', [tipo_rol]);
        const id_rol = rolResult.rows[0].id_rol;

        // 🛡️ EL BLINDAJE: También lo aplicamos al editar
        const cliente_id = (id_cliente && id_cliente !== "0" && id_cliente !== 0) ? id_cliente : null;

        await pool.query(
            'UPDATE usuarios SET username = $1, email = $2, id_rol = $3, id_cliente = $4 WHERE id_usuario = $5',
            [username, email, id_rol, cliente_id, id]
        );
        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al editar usuario" });
    }
});

// ==========================================
// RUTAS PARA GESTIÓN DE UBICACIONES
// ==========================================

// Obtener toda la jerarquía de un golpe
app.get('/api/ubicaciones', async (req, res) => {
    try {
        const paises = await pool.query('SELECT * FROM paises ORDER BY nombre');
        const departamentos = await pool.query('SELECT * FROM departamentos ORDER BY nombre');
        const ciudades = await pool.query('SELECT * FROM ciudades ORDER BY nombre');
        
        res.json({
            paises: paises.rows,
            departamentos: departamentos.rows,
            ciudades: ciudades.rows
        });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo ubicaciones" });
    }
});

// Crear País
app.post('/api/paises', async (req, res) => {
    try {
        await pool.query('INSERT INTO paises (nombre, codigo) VALUES ($1, $2)', [req.body.nombre, req.body.codigo]);
        res.json({ message: 'País creado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// Crear Departamento
app.post('/api/departamentos', async (req, res) => {
    try {
        await pool.query('INSERT INTO departamentos (nombre, id_pais) VALUES ($1, $2)', [req.body.nombre, req.body.id_pais]);
        res.json({ message: 'Departamento creado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// Crear Ciudad
app.post('/api/ciudades', async (req, res) => {
    try {
        await pool.query('INSERT INTO ciudades (nombre, id_departamento) VALUES ($1, $2)', [req.body.nombre, req.body.id_departamento]);
        res.json({ message: 'Ciudad creada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ==========================================
// CRUD EXPANDIDO: UBICACIONES
// ==========================================

// EDITAR: País
app.put('/api/paises/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, codigo } = req.body;
        await pool.query('UPDATE paises SET nombre = $1, codigo = $2 WHERE id_pais = $3', [nombre, codigo, id]);
        res.json({ message: 'País actualizado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ELIMINAR: País (Por cascada borrará sus deptos y ciudades)
app.delete('/api/paises/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM paises WHERE id_pais = $1', [id]);
        res.json({ message: 'País eliminado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// EDITAR: Departamento
app.put('/api/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, id_pais } = req.body;
        await pool.query('UPDATE departamentos SET nombre = $1, id_pais = $2 WHERE id_departamento = $3', [nombre, id_pais, id]);
        res.json({ message: 'Departamento actualizado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ELIMINAR: Departamento
app.delete('/api/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM departamentos WHERE id_departamento = $1', [id]);
        res.json({ message: 'Departamento eliminado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// EDITAR: Ciudad
app.put('/api/ciudades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, id_departamento } = req.body;
        await pool.query('UPDATE ciudades SET nombre = $1, id_departamento = $2 WHERE id_ciudad = $3', [nombre, id_departamento, id]);
        res.json({ message: 'Ciudad actualizada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ELIMINAR: Ciudad
app.delete('/api/ciudades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM ciudades WHERE id_ciudad = $1', [id]);
        res.json({ message: 'Ciudad eliminada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});