// ==============================================================
// 1. CARGA DINÁMICA DE VISTAS (Navegación)
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link');
    const mainContent = document.getElementById('main-content');

    links.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Cambiamos visualmente el menú activo
            links.forEach(l => l.classList.remove('active-menu'));
            link.classList.add('active-menu');

            const page = link.getAttribute('data-page');
            const title = link.querySelector('span').textContent;

            await cargarVista(page, title);
        });
    });

// Función asíncrona para cargar los HTML externos desde vistas_admin
    async function cargarVista(page, title) {
        try {
            let nombreArchivo = page;
            if (page === 'dashboard') {
                nombreArchivo = 'dashboard_inicio'; 
            }

            const respuesta = await fetch(`vistas_admin/${nombreArchivo}.html`);
            
            if (respuesta.ok) {
                const html = await respuesta.text();
                mainContent.innerHTML = html;

                // Disparamos la lógica correspondiente
                if (page === 'dashboard') {
                    initCharts(); 
                } else if (page === 'vuelos') {
                    cargarVuelosDesdeBD();
                } else if (page === 'reservas') { 
                    cargarReservasDesdeBD();
                } else if (page === 'boletos') {
                    cargarBoletosDesdeBD();
                } else if (page === 'paquetes') {
                    cargarPaquetesDesdeBD();
                } else if (page === 'clientes') { 
                    cargarClientesDesdeBD(); 
                } else if (page === 'usuarios') {
                    cargarUsuariosDesdeBD();
                } 
            } else {
                // Esto se ejecuta si el archivo HTML no existe (ej. error 404)
                mostrarConstruccion(title);
            }
        } catch (error) {
            console.error("Error cargando la vista:", error);
            mostrarConstruccion(title);
        }
    }
    // Genera el HTML de construcción dinámicamente
    function mostrarConstruccion(title) {
        mainContent.innerHTML = `
            <div class="mb-4">
                <h2 class="fw-bold text-dark mb-1">${title}</h2>
                <p class="text-muted">Administración del módulo de ${title}</p>
            </div>
            <div class="stat-card p-5 text-center bg-white shadow-sm border-0 rounded-4">
                <div class="icon-box bg-warning-subtle text-warning mx-auto mb-4 d-flex align-items-center justify-content-center rounded-3" style="width: 80px; height: 80px;">
                    <i class="bi bi-tools fs-1"></i>
                </div>
                <h4>Módulo en construcción</h4>
                <p class="text-muted">El archivo vistas_admin/${title.toLowerCase()}.html aún no existe.</p>
            </div>
        `;
    }

    // Función para inicializar los gráficos del Dashboard
    function initCharts() {
        const resCanvas = document.getElementById('reservasChart');
        if(resCanvas && Chart.getChart(resCanvas) === undefined) {
            new Chart(resCanvas, {
                type: 'bar',
                data: {
                    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                    datasets: [{ data: [12, 19, 15, 22, 28, 36, 31], backgroundColor: '#de7b0aea', borderRadius: 8, barThickness: 25 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
            });
        }

        const ingCanvas = document.getElementById('ingresosChart');
        if(ingCanvas && Chart.getChart(ingCanvas) === undefined) {
            new Chart(ingCanvas, {
                type: 'line',
                data: {
                    labels: ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'],
                    datasets: [{ data: [125000, 142000, 138000, 168000, 152000, 175000, 195000], borderColor: '#de7b0aea', backgroundColor: 'rgba(222, 123, 10, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', borderWidth: 3 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
            });
        }
    }

    // Carga inicial al abrir la página
    cargarVista('dashboard', 'Panel Principal');
});

// ==============================================================
// 2. HELPERS Y FUNCIONES UI GLOBALES
// ==============================================================

window.seleccionarEstado = function(elemento, estado) {
    document.getElementById('texto-estado').textContent = estado;
    const opciones = elemento.closest('.dropdown-menu').querySelectorAll('.dropdown-item');
    opciones.forEach(opc => {
        opc.classList.remove('bg-light', 'fw-medium');
        const icono = opc.querySelector('i.bi-check2');
        if(icono) icono.remove();
    });
    elemento.classList.add('bg-light', 'fw-medium');
    elemento.innerHTML = `${estado} <i class="bi bi-check2"></i>`;
};

function obtenerColorEstado(estado) {
    switch(estado) {
        case 'Programado': return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047;';
        case 'Abordando': return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047;';
        case 'En Vuelo': return 'background-color: #fcd34d; color: #854d0e; border: 1px solid #fcd34d;';
        case 'Completado': return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047;';
        case 'Cancelado': return 'background-color: #e2e8f0; color: #334155; border: 1px solid #cbd5e1;';
        default: return 'background-color: #f8f9fa; color: #6c757d;';
    }
}

// ==============================================================
// 3. BASE DE DATOS Y CRUD DE VUELOS
// ==============================================================

let listaVuelosGlobal = [];
let idVueloEditando = null;

async function cargarVuelosDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/vuelos');
        const vuelos = await respuesta.json();
        
        listaVuelosGlobal = vuelos;

        const tbody = document.querySelector('#seccion-vuelos tbody');
        if (!tbody) return; // Si la tabla no se ha cargado en el DOM, evitamos errores
        
        tbody.innerHTML = ''; 
        
        if(vuelos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hay vuelos registrados en la base de datos.</td></tr>`;
            return;
        }

        vuelos.forEach(vuelo => {
            const fechaSalida = new Date(vuelo.fecha_salida);
            const fechaLlegada = new Date(vuelo.fecha_llegada);
            const opcionesFecha = { day: 'numeric', month: 'short' };
            const opcionesHora = { hour: '2-digit', minute: '2-digit', hour12: false };

            const html = `
                <tr>
                    <td class="ps-4 py-3 fw-bold text-dark">${vuelo.codigo}</td>
                    <td class="py-3">
                        <div class="text-dark">${vuelo.origen}</div>
                        <div class="text-muted small">→ ${vuelo.destino}</div>
                    </td>
                    <td class="py-3">
                        <div class="text-dark">${fechaSalida.toLocaleDateString('es-ES', opcionesFecha)},</div>
                        <div class="text-dark">${fechaSalida.toLocaleTimeString('es-ES', opcionesHora)}</div>
                    </td>
                    <td class="py-3">
                        <div class="text-dark">${fechaLlegada.toLocaleDateString('es-ES', opcionesFecha)},</div>
                        <div class="text-dark">${fechaLlegada.toLocaleTimeString('es-ES', opcionesHora)}</div>
                    </td>
                    <td class="py-3 text-dark">$${parseFloat(vuelo.precio_base).toLocaleString('es-ES')}</td>
                    <td class="py-3 text-dark">${vuelo.capacidad}</td>
                    <td class="py-3">
                        <span class="badge rounded-pill" style="${obtenerColorEstado(vuelo.estado)} padding: 0.5em 1em; font-weight: 500;">
                            ${vuelo.estado}
                        </span>
                    </td>
                    <td class="pe-4 py-3 text-center">
                        <button class="btn btn-sm text-secondary hover-dark" onclick="abrirModalEditar(${vuelo.id})"><i class="bi bi-pencil-square fs-5"></i></button>
                        <button class="btn btn-sm text-secondary hover-dark" onclick="eliminarVuelo(${vuelo.id})"><i class="bi bi-trash fs-5"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += html;
        });

    } catch (error) {
        console.error("Error cargando los vuelos:", error);
    }
}

function abrirModalCrear() {
    idVueloEditando = null; 
    document.getElementById('form-agregar-vuelo').reset(); 
    document.getElementById('modalAgregarVueloLabel').textContent = 'Agregar Nuevo Vuelo';
    document.getElementById('btn-guardar').textContent = 'Agregar Vuelo';
}

function abrirModalEditar(id) {
    idVueloEditando = id;
    const vuelo = listaVuelosGlobal.find(v => v.id === id);

    const adaptarFechaInput = (fechaIso) => {
        if (!fechaIso) return '';
        const fecha = new Date(fechaIso);
        fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
        return fecha.toISOString().slice(0, 16);
    };

    document.getElementById('in-codigo').value = vuelo.codigo;
    document.getElementById('in-estado').value = vuelo.estado;
    document.getElementById('in-origen').value = vuelo.origen_id; 
    document.getElementById('in-destino').value = vuelo.destino_id;
    document.getElementById('in-salida').value = adaptarFechaInput(vuelo.fecha_salida);
    document.getElementById('in-llegada').value = adaptarFechaInput(vuelo.fecha_llegada);
    document.getElementById('in-precio').value = parseFloat(vuelo.precio_base);
    document.getElementById('in-capacidad').value = vuelo.capacidad;

    document.getElementById('modalAgregarVueloLabel').textContent = 'Editar Vuelo';
    document.getElementById('btn-guardar').textContent = 'Guardar Cambios';

    const modal = new bootstrap.Modal(document.getElementById('modalAgregarVuelo'));
    modal.show();
}

async function guardarNuevoVuelo() {
    const datosVuelo = {
        codigo: document.getElementById('in-codigo').value,
        estado: document.getElementById('in-estado').value,
        origen: document.getElementById('in-origen').value,
        destino: document.getElementById('in-destino').value,
        fecha_salida: document.getElementById('in-salida').value,
        fecha_llegada: document.getElementById('in-llegada').value,
        precio_base: document.getElementById('in-precio').value,
        capacidad: document.getElementById('in-capacidad').value
    };

    if (!datosVuelo.codigo || !datosVuelo.origen || !datosVuelo.fecha_salida) {
        alert("Por favor completa los campos principales.");
        return;
    }

    try {
        const url = idVueloEditando 
            ? `http://localhost:3000/api/vuelos/${idVueloEditando}` 
            : 'http://localhost:3000/api/vuelos';
        
        const metodo = idVueloEditando ? 'PUT' : 'POST';

        const respuesta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVuelo)
        });

        if (respuesta.ok) {
            const modalEl = document.getElementById('modalAgregarVuelo');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            idVueloEditando = null; 
            cargarVuelosDesdeBD(); 
        } else {
            alert("Error al procesar el vuelo. Verifica que el código no esté repetido o que la base de datos esté encendida.");
        }
    } catch (error) {
        console.error("Error guardando el vuelo:", error);
    }
}

async function eliminarVuelo(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este vuelo?")) {
        return; 
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/vuelos/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            cargarVuelosDesdeBD();
        } else {
            alert("No se pudo eliminar el vuelo.");
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
}

// ==========================================
// 4. FUNCIÓN DE PRUEBA: Autocompletar formulario
// ==========================================
function llenarDatosDePrueba() {
    const letras = ['AA', 'LA', 'IB', 'AV', 'DL'];
    const codigoRandom = letras[Math.floor(Math.random() * letras.length)] + Math.floor(Math.random() * 900 + 100);
    
    const origenId = Math.floor(Math.random() * 5) + 1;
    let destinoId = Math.floor(Math.random() * 5) + 1;
    while(origenId === destinoId) destinoId = Math.floor(Math.random() * 5) + 1; 

    const fechaSalida = new Date();
    fechaSalida.setDate(fechaSalida.getDate() + Math.floor(Math.random() * 15 + 1)); 
    fechaSalida.setHours(Math.floor(Math.random() * 14 + 6), 0, 0, 0); 
    
    const fechaLlegada = new Date(fechaSalida);
    fechaLlegada.setHours(fechaLlegada.getHours() + Math.floor(Math.random() * 10 + 2)); 

    const formatearFecha = (fecha) => {
        fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
        return fecha.toISOString().slice(0, 16);
    };

    document.getElementById('in-codigo').value = codigoRandom;
    document.getElementById('in-origen').value = origenId; 
    document.getElementById('in-destino').value = destinoId; 
    document.getElementById('in-salida').value = formatearFecha(fechaSalida);
    document.getElementById('in-llegada').value = formatearFecha(fechaLlegada);
    document.getElementById('in-precio').value = Math.floor(Math.random() * 1500 + 300);
    document.getElementById('in-capacidad').value = Math.floor(Math.random() * 200 + 150);
    document.getElementById('in-estado').value = 'Programado';
}

// ==============================================================
// MÓDULO DE RESERVAS (Conexión a BD Real)
// ==============================================================

let listaReservasGlobal = [];

async function cargarReservasDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/reservas');
        const reservas = await respuesta.json();
        
        listaReservasGlobal = reservas; // Guardamos globalmente para el modal

        const tbody = document.getElementById('tbody-reservas');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if(reservas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay reservas registradas en la base de datos.</td></tr>`;
            return;
        }

        reservas.forEach(reserva => {
            // Formatear datos para que se vean igual al diseño
            const idFormateado = 'RES' + String(reserva.id_reserva).padStart(3, '0');
            const vueloFormat = `${reserva.cod_vuelo} - ${reserva.origen} a ${reserva.destino}`;
            
            const fechaObj = new Date(reserva.fecha_hora_reserva);
            const fechaCorto = fechaObj.toLocaleDateString('es-ES');
            
            let claseBadge = reserva.estado === 'Cancelado' ? 'badge-cancelado' : 'badge-confirmado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 py-3 fw-bold text-dark">${idFormateado}</td>
                <td class="py-3 text-dark">${reserva.cliente_nombre}</td>
                <td class="py-3 text-dark">${vueloFormat}</td>
                <td class="py-3 text-dark">${fechaCorto}</td>
                <td class="py-3 text-dark">$${parseFloat(reserva.valor_total).toLocaleString('es-ES')}</td>
                <td class="py-3">
                    <span class="badge ${claseBadge}">${reserva.estado}</span>
                </td>
                <td class="pe-4 py-3 text-center">
                    <button class="btn btn-sm text-dark d-inline-flex align-items-center gap-1 hover-bg-light fw-medium" onclick="abrirModalReserva(${reserva.id_reserva})">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando las reservas reales:", error);
    }
}

window.abrirModalReserva = function(id_reserva) {
    // Buscamos la reserva seleccionada en la variable global
    const reserva = listaReservasGlobal.find(r => r.id_reserva === id_reserva);
    if (!reserva) return;

    // Formatear datos
    const idFormateado = 'RES' + String(reserva.id_reserva).padStart(3, '0');
    const vueloFormat = `${reserva.cod_vuelo} - ${reserva.origen} a ${reserva.destino}`;
    
    const fechaObj = new Date(reserva.fecha_hora_reserva);
    const fechaCorto = fechaObj.toLocaleDateString('es-ES');
    const fechaLargo = fechaObj.toLocaleString('es-ES');

    // Llenar Pestaña: Información General
    document.getElementById('modalReservaTitle').textContent = `Detalles de Reserva - ${idFormateado}`;
    document.getElementById('det-vuelo').textContent = vueloFormat;
    document.getElementById('det-fecha').textContent = fechaCorto;
    document.getElementById('det-valor').textContent = '$' + parseFloat(reserva.valor_total).toLocaleString('es-ES');
    document.getElementById('det-boletos').textContent = reserva.numero_boletos;
    document.getElementById('det-paquete').textContent = reserva.paquete_turistico;
    
    // Configurar el estado visual en el Modal
    const badgeEstado = document.getElementById('det-estado');
    badgeEstado.textContent = reserva.estado;
    badgeEstado.className = 'badge ' + (reserva.estado === 'Cancelado' ? 'badge-cancelado' : 'badge-confirmado');

    // Llenar Pestaña: Cliente
    document.getElementById('det-cli-nombre').textContent = reserva.cliente_nombre;
    document.getElementById('det-cli-email').textContent = reserva.cliente_email;
    document.getElementById('det-cli-tel').textContent = reserva.cliente_telefono;

    // Llenar Pestaña: Historial
    document.getElementById('hist-fecha-creacion').textContent = fechaLargo;
    document.getElementById('hist-estado-actual').textContent = reserva.estado;

    // ==========================================
    // CONFIGURAR BOTONES DE EDICIÓN Y BORRADO
    // ==========================================
    
    // 1. Botón Editar (Abre el modal pequeñito)
    const btnEditar = document.getElementById('btn-editar-reserva');
    btnEditar.onclick = () => {
        // Pre-seleccionar el estado actual en el select
        document.getElementById('select-nuevo-estado').value = reserva.estado;
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditarEstado'));
        modalEdit.show();
        
        // Guardar cambios
        document.getElementById('btn-guardar-estado').onclick = async () => {
            const nuevoEstado = document.getElementById('select-nuevo-estado').value;
            try {
                const response = await fetch(`http://localhost:3000/api/reservas/${reserva.id_reserva}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
                
                if (response.ok) {
                    modalEdit.hide(); // Cierra modal chiquito
                    bootstrap.Modal.getInstance(document.getElementById('modalDetalleReserva')).hide(); // Cierra modal grande
                    cargarReservasDesdeBD(); // Recarga la tabla
                    alert("¡Estado actualizado con éxito!");
                }
            } catch (error) {
                console.error("Error editando:", error);
                alert("Error al actualizar la reserva.");
            }
        };
    };

    // 2. Botón Borrar (Elimina la reserva de la BD)
    const btnBorrar = document.getElementById('btn-borrar-reserva');
    btnBorrar.onclick = async () => {
        const confirmacion = confirm(`¿Estás 100% seguro de que deseas ELIMINAR la reserva ${idFormateado}? Esta acción no se puede deshacer.`);
        
        if (confirmacion) {
            try {
                const response = await fetch(`http://localhost:3000/api/reservas/${reserva.id_reserva}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalDetalleReserva')).hide();
                    cargarReservasDesdeBD(); // Recarga la tabla automáticamente
                } else {
                    alert("Hubo un error al intentar borrar la reserva.");
                }
            } catch (error) {
                console.error("Error borrando:", error);
            }
        }
    };
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleReserva'));
    modal.show();
};

// ==============================================================
// MÓDULO DE BOLETOS
// ==============================================================

let listaBoletosGlobal = [];

async function cargarBoletosDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/boletos');
        const boletos = await respuesta.json();
        
        listaBoletosGlobal = boletos;

        const tbody = document.getElementById('tbody-boletos');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        boletos.forEach(boleto => {
            const idBoletoFormateado = 'TKT' + String(boleto.id_tiquete).padStart(3, '0');
            const idReservaFormateado = 'RES' + String(boleto.id_reserva).padStart(3, '0');
            
            let claseBadge = boleto.clase === 'Business' ? 'badge-business' : 'badge-economica';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 py-3 fw-bold text-dark">${idBoletoFormateado}</td>
                <td class="py-3 text-orange">${idReservaFormateado}</td>
                <td class="py-3 text-dark">${boleto.nombre_pasajero}</td>
                <td class="py-3 fw-medium text-dark">${boleto.num_asiento}</td>
                <td class="py-3">
                    <span class="badge ${claseBadge}">${boleto.clase}</span>
                </td>
                <td class="py-3 text-dark">$${parseFloat(boleto.precio_final).toLocaleString('es-ES')}</td>
                <td class="pe-4 py-3 text-center">
                    <button class="btn btn-sm text-dark d-inline-flex align-items-center gap-1 hover-bg-light fw-medium" onclick="abrirModalEditarBoleto(${boleto.id_tiquete})">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                    <button class="btn btn-sm text-orange d-inline-flex align-items-center gap-1 hover-bg-light fw-medium ms-2" onclick="mejorarClaseBoleto(${boleto.id_tiquete})">
                        <i class="bi bi-arrow-up-circle"></i> Mejorar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando los boletos:", error);
    }
}

// Lógica para abrir modal de Edición
window.abrirModalEditarBoleto = function(id_tiquete) {
    const boleto = listaBoletosGlobal.find(b => b.id_tiquete === id_tiquete);
    if (!boleto) return;

    const idFormateado = 'TKT' + String(boleto.id_tiquete).padStart(3, '0');

    document.getElementById('modalBoletoTitle').textContent = `Editar Boleto - ${idFormateado}`;
    document.getElementById('edit-bol-id').value = boleto.id_tiquete;
    document.getElementById('edit-bol-nombre').value = boleto.nombre_pasajero;
    document.getElementById('edit-bol-asiento').value = boleto.num_asiento;
    document.getElementById('edit-bol-clase').value = boleto.clase;
    document.getElementById('edit-bol-precio').value = parseFloat(boleto.precio_final);

    const modal = new bootstrap.Modal(document.getElementById('modalEditarBoleto'));
    modal.show();
};

// Guardar cambios desde el modal
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarnos de que el botón exista antes de asignarle el evento
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-boleto') {
            const id = document.getElementById('edit-bol-id').value;
            const datosActualizados = {
                clase: document.getElementById('edit-bol-clase').value,
                num_asiento: document.getElementById('edit-bol-asiento').value,
                precio_final: document.getElementById('edit-bol-precio').value
            };

            try {
                const response = await fetch(`http://localhost:3000/api/boletos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosActualizados)
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalEditarBoleto')).hide();
                    cargarBoletosDesdeBD();
                }
            } catch (error) {
                console.error("Error guardando boleto:", error);
            }
        }
    });
});

// Acción rápida: Mejorar a Business
window.mejorarClaseBoleto = async function(id_tiquete) {
    const boleto = listaBoletosGlobal.find(b => b.id_tiquete === id_tiquete);
    if (boleto.clase === 'Business' || boleto.clase === 'Primera Clase') {
        alert("Este boleto ya cuenta con una clase premium.");
        return;
    }

    const confirmacion = confirm(`¿Deseas mejorar el asiento de ${boleto.nombre_pasajero} a clase Business? Se aplicará un cargo adicional de $200.`);
    
    if (confirmacion) {
        const nuevoPrecio = parseFloat(boleto.precio_final) + 200.00;
        try {
            const response = await fetch(`http://localhost:3000/api/boletos/${id_tiquete}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clase: 'Business',
                    num_asiento: boleto.num_asiento, // Mantiene el asiento o lo cambias luego
                    precio_final: nuevoPrecio
                })
            });

            if (response.ok) {
                cargarBoletosDesdeBD();
            }
        } catch (error) {
            console.error("Error mejorando boleto:", error);
        }
    }
};

// ==============================================================
// MÓDULO DE PAQUETES TURÍSTICOS
// ==============================================================

let listaPaquetesGlobal = [];

async function cargarPaquetesDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/paquetes');
        const paquetes = await respuesta.json();
        listaPaquetesGlobal = paquetes;

        const contenedor = document.getElementById('contenedor-paquetes');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        paquetes.forEach(paquete => {
            const esActivo = paquete.estado === 'Activo';
            const claseBadge = esActivo ? 'badge-activo' : 'badge-inactivo';
            const iconoPower = esActivo ? 'bi-power text-danger' : 'bi-check-circle text-success';
            const tituloPower = esActivo ? 'Desactivar' : 'Activar';

            // Tarjeta HTML
            const tarjeta = document.createElement('div');
            tarjeta.className = 'col-12 col-md-6 col-lg-4 d-flex'; 
            
            tarjeta.innerHTML = `
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden card-paquete w-100 p-0 bg-white">
                    
                    <div class="bg-gradient-orange p-4 text-center text-white d-flex flex-column justify-content-center w-100 m-0" style="min-height: 160px;">
                        <h3 class="fw-bold mb-1 text-wrap" style="word-break: break-word;">${paquete.nombre}</h3>
                        <p class="mb-0 small opacity-75">${paquete.sector_destino}</p>
                    </div>
                    
                    <div class="card-body p-4 d-flex flex-column w-100" style="text-align: left !important;">
                        <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <h6 class="fw-bold text-dark mb-0 text-start">${paquete.nombre}</h6>
                            <span class="badge ${claseBadge} small text-nowrap">${paquete.estado}</span>
                        </div>
                        <p class="text-muted small mb-3 text-start">${paquete.duracion || 'N/A'}</p>
                        
                        <p class="text-muted small mb-4 text-start" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${paquete.descripcion}
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top w-100">
                            <div class="text-start">
                                <span class="text-muted small d-block" style="line-height: 1;">Precio</span>
                                <span class="fw-bold text-orange fs-5">$${parseFloat(paquete.precio).toLocaleString('es-ES')}</span>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn-icon-action" title="Editar" onclick="abrirModalEditarPaquete(${paquete.id_paquete})">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button class="btn-icon-action" title="${tituloPower}" onclick="toggleEstadoPaquete(${paquete.id_paquete}, '${paquete.estado}')">
                                    <i class="bi ${iconoPower}"></i>
                                </button>
                                <button class="btn-icon-action" title="Eliminar" onclick="eliminarPaquete(${paquete.id_paquete})">
                                    <i class="bi bi-trash text-danger"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error cargando paquetes:", error);
    }
}

// 1. Abrir Modal para CREAR
window.abrirModalCrearPaquete = function() {
    document.getElementById('form-paquete').reset();
    document.getElementById('paq-id').value = ''; // ID vacío significa "Crear"
    
    document.getElementById('modalPaqueteTitle').textContent = 'Crear Nuevo Paquete Turístico';
    document.getElementById('btn-guardar-paquete').textContent = 'Crear Paquete';
    
    const modal = new bootstrap.Modal(document.getElementById('modalFormPaquete'));
    modal.show();
};

// 2. Abrir Modal para EDITAR
window.abrirModalEditarPaquete = function(id_paquete) {
    const pq = listaPaquetesGlobal.find(p => p.id_paquete === id_paquete);
    if (!pq) return;

    document.getElementById('paq-id').value = pq.id_paquete;
    document.getElementById('paq-nombre').value = pq.nombre;
    document.getElementById('paq-destino').value = pq.sector_destino;
    document.getElementById('paq-duracion').value = pq.duracion;
    document.getElementById('paq-desc').value = pq.descripcion;
    document.getElementById('paq-precio').value = parseFloat(pq.precio);
    document.getElementById('paq-estado').value = pq.estado;

    document.getElementById('modalPaqueteTitle').textContent = 'Editar Paquete Turístico';
    document.getElementById('btn-guardar-paquete').textContent = 'Guardar Cambios';

    const modal = new bootstrap.Modal(document.getElementById('modalFormPaquete'));
    modal.show();
};

// 3. Guardar (Decide si hace POST o PUT dependiendo de si hay ID)
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-paquete') {
            const id = document.getElementById('paq-id').value;
            
            const datosPaquete = {
                nombre: document.getElementById('paq-nombre').value,
                sector_destino: document.getElementById('paq-destino').value,
                duracion: document.getElementById('paq-duracion').value,
                descripcion: document.getElementById('paq-desc').value,
                precio: document.getElementById('paq-precio').value,
                estado: document.getElementById('paq-estado').value
            };

            const url = id ? `http://localhost:3000/api/paquetes/${id}` : 'http://localhost:3000/api/paquetes';
            const method = id ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosPaquete)
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalFormPaquete')).hide();
                    cargarPaquetesDesdeBD(); // Recarga las tarjetas
                }
            } catch (error) {
                console.error("Error guardando paquete:", error);
            }
        }
    });
});

// 4. Activar/Desactivar rápido con el botón de "Power"
window.toggleEstadoPaquete = async function(id_paquete, estadoActual) {
    const pq = listaPaquetesGlobal.find(p => p.id_paquete === id_paquete);
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    
    // Mantenemos los demás datos intactos, solo cambiamos el estado
    const datosActualizados = { ...pq, estado: nuevoEstado };

    try {
        const response = await fetch(`http://localhost:3000/api/paquetes/${id_paquete}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });
        if (response.ok) cargarPaquetesDesdeBD();
    } catch (error) { console.error(error); }
};

// 5. Eliminar permanentemente (Icono de Basura)
window.eliminarPaquete = async function(id_paquete) {
    if (confirm('¿Estás seguro de que deseas eliminar este paquete turístico? Esta acción borrará el paquete de la base de datos.')) {
        try {
            const response = await fetch(`http://localhost:3000/api/paquetes/${id_paquete}`, { method: 'DELETE' });
            if (response.ok) cargarPaquetesDesdeBD();
        } catch (error) { console.error(error); }
    }
};

// ==============================================================
// MÓDULO DE CLIENTES
// ==============================================================

let listaClientesGlobal = [];

async function cargarClientesDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientes');
        const clientes = await respuesta.json();
        
        listaClientesGlobal = clientes;

        const tbody = document.getElementById('tbody-clientes');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        clientes.forEach(cliente => {
            const idFormateado = 'CLI' + String(cliente.id_cliente).padStart(3, '0');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 py-3 fw-bold text-dark">${idFormateado}</td>
                <td class="py-3 text-dark">${cliente.nombre_completo}</td>
                <td class="py-3 text-muted">${cliente.correo}</td>
                <td class="py-3 text-muted">${cliente.telefono || 'N/A'}</td>
                <td class="py-3 text-muted">${cliente.ciudad || 'N/A'}</td>
                <td class="py-3 text-center">
                    <span class="badge-contador-reservas">${cliente.total_reservas}</span>
                </td>
                <td class="pe-4 py-3 text-center">
                    <button class="btn btn-sm text-dark d-inline-flex align-items-center gap-1 hover-bg-light fw-medium" onclick="abrirModalPerfilCliente(${cliente.id_cliente})">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando los clientes:", error);
    }
}

window.abrirModalPerfilCliente = function(id_cliente) {
    const cliente = listaClientesGlobal.find(c => c.id_cliente === id_cliente);
    if (!cliente) return;

    const idFormateado = 'CLI' + String(cliente.id_cliente).padStart(3, '0');
    
    // Formatear fecha (Ej. 14/1/2026)
    let fechaTexto = 'N/A';
    if (cliente.fecha_registro) {
        const fechaObj = new Date(cliente.fecha_registro);
        fechaTexto = fechaObj.toLocaleDateString('es-ES');
    }

    // Llenar Modal
    document.getElementById('modalClienteTitle').textContent = `Perfil del Cliente - ${cliente.nombre_completo}`;
    document.getElementById('perfil-nombre').textContent = cliente.nombre_completo;
    document.getElementById('perfil-id').textContent = `ID de Cliente: ${idFormateado}`;
    document.getElementById('perfil-reservas').textContent = cliente.total_reservas;
    
    document.getElementById('perfil-email').textContent = cliente.correo;
    document.getElementById('perfil-telefono').textContent = cliente.telefono || 'N/A';
    document.getElementById('perfil-ciudad').textContent = cliente.ciudad || 'N/A';
    document.getElementById('perfil-fecha').textContent = fechaTexto;
    
    // 1. Abrir modal de Edición
    document.getElementById('btn-abrir-editar-cliente').onclick = () => {
        // Ocultamos el perfil visualmente
        bootstrap.Modal.getInstance(document.getElementById('modalPerfilCliente')).hide();
        
        // Llenamos el form
        document.getElementById('edit-cli-id').value = cliente.id_cliente;
        document.getElementById('edit-cli-nombres').value = cliente.nombres;
        document.getElementById('edit-cli-apellidos').value = cliente.apellidos;
        document.getElementById('edit-cli-email').value = cliente.correo;
        document.getElementById('edit-cli-telefono').value = cliente.telefono || '';
        document.getElementById('edit-cli-ciudad').value = cliente.ciudad || '';
        
        // Abrimos el nuevo modal
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
        modalEdit.show();
    };

    // 2. Ver Historial
    document.getElementById('btn-ver-historial-cliente').onclick = async () => {
        bootstrap.Modal.getInstance(document.getElementById('modalPerfilCliente')).hide();
        
        document.getElementById('titulo-historial-cliente').textContent = `Historial de Reservas - ${cliente.nombre_completo}`;
        const tbody = document.getElementById('tbody-historial-cliente');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Cargando historial...</td></tr>';
        
        const modalHist = new bootstrap.Modal(document.getElementById('modalHistorialReservas'));
        modalHist.show();

        try {
            const response = await fetch(`http://localhost:3000/api/clientes/${cliente.id_cliente}/reservas`);
            const reservas = await response.json();
            
            tbody.innerHTML = '';
            
            if(reservas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Este cliente no ha realizado reservas aún.</td></tr>';
                return;
            }

            reservas.forEach(r => {
                const idRes = 'RES' + String(r.id_reserva).padStart(3, '0');
                const fechaObj = new Date(r.fecha_hora_reserva);
                const badgeClass = r.estado === 'Cancelado' ? 'badge-cancelado' : (r.estado === 'Pendiente' ? 'badge-pendiente' : 'badge-confirmado');
                
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4 py-3 fw-bold text-dark">${idRes}</td>
                        <td class="py-3 text-muted">${fechaObj.toLocaleDateString('es-ES')}</td>
                        <td class="py-3 text-dark">${r.cod_vuelo} - ${r.origen} a ${r.destino}</td>
                        <td class="py-3 fw-medium text-dark">$${parseFloat(r.valor_total).toLocaleString('es-ES')}</td>
                        <td class="py-3 pe-4"><span class="badge ${badgeClass}">${r.estado}</span></td>
                    </tr>
                `;
            });
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
        }
    };
    const modal = new bootstrap.Modal(document.getElementById('modalPerfilCliente'));
    modal.show();
};

// Guardar edición del cliente
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-cliente') {
            const id = document.getElementById('edit-cli-id').value;
            const datosActualizados = {
                nombres: document.getElementById('edit-cli-nombres').value,
                apellidos: document.getElementById('edit-cli-apellidos').value,
                correo: document.getElementById('edit-cli-email').value,
                telefono: document.getElementById('edit-cli-telefono').value,
                ciudad: document.getElementById('edit-cli-ciudad').value
            };

            try {
                const response = await fetch(`http://localhost:3000/api/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosActualizados)
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
                    cargarClientesDesdeBD(); // Refresca la tabla
                }
            } catch (error) {
                console.error("Error guardando cliente:", error);
            }
        }
    });
});
// ==============================================================
// MÓDULO DE USUARIOS Y ROLES
// ==============================================================

let listaUsuariosGlobal = [];

async function cargarUsuariosDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/usuarios');
        const usuarios = await respuesta.json();
        listaUsuariosGlobal = usuarios;

        const tbody = document.getElementById('tbody-usuarios');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Contadores para las tarjetas superiores
        let cAdmins = 0, cAgentes = 0, cClientes = 0;

        usuarios.forEach(user => {
            // Conteo
            if (user.tipo_rol === 'Administrador') cAdmins++;
            else if (user.tipo_rol === 'Agente') cAgentes++;
            else if (user.tipo_rol === 'Cliente') cClientes++;

            // Configuración visual
            const numId = `#${user.id_usuario}`;
            const clienteAsc = user.id_cliente ? `<a href="#" class="text-orange-link">CLI${String(user.id_cliente).padStart(3, '0')}</a>` : '<span class="text-muted">—</span>';
            const estadoBadge = user.estado === 'Activo' ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>';
            const btnEstadoTxt = user.estado === 'Activo' ? 'Desactivar' : 'Activar';
            
            let rolHtml = '';
            let iconHtml = '';
            
            // Añadimos 'text-nowrap' directamente al badge para blindarlo
            if (user.tipo_rol === 'Administrador') {
                rolHtml = `<span class="badge-rol-admin text-nowrap"><i class="bi bi-shield me-1"></i> Administrador</span>`;
                iconHtml = `<div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;"><i class="bi bi-person-gear"></i></div>`;
            } else if (user.tipo_rol === 'Agente') {
                rolHtml = `<span class="badge-rol-agente text-nowrap"><i class="bi bi-person-gear me-1"></i> Agente</span>`;
                iconHtml = `<div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;"><i class="bi bi-person-gear"></i></div>`;
            } else {
                rolHtml = `<span class="badge-rol-cliente text-nowrap"><i class="bi bi-person me-1"></i> Cliente</span>`;
                iconHtml = `<div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;"><i class="bi bi-person"></i></div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 py-3 fw-bold text-dark align-middle">${numId}</td>
                <td class="py-3 text-dark align-middle">
                    <div class="d-flex align-items-center gap-2 text-nowrap">
                        ${iconHtml}
                        <span class="fw-medium">${user.username}</span>
                    </div>
                </td>
                <td class="py-3 text-muted align-middle">${user.email || '—'}</td>
                <td class="py-3 align-middle">${rolHtml}</td>
                <td class="py-3 text-center align-middle">${clienteAsc}</td>
                <td class="py-3 text-center align-middle">${estadoBadge}</td>
                <td class="pe-4 py-3 text-end align-middle text-nowrap">
                    <button class="btn-texto-accion me-3" onclick="abrirModalEditarUsuario(${user.id_usuario})">Editar</button>
                    <button class="btn-texto-desactivar" onclick="cambiarEstadoUsuario(${user.id_usuario}, '${user.estado}')">${btnEstadoTxt}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Actualizar contadores en la vista
        document.getElementById('count-admins').textContent = cAdmins;
        document.getElementById('count-agentes').textContent = cAgentes;
        document.getElementById('count-clientes').textContent = cClientes;

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

// 1. Abrir modal para CREAR (Limpia todo)
window.abrirModalUsuario = function() {
    document.getElementById('form-usuario').reset();
    document.getElementById('user-pass').parentElement.style.display = 'block'; // Mostrar campo contraseña
    
    const modalTitle = document.querySelector('#modalCrearUsuario .modal-header h5');
    if (modalTitle) modalTitle.textContent = 'Crear Nuevo Usuario';
    
    const btnGuardar = document.getElementById('btn-guardar-usuario');
    btnGuardar.textContent = 'Crear Usuario';
    delete btnGuardar.dataset.editId; // Asegurar que no quede ID de edición viejo
    
    new bootstrap.Modal(document.getElementById('modalCrearUsuario')).show();
};

// 2. Abrir modal para EDITAR (Llena campos y adapta diseño)
window.abrirModalEditarUsuario = function(id_usuario) {
    const user = listaUsuariosGlobal.find(u => u.id_usuario === id_usuario);
    if (!user) return;

    // Llenar formulario
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-rol').value = user.tipo_rol;
    document.getElementById('user-cliente-id').value = user.id_cliente || '';
    
    // Ocultar campo de contraseña
    document.getElementById('user-pass').parentElement.style.display = 'none';

    // Adaptar textos del modal
    const modalTitle = document.querySelector('#modalCrearUsuario .modal-header h5');
    if (modalTitle) modalTitle.textContent = 'Editar Usuario';
    
    const btnGuardar = document.getElementById('btn-guardar-usuario');
    btnGuardar.textContent = 'Guardar Cambios';
    btnGuardar.dataset.editId = id_usuario; // Guardamos el ID temporalmente para saber a quién editamos

    new bootstrap.Modal(document.getElementById('modalCrearUsuario')).show();
};

// 3. Cambiar estado (Activar/Desactivar)
window.cambiarEstadoUsuario = async function(id_usuario, estadoActual) {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    if(confirm(`¿Deseas ${nuevoEstado === 'Inactivo' ? 'desactivar' : 'activar'} este usuario?`)) {
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${id_usuario}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (response.ok) cargarUsuariosDesdeBD();
        } catch (error) { console.error(error); }
    }
};

// 4. Guardar (Detecta automáticamente si es Crear o Editar)
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-usuario') {
            
            const editId = e.target.dataset.editId; // ¿Hay un ID guardado en el botón?
            
            const datosUsuario = {
                username: document.getElementById('user-username').value,
                email: document.getElementById('user-email').value,
                tipo_rol: document.getElementById('user-rol').value,
                id_cliente: document.getElementById('user-cliente-id').value || null
            };

            let url = 'http://localhost:3000/api/usuarios';
            let method = 'POST';

            // Si hay editId, hacemos UPDATE. Si no, hacemos INSERT y agregamos contraseña.
            if (editId) {
                url = `http://localhost:3000/api/usuarios/${editId}`;
                method = 'PUT';
            } else {
                datosUsuario.contrasena = document.getElementById('user-pass').value;
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosUsuario)
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalCrearUsuario')).hide();
                    delete e.target.dataset.editId; // Limpiamos el ID del botón
                    cargarUsuariosDesdeBD();
                } else {
                    alert("Error: Verifica que los datos sean correctos y el username no esté repetido.");
                }
            } catch (error) {
                console.error("Error procesando usuario:", error);
            }
        }
    });
});