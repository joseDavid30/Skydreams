const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor backend está funcionando!');
});

// ==========================================
// VUELOS
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

app.post('/api/vuelos', async (req, res) => {
  try {
    const { codigo, origen, destino, fecha_salida, fecha_llegada, precio_base, capacidad, estado } = req.body;
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

app.delete('/api/vuelos/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    await pool.query('DELETE FROM vuelos WHERE id_vuelo = $1', [id]);
    res.json({ mensaje: 'Vuelo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar vuelo:', err.message);
    res.status(500).json({ error: 'Error al eliminar en la base de datos' });
  }
});

// ==========================================
// RESERVAS
// ==========================================
app.get('/api/reservas', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_reserva,
                r.fecha_hora_reserva,
                r.valor_total,
                er.nombre_estado AS estado,
                c.nombres || ' ' || c.apellidos AS cliente_nombre,
                c.correo AS cliente_email,
                c.telefono_principal AS cliente_telefono,
                v.cod_vuelo,
                co.nombre AS origen,
                cd.nombre AS destino,
                (SELECT COUNT(*) FROM tiquetes t WHERE t.id_reserva = r.id_reserva) AS numero_boletos,
                COALESCE(pt.nombre, 'Ninguno') AS paquete_turistico
            FROM reservas r
            JOIN estado_reserva er ON r.id_estado = er.id_estado
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN clientes c ON u.id_cliente = c.id_cliente
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

app.put('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; 
        
        const estadoRes = await pool.query('SELECT id_estado FROM estado_reserva WHERE nombre_estado = $1', [estado]);
        if (estadoRes.rows.length === 0) return res.status(400).json({error: 'Estado no válido'});
        const id_estado = estadoRes.rows[0].id_estado;

        await pool.query('UPDATE reservas SET id_estado = $1 WHERE id_reserva = $2', [id_estado, id]);
        await pool.query('INSERT INTO historial_reservas (id_reserva, id_estado) VALUES ($1, $2)', [id, id_estado]);

        res.json({ message: 'Reserva actualizada correctamente' });
    } catch (error) {
        console.error("Error al actualizar reserva:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.delete('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM reservas WHERE id_reserva = $1', [id]);
        res.json({ message: 'Reserva eliminada permanentemente' });
    } catch (error) {
        console.error("Error al eliminar reserva:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ==========================================
// TIQUETES (BOLETOS)
// ==========================================
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
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN clientes c ON u.id_cliente = c.id_cliente
            ORDER BY t.id_tiquete ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo boletos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

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
// PAQUETES TURÍSTICOS
// ==========================================
app.get('/api/paquetes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM paquetes_turisticos ORDER BY id_paquete ASC');
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo paquetes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.post('/api/paquetes', async (req, res) => {
    try {
        const { nombre, descripcion, sector_destino, precio, estado } = req.body;
        await pool.query(
            'INSERT INTO paquetes_turisticos (nombre, descripcion, sector_destino, precio, estado) VALUES ($1, $2, $3, $4, $5)',
            [nombre, descripcion, sector_destino, precio, estado]
        );
        res.json({ message: 'Paquete creado con éxito' });
    } catch (error) {
        console.error("Error creando paquete:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.put('/api/paquetes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, sector_destino, precio, estado } = req.body;
        
        await pool.query(
            'UPDATE paquetes_turisticos SET nombre = $1, descripcion = $2, sector_destino = $3, precio = $4, estado = $5 WHERE id_paquete = $6',
            [nombre, descripcion, sector_destino, precio, estado, id]
        );
        res.json({ message: 'Paquete actualizado' });
    } catch (error) {
        console.error("Error actualizando paquete:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

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
// CLIENTES
// ==========================================
app.get('/api/clientes', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id_cliente,
                c.identificacion,
                c.nombres,
                c.apellidos,
                c.nombres || ' ' || c.apellidos AS nombre_completo,
                c.correo,
                c.telefono_principal AS telefono,
                c.telefono_alterno,
                c.id_ciudad,  /* <--- ESTA ES LA LÍNEA NUEVA QUE NECESITAMOS */
                ci.nombre AS ciudad,
                c.direccion,
                c.fecha_registro,
                (SELECT COUNT(*) FROM usuarios u JOIN reservas r ON u.id_usuario = r.id_usuario WHERE u.id_cliente = c.id_cliente) AS total_reservas
            FROM clientes c
            LEFT JOIN ciudades ci ON c.id_ciudad = ci.id_ciudad
            ORDER BY c.id_cliente ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo clientes:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { identificacion, nombres, apellidos, correo, telefono_principal, telefono_alterno, id_ciudad, direccion } = req.body;
        
        await pool.query(
            'UPDATE clientes SET identificacion = $1, nombres = $2, apellidos = $3, correo = $4, telefono_principal = $5, telefono_alterno = $6, id_ciudad = $7, direccion = $8 WHERE id_cliente = $9',
            [identificacion, nombres, apellidos, correo, telefono_principal, telefono_alterno, id_ciudad, direccion, id]
        );
        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error("Error actualizando cliente:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.get('/api/clientes/:id/reservas', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                r.id_reserva,
                r.fecha_hora_reserva,
                r.valor_total,
                er.nombre_estado AS estado,
                v.cod_vuelo,
                co.nombre AS origen,
                cd.nombre AS destino
            FROM reservas r
            JOIN estado_reserva er ON r.id_estado = er.id_estado
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo
            JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            WHERE u.id_cliente = $1
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
// USUARIOS
// ==========================================
app.get('/api/usuarios', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_usuario,
                username,
                email,
                estado,
                id_cliente,
                rol AS tipo_rol
            FROM usuarios
            ORDER BY id_usuario ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { username, email, contrasena, tipo_rol, id_cliente } = req.body;
        const cliente_id = (id_cliente && id_cliente !== "0" && id_cliente !== 0) ? id_cliente : null;

        await pool.query(
            'INSERT INTO usuarios (username, email, contrasena, rol, id_cliente) VALUES ($1, $2, $3, $4, $5)',
            [username, email, contrasena, tipo_rol, cliente_id]
        );
        res.json({ message: 'Usuario creado' });
    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, tipo_rol, id_cliente } = req.body;
        const cliente_id = (id_cliente && id_cliente !== "0" && id_cliente !== 0) ? id_cliente : null;

        await pool.query(
            'UPDATE usuarios SET username = $1, email = $2, rol = $3, id_cliente = $4 WHERE id_usuario = $5',
            [username, email, tipo_rol, cliente_id, id]
        );
        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al editar usuario" });
    }
});

app.put('/api/usuarios/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await pool.query('UPDATE usuarios SET estado = $1 WHERE id_usuario = $2', [estado, id]);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        res.status(500).json({ error: "Error al editar estado" });
    }
});

// ==========================================
// UBICACIONES
// ==========================================
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

app.post('/api/paises', async (req, res) => {
    try {
        await pool.query('INSERT INTO paises (nombre, codigo) VALUES ($1, $2)', [req.body.nombre, req.body.codigo]);
        res.json({ message: 'País creado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/departamentos', async (req, res) => {
    try {
        await pool.query('INSERT INTO departamentos (nombre, id_pais) VALUES ($1, $2)', [req.body.nombre, req.body.id_pais]);
        res.json({ message: 'Departamento creado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/ciudades', async (req, res) => {
    try {
        await pool.query('INSERT INTO ciudades (nombre, id_departamento) VALUES ($1, $2)', [req.body.nombre, req.body.id_departamento]);
        res.json({ message: 'Ciudad creada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/paises/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, codigo } = req.body;
        await pool.query('UPDATE paises SET nombre = $1, codigo = $2 WHERE id_pais = $3', [nombre, codigo, id]);
        res.json({ message: 'País actualizado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/paises/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM paises WHERE id_pais = $1', [id]);
        res.json({ message: 'País eliminado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, id_pais } = req.body;
        await pool.query('UPDATE departamentos SET nombre = $1, id_pais = $2 WHERE id_departamento = $3', [nombre, id_pais, id]);
        res.json({ message: 'Departamento actualizado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/departamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM departamentos WHERE id_departamento = $1', [id]);
        res.json({ message: 'Departamento eliminado' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.put('/api/ciudades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, id_departamento } = req.body;
        await pool.query('UPDATE ciudades SET nombre = $1, id_departamento = $2 WHERE id_ciudad = $3', [nombre, id_departamento, id]);
        res.json({ message: 'Ciudad actualizada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.delete('/api/ciudades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM ciudades WHERE id_ciudad = $1', [id]);
        res.json({ message: 'Ciudad eliminada' });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// ==========================================
// REGISTRO Y LOGIN (FRONTEND WEB)
// ==========================================
app.post('/api/registro', async (req, res) => {
    try {
        const { identificacion, nombres, apellidos, correo, telefono_principal, telefono_alterno, password } = req.body;
        
        const resultCliente = await pool.query(
            'INSERT INTO clientes (identificacion, nombres, apellidos, correo, telefono_principal, telefono_alterno) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_cliente',
            [identificacion, nombres, apellidos, correo, telefono_principal, telefono_alterno]
        );
        const id_cliente = resultCliente.rows[0].id_cliente;

        await pool.query(
            'INSERT INTO usuarios (username, email, contrasena, rol, id_cliente) VALUES ($1, $2, $3, $4, $5)',
            [correo, correo, password, 'Cliente', id_cliente] 
        );
        
        res.json({ message: 'Registro exitoso' });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ error: "Error guardando en la base de datos" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND contrasena = $2', 
            [email, password]
        );
        
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// ==========================================
// BUSCADOR Y RESERVAS FRONTEND
// ==========================================
app.get('/api/vuelos/buscar', async (req, res) => {
    try {
        const { origen, destino, fecha_ida } = req.query;

        const query = `
            SELECT v.*, co.nombre AS ciudad_origen, cd.nombre AS ciudad_destino
            FROM vuelos v
            JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            WHERE co.nombre = $1 AND cd.nombre = $2 AND DATE(v.fecha_hora_salida) = $3
            ORDER BY v.fecha_hora_salida ASC
        `;
        
        const result = await pool.query(query, [origen, destino, fecha_ida]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error buscando vuelos:", error);
        res.status(500).json({ error: "Error interno al buscar vuelos" });
    }
});

app.post('/api/reservas/crear', async (req, res) => {
    try {
        const { email, id_vuelo, valor_total, pasajeros, clase } = req.body;

        const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        const { id_usuario } = userRes.rows[0];

        const estadoRes = await pool.query("SELECT id_estado FROM estado_reserva WHERE nombre_estado = 'Reservada'");
        const id_estado = estadoRes.rows[0].id_estado;

        const reservaRes = await pool.query(
            'INSERT INTO reservas (valor_total, id_estado, id_usuario, id_vuelo) VALUES ($1, $2, $3, $4) RETURNING id_reserva',
            [valor_total, id_estado, id_usuario, id_vuelo]
        );
        const id_reserva = reservaRes.rows[0].id_reserva;

        await pool.query('INSERT INTO historial_reservas (id_reserva, id_estado) VALUES ($1, $2)', [id_reserva, id_estado]);

        const precioPorPasajero = valor_total / pasajeros;
        for (let i = 0; i < pasajeros; i++) {
            const asiento = `${Math.floor(Math.random() * 30) + 1}${['A','B','C','D','E','F'][Math.floor(Math.random() * 6)]}`;
            
            await pool.query(
                'INSERT INTO tiquetes (clase, num_asiento, precio_final, id_reserva) VALUES ($1, $2, $3, $4)',
                [clase, asiento, precioPorPasajero, id_reserva]
            );
        }

        res.json({ success: true, mensaje: 'Reserva guardada en la base de datos' });
    } catch (error) {
        console.error("Error al guardar reserva:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ==========================================
// RUTA DEL DASHBOARD (PANEL PRINCIPAL)
// ==========================================
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // 1. KPIs (Tarjetas superiores)
        const vuelosHoy = await pool.query("SELECT COUNT(*) FROM vuelos WHERE DATE(fecha_hora_salida) = CURRENT_DATE");
        const reservasActivas = await pool.query("SELECT COUNT(*) FROM reservas r JOIN estado_reserva er ON r.id_estado = er.id_estado WHERE er.nombre_estado = 'Confirmada'");
        const ingresosHoy = await pool.query("SELECT COALESCE(SUM(valor_total), 0) AS total FROM reservas WHERE DATE(fecha_hora_reserva) = CURRENT_DATE AND id_estado = (SELECT id_estado FROM estado_reserva WHERE nombre_estado = 'Confirmada')");
        const boletosVendidos = await pool.query("SELECT COUNT(*) FROM tiquetes");
        const capacidadFlota = await pool.query("SELECT COALESCE(SUM(capacidad_total), 0) AS asientos FROM vuelos WHERE estado_vuelo IN ('Programado', 'Abordando')");
        const paquetesActivos = await pool.query("SELECT COUNT(*) FROM paquetes_turisticos WHERE estado = 'Activo'");

        // 2. Gráficos (Agrupados por mes)
        // Reservas de los últimos 6 meses
        const graficoReservas = await pool.query(`
            SELECT TO_CHAR(fecha_hora_reserva, 'Mon') AS mes, COUNT(*) AS total 
            FROM reservas 
            WHERE fecha_hora_reserva >= NOW() - INTERVAL '6 months'
            GROUP BY EXTRACT(MONTH FROM fecha_hora_reserva), TO_CHAR(fecha_hora_reserva, 'Mon')
            ORDER BY EXTRACT(MONTH FROM fecha_hora_reserva)
        `);
        // Ingresos de los últimos 6 meses
        const graficoIngresos = await pool.query(`
            SELECT TO_CHAR(fecha_hora_reserva, 'Mon') AS mes, COALESCE(SUM(valor_total), 0) AS total 
            FROM reservas 
            WHERE id_estado = (SELECT id_estado FROM estado_reserva WHERE nombre_estado = 'Confirmada')
            AND fecha_hora_reserva >= NOW() - INTERVAL '6 months'
            GROUP BY EXTRACT(MONTH FROM fecha_hora_reserva), TO_CHAR(fecha_hora_reserva, 'Mon')
            ORDER BY EXTRACT(MONTH FROM fecha_hora_reserva)
        `);

        // 3. Top 5 Destinos Más Populares
        const destinos = await pool.query(`
            SELECT cd.nombre AS destino, COUNT(r.id_reserva) AS total_reservas 
            FROM reservas r 
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo 
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad 
            GROUP BY cd.id_ciudad, cd.nombre 
            ORDER BY total_reservas DESC 
            LIMIT 5
        `);

        // 4. Actividad Reciente (Últimos 5 cambios en el historial)
        const actividad = await pool.query(`
            SELECT hr.fecha_cambio, er.nombre_estado, r.id_reserva, c.nombres, c.apellidos, v.cod_vuelo, cd.nombre as ciudad_destino
            FROM historial_reservas hr
            JOIN reservas r ON hr.id_reserva = r.id_reserva
            JOIN estado_reserva er ON hr.id_estado = er.id_estado
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN clientes c ON u.id_cliente = c.id_cliente
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            ORDER BY hr.fecha_cambio DESC
            LIMIT 5
        `);

        res.json({
            kpis: {
                vuelosHoy: vuelosHoy.rows[0].count,
                reservasActivas: reservasActivas.rows[0].count,
                ingresosHoy: parseFloat(ingresosHoy.rows[0].total),
                boletosVendidos: boletosVendidos.rows[0].count,
                asientosDisponibles: capacidadFlota.rows[0].asientos,
                paquetesActivos: paquetesActivos.rows[0].count
            },
            graficos: {
                reservas: graficoReservas.rows,
                ingresos: graficoIngresos.rows
            },
            destinosTop: destinos.rows,
            actividadReciente: actividad.rows
        });
    } catch (error) {
        console.error("Error cargando dashboard:", error);
        res.status(500).json({ error: "Error cargando estadísticas" });
    }
});

// ==========================================
// MÓDULO DE REPORTES Y ANÁLISIS PROFUNDO
// ==========================================

// 1. Clientes Frecuentes (Mayor número de reservas)
app.get('/api/reportes/clientes-frecuentes', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.identificacion, 
                c.nombres || ' ' || c.apellidos AS cliente, 
                c.correo, 
                COUNT(r.id_reserva) AS total_reservas,
                SUM(r.valor_total) AS dinero_invertido
            FROM clientes c
            JOIN usuarios u ON c.id_cliente = u.id_cliente
            JOIN reservas r ON u.id_usuario = r.id_usuario
            JOIN estado_reserva er ON r.id_estado = er.id_estado
            WHERE er.nombre_estado = 'Confirmada'
            GROUP BY c.id_cliente, c.identificacion, c.nombres, c.apellidos, c.correo
            ORDER BY total_reservas DESC, dinero_invertido DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error en reporte de clientes" }); }
});

// 2. Cobertura: Vuelos por País, Departamento y Ciudad
app.get('/api/reportes/cobertura', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.nombre AS pais, 
                d.nombre AS departamento, 
                cd.nombre AS ciudad_destino,
                v.cod_vuelo, 
                co.nombre AS ciudad_origen, 
                v.estado_vuelo
            FROM vuelos v
            JOIN ciudades cd ON v.id_ciudad_destino = cd.id_ciudad
            JOIN departamentos d ON cd.id_departamento = d.id_departamento
            JOIN paises p ON d.id_pais = p.id_pais
            JOIN ciudades co ON v.id_ciudad_origen = co.id_ciudad
            ORDER BY p.nombre ASC, d.nombre ASC, cd.nombre ASC, v.fecha_hora_salida ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error en reporte de cobertura" }); }
});

// 3. Análisis de Cancelaciones (Reservas canceladas y causas)
app.get('/api/reportes/cancelaciones', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_reserva, 
                v.cod_vuelo, 
                c.nombres || ' ' || c.apellidos AS cliente,
                hr.fecha_cambio AS fecha_cancelacion, 
                r.valor_total,
                'Decisión del cliente o falta de pago' AS causa_estimada
            FROM historial_reservas hr
            JOIN estado_reserva er ON hr.id_estado = er.id_estado
            JOIN reservas r ON hr.id_reserva = r.id_reserva
            JOIN vuelos v ON r.id_vuelo = v.id_vuelo
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN clientes c ON u.id_cliente = c.id_cliente
            WHERE er.nombre_estado = 'Cancelada'
            ORDER BY hr.fecha_cambio DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error en reporte de cancelaciones" }); }
});

// 4. Eficiencia: Tiempo promedio entre reserva y confirmación
app.get('/api/reportes/eficiencia', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_reserva,
                c.nombres || ' ' || c.apellidos AS cliente,
                r.fecha_hora_reserva AS momento_reserva,
                hr.fecha_cambio AS momento_confirmacion,
                ROUND(CAST(EXTRACT(EPOCH FROM (hr.fecha_cambio - r.fecha_hora_reserva))/60 AS NUMERIC), 2) AS minutos_transcurridos
            FROM reservas r
            JOIN historial_reservas hr ON r.id_reserva = hr.id_reserva
            JOIN estado_reserva er ON hr.id_estado = er.id_estado
            JOIN usuarios u ON r.id_usuario = u.id_usuario
            JOIN clientes c ON u.id_cliente = c.id_cliente
            WHERE er.nombre_estado = 'Confirmada' 
            AND hr.fecha_cambio > r.fecha_hora_reserva
            ORDER BY minutos_transcurridos DESC;
        `;
        const result = await pool.query(query);
        
        // Calcular el promedio general para mostrarlo en grande
        let sumaMinutos = 0;
        result.rows.forEach(row => sumaMinutos += parseFloat(row.minutos_transcurridos));
        const promedioGeneral = result.rows.length > 0 ? (sumaMinutos / result.rows.length).toFixed(2) : 0;

        res.json({ promedioGlobal: promedioGeneral, detalle: result.rows });
    } catch (error) { res.status(500).json({ error: "Error en reporte de eficiencia" }); }
});
// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});