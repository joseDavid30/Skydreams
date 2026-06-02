// ==============================================================
// 1. CARGA DINÁMICA DE VISTAS (Navegación)
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.nav-link');
    const mainContent = document.getElementById('main-content');

    links.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            
            links.forEach(l => l.classList.remove('active-menu'));
            link.classList.add('active-menu');

            const page = link.getAttribute('data-page');
            const title = link.querySelector('span').textContent;

            await cargarVista(page, title);
        });
    });

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

                if (page === 'dashboard') {
                    cargarDashboardDesdeBD(); 
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
                } else if (page === 'ubicaciones') { 
                    cargarUbicacionesDesdeBD(); 
                }else if (page === 'reportes') {
                    cargarReportesDesdeBD();
                }
            } else {
                mostrarConstruccion(title);
            }
        } catch (error) {
            console.error("Error cargando la vista:", error);
            mostrarConstruccion(title);
        }
    }

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
                <h4 class="mb-2">Módulo en construcción</h4>
                <p class="text-muted">El archivo vistas_admin/${title.toLowerCase()}.html aún no existe.</p>
            </div>
        `;
    }
    
// (Reemplaza la función initCharts y su llamado en cargarVista por esto)
    async function cargarDashboardDesdeBD() {
        try {
            const res = await fetch('http://localhost:3000/api/dashboard/stats');
            const data = await res.json();

            // 1. Llenar KPIs
            document.getElementById('kpi-vuelos-hoy').textContent = data.kpis.vuelosHoy;
            document.getElementById('kpi-reservas-activas').textContent = data.kpis.reservasActivas;
            document.getElementById('kpi-ingresos-hoy').textContent = '$' + data.kpis.ingresosHoy.toLocaleString('es-ES');
            document.getElementById('kpi-boletos').textContent = data.kpis.boletosVendidos;
            document.getElementById('kpi-asientos').textContent = data.kpis.asientosDisponibles;
            document.getElementById('kpi-paquetes').textContent = data.kpis.paquetesActivos;

            // 2. Llenar Top Destinos
            const contenedorDestinos = document.getElementById('lista-destinos-top');
            contenedorDestinos.innerHTML = '';
            if(data.destinosTop.length === 0) contenedorDestinos.innerHTML = '<p class="text-muted">No hay datos suficientes.</p>';
            
            // Calculamos el máximo para sacar el porcentaje de la barra de progreso
            const maxReservas = data.destinosTop.length > 0 ? parseInt(data.destinosTop[0].total_reservas) : 1;

            data.destinosTop.forEach(dest => {
                const porcentaje = (parseInt(dest.total_reservas) / maxReservas) * 100;
                contenedorDestinos.innerHTML += `
                    <div class="destino-item d-flex align-items-center gap-3">
                        <span class="destino-nombre">${dest.destino}</span>
                        <div class="progress flex-grow-1">
                            <div class="progress-bar" role="progressbar" style="width: ${porcentaje}%"></div>
                        </div>
                        <span class="destino-valor">${dest.total_reservas}</span>
                    </div>
                `;
            });

            // 3. Llenar Actividad Reciente
            const contenedorActividad = document.getElementById('lista-actividad-reciente');
            contenedorActividad.innerHTML = '';
            if(data.actividadReciente.length === 0) contenedorActividad.innerHTML = '<p class="text-muted">No hay actividad reciente.</p>';

            data.actividadReciente.forEach(act => {
                const fecha = new Date(act.fecha_cambio);
                const idRes = 'RES' + String(act.id_reserva).padStart(3, '0');
                
                let iconClass = 'icon-info';
                let iconBi = 'bi-arrow-repeat';
                let mensaje = `Cambió a estado: ${act.nombre_estado}`;

                if (act.nombre_estado === 'Reservada' || act.nombre_estado === 'Confirmada') {
                    iconClass = 'icon-positive'; iconBi = 'bi-calendar-check';
                    mensaje = `Nueva reserva registrada hacia ${act.ciudad_destino}`;
                } else if (act.nombre_estado === 'Cancelada' || act.nombre_estado === 'Expirada') {
                    iconClass = 'icon-negative'; iconBi = 'bi-calendar-x';
                    mensaje = `Reserva cancelada hacia ${act.ciudad_destino}`;
                }

                contenedorActividad.innerHTML += `
                    <div class="actividad-item d-flex gap-3">
                        <div class="actividad-icon ${iconClass}">
                            <i class="bi ${iconBi}"></i>
                        </div>
                        <div class="actividad-texto">
                            <h6 class="mb-1 fw-bold">${act.nombre_estado}</h6>
                            <p class="mb-1">${idRes} - ${act.nombres} ${act.apellidos} | Vuelo ${act.cod_vuelo}</p>
                            <span class="tiempo">${fecha.toLocaleString('es-ES')}</span>
                        </div>
                    </div>
                `;
            });

            // 4. Inicializar Chart.js con datos reales
            const etiquetasMesesRes = data.graficos.reservas.map(g => g.mes);
            const datosRes = data.graficos.reservas.map(g => g.total);
            
            const resCanvas = document.getElementById('reservasChart');
            if(resCanvas) {
                // Destruir gráfico anterior si existe para evitar superposiciones
                let chartExistente = Chart.getChart(resCanvas);
                if (chartExistente) chartExistente.destroy();

                new Chart(resCanvas, {
                    type: 'bar',
                    data: {
                        labels: etiquetasMesesRes.length > 0 ? etiquetasMesesRes : ['Sin datos'],
                        datasets: [{ data: datosRes.length > 0 ? datosRes : [0], backgroundColor: '#de7b0aea', borderRadius: 8, barThickness: 25 }]
                    },
                    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
                });
            }

            const etiquetasMesesIng = data.graficos.ingresos.map(g => g.mes);
            const datosIng = data.graficos.ingresos.map(g => g.total);

            const ingCanvas = document.getElementById('ingresosChart');
            if(ingCanvas) {
                let chartExistente2 = Chart.getChart(ingCanvas);
                if (chartExistente2) chartExistente2.destroy();

                new Chart(ingCanvas, {
                    type: 'line',
                    data: {
                        labels: etiquetasMesesIng.length > 0 ? etiquetasMesesIng : ['Sin datos'],
                        datasets: [{ data: datosIng.length > 0 ? datosIng : [0], borderColor: '#de7b0aea', backgroundColor: 'rgba(222, 123, 10, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', borderWidth: 3 }]
                    },
                    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
                });
            }

        } catch (error) {
            console.error("Error al cargar el dashboard:", error);
        }
    }

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
        if (!tbody) return; 
        
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
window.llenarDatosDePrueba = function() {
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
};

// ==============================================================
// MÓDULO DE RESERVAS
// ==============================================================

let listaReservasGlobal = [];

async function cargarReservasDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/reservas');
        const reservas = await respuesta.json();
        
        listaReservasGlobal = reservas; 

        const tbody = document.getElementById('tbody-reservas');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if(reservas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay reservas registradas en la base de datos.</td></tr>`;
            return;
        }

        reservas.forEach(reserva => {
            const idFormateado = 'RES' + String(reserva.id_reserva).padStart(3, '0');
            const vueloFormat = `${reserva.cod_vuelo} - ${reserva.origen} a ${reserva.destino}`;
            
            const fechaObj = new Date(reserva.fecha_hora_reserva);
            const fechaCorto = fechaObj.toLocaleDateString('es-ES');
            
            let claseBadge = reserva.estado === 'Cancelada' ? 'badge-cancelado' : 'badge-confirmado';

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
    const reserva = listaReservasGlobal.find(r => r.id_reserva === id_reserva);
    if (!reserva) return;

    const idFormateado = 'RES' + String(reserva.id_reserva).padStart(3, '0');
    const vueloFormat = `${reserva.cod_vuelo} - ${reserva.origen} a ${reserva.destino}`;
    
    const fechaObj = new Date(reserva.fecha_hora_reserva);
    const fechaCorto = fechaObj.toLocaleDateString('es-ES');
    const fechaLargo = fechaObj.toLocaleString('es-ES');

    document.getElementById('modalReservaTitle').textContent = `Detalles de Reserva - ${idFormateado}`;
    document.getElementById('det-vuelo').textContent = vueloFormat;
    document.getElementById('det-fecha').textContent = fechaCorto;
    document.getElementById('det-valor').textContent = '$' + parseFloat(reserva.valor_total).toLocaleString('es-ES');
    document.getElementById('det-boletos').textContent = reserva.numero_boletos;
    document.getElementById('det-paquete').textContent = reserva.paquete_turistico;
    
    const badgeEstado = document.getElementById('det-estado');
    badgeEstado.textContent = reserva.estado;
    badgeEstado.className = 'badge ' + (reserva.estado === 'Cancelada' ? 'badge-cancelado' : 'badge-confirmado');

    document.getElementById('det-cli-nombre').textContent = reserva.cliente_nombre;
    document.getElementById('det-cli-email').textContent = reserva.cliente_email;
    document.getElementById('det-cli-tel').textContent = reserva.cliente_telefono || 'N/A';

    document.getElementById('hist-fecha-creacion').textContent = fechaLargo;
    document.getElementById('hist-estado-actual').textContent = reserva.estado;

    const btnEditar = document.getElementById('btn-editar-reserva');
    btnEditar.onclick = () => {
        document.getElementById('select-nuevo-estado').value = reserva.estado;
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditarEstado'));
        modalEdit.show();
        
        document.getElementById('btn-guardar-estado').onclick = async () => {
            const nuevoEstado = document.getElementById('select-nuevo-estado').value;
            try {
                const response = await fetch(`http://localhost:3000/api/reservas/${reserva.id_reserva}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
                
                if (response.ok) {
                    modalEdit.hide();
                    bootstrap.Modal.getInstance(document.getElementById('modalDetalleReserva')).hide(); 
                    cargarReservasDesdeBD();
                    alert("¡Estado actualizado con éxito y guardado en el historial!");
                }
            } catch (error) {
                console.error("Error editando:", error);
                alert("Error al actualizar la reserva.");
            }
        };
    };

    const btnBorrar = document.getElementById('btn-borrar-reserva');
    btnBorrar.onclick = async () => {
        const confirmacion = confirm(`¿Estás 100% seguro de que deseas ELIMINAR la reserva ${idFormateado}?`);
        if (confirmacion) {
            try {
                const response = await fetch(`http://localhost:3000/api/reservas/${reserva.id_reserva}`, { method: 'DELETE' });
                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalDetalleReserva')).hide();
                    cargarReservasDesdeBD(); 
                }
            } catch (error) { console.error("Error borrando:", error); }
        }
    };
    
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
    } catch (error) { console.error("Error cargando los boletos:", error); }
}

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

document.addEventListener('DOMContentLoaded', () => {
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
            } catch (error) { console.error("Error guardando boleto:", error); }
        }
    });
});

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
                body: JSON.stringify({ clase: 'Business', num_asiento: boleto.num_asiento, precio_final: nuevoPrecio })
            });

            if (response.ok) { cargarBoletosDesdeBD(); }
        } catch (error) { console.error("Error mejorando boleto:", error); }
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
    } catch (error) { console.error("Error cargando paquetes:", error); }
}

window.abrirModalCrearPaquete = function() {
    document.getElementById('form-paquete').reset();
    document.getElementById('paq-id').value = ''; 
    
    document.getElementById('modalPaqueteTitle').textContent = 'Crear Nuevo Paquete Turístico';
    document.getElementById('btn-guardar-paquete').textContent = 'Crear Paquete';
    
    const modal = new bootstrap.Modal(document.getElementById('modalFormPaquete'));
    modal.show();
};

window.abrirModalEditarPaquete = function(id_paquete) {
    const pq = listaPaquetesGlobal.find(p => p.id_paquete === id_paquete);
    if (!pq) return;

    document.getElementById('paq-id').value = pq.id_paquete;
    document.getElementById('paq-nombre').value = pq.nombre;
    document.getElementById('paq-destino').value = pq.sector_destino;
    document.getElementById('paq-desc').value = pq.descripcion;
    document.getElementById('paq-precio').value = parseFloat(pq.precio);
    document.getElementById('paq-estado').value = pq.estado;

    document.getElementById('modalPaqueteTitle').textContent = 'Editar Paquete Turístico';
    document.getElementById('btn-guardar-paquete').textContent = 'Guardar Cambios';

    const modal = new bootstrap.Modal(document.getElementById('modalFormPaquete'));
    modal.show();
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-paquete') {
            const id = document.getElementById('paq-id').value;
            
            const datosPaquete = {
                nombre: document.getElementById('paq-nombre').value,
                sector_destino: document.getElementById('paq-destino').value,
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
                    cargarPaquetesDesdeBD(); 
                }
            } catch (error) { console.error("Error guardando paquete:", error); }
        }
    });
});

window.toggleEstadoPaquete = async function(id_paquete, estadoActual) {
    const pq = listaPaquetesGlobal.find(p => p.id_paquete === id_paquete);
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    
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

window.eliminarPaquete = async function(id_paquete) {
    if (confirm('¿Estás seguro de que deseas eliminar este paquete turístico?')) {
        try {
            const response = await fetch(`http://localhost:3000/api/paquetes/${id_paquete}`, { method: 'DELETE' });
            if (response.ok) cargarPaquetesDesdeBD();
        } catch (error) { console.error(error); }
    }
};
// ==============================================================
// MÓDULO DE CLIENTES (ACTUALIZADO)
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
                <td class="py-3 text-dark">${cliente.identificacion || 'N/A'}</td>
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

        // ¡AQUÍ ESTÁ LA CORRECCIÓN! 
        // Llamamos a las ciudades apenas termina de pintar la tabla de clientes
        await cargarCiudadesParaSelect();

    } catch (error) { console.error("Error cargando los clientes:", error); }
}

async function cargarCiudadesParaSelect() {
    try {
        const res = await fetch('http://localhost:3000/api/ubicaciones');
        const data = await res.json();
        
        const selectCiudad = document.getElementById('edit-cli-id-ciudad');
        if (!selectCiudad) return;
        
        selectCiudad.innerHTML = '<option value="">Seleccione una ciudad...</option>';
        
        data.ciudades.forEach(c => {
            selectCiudad.innerHTML += `<option value="${c.id_ciudad}">${c.nombre}</option>`;
        });
    } catch (error) {
        console.error("Error cargando las ciudades para el select:", error);
    }
}

window.abrirModalPerfilCliente = function(id_cliente) {
    const cliente = listaClientesGlobal.find(c => c.id_cliente === id_cliente);
    if (!cliente) return;

    const idFormateado = 'CLI' + String(cliente.id_cliente).padStart(3, '0');
    
    let fechaTexto = 'N/A';
    if (cliente.fecha_registro) {
        const fechaObj = new Date(cliente.fecha_registro);
        fechaTexto = fechaObj.toLocaleDateString('es-ES');
    }

    document.getElementById('modalClienteTitle').textContent = `Perfil del Cliente - ${cliente.nombre_completo}`;
    document.getElementById('perfil-nombre').textContent = cliente.nombre_completo;
    document.getElementById('perfil-id').textContent = `ID de Cliente: ${idFormateado}`;
    document.getElementById('perfil-reservas').textContent = cliente.total_reservas;
    
    document.getElementById('perfil-identificacion').textContent = cliente.identificacion || 'N/A';
    document.getElementById('perfil-email').textContent = cliente.correo;
    document.getElementById('perfil-telefono').textContent = cliente.telefono || 'N/A';
    document.getElementById('perfil-telefono-alt').textContent = cliente.telefono_alterno || 'N/A';
    document.getElementById('perfil-ciudad').textContent = cliente.ciudad || 'N/A';
    document.getElementById('perfil-direccion').textContent = cliente.direccion || 'N/A';
    document.getElementById('perfil-fecha').textContent = fechaTexto;
    
    // Abrir modal de Edición
    document.getElementById('btn-abrir-editar-cliente').onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('modalPerfilCliente')).hide();
        
        document.getElementById('edit-cli-id').value = cliente.id_cliente;
        document.getElementById('edit-cli-identificacion').value = cliente.identificacion || '';
        document.getElementById('edit-cli-nombres').value = cliente.nombres;
        document.getElementById('edit-cli-apellidos').value = cliente.apellidos;
        document.getElementById('edit-cli-email').value = cliente.correo;
        document.getElementById('edit-cli-telefono').value = cliente.telefono || '';
        document.getElementById('edit-cli-telefono-alt').value = cliente.telefono_alterno || '';
        document.getElementById('edit-cli-direccion').value = cliente.direccion || '';
        
        // Magia: autoseleccionar la ciudad que el cliente ya tenía
        const inputCiudad = document.getElementById('edit-cli-id-ciudad');
        if(inputCiudad) inputCiudad.value = cliente.id_ciudad || '';
        
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
        modalEdit.show();
    };

    // Ver Historial
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
                const badgeClass = r.estado === 'Cancelada' ? 'badge-cancelado' : (r.estado === 'Reservada' ? 'badge-pendiente' : 'badge-confirmado');
                
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
            // (Eliminamos la llamada errónea de cargarCiudadesParaSelect() que estaba aquí)
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
        }
    };
    
    const modal = new bootstrap.Modal(document.getElementById('modalPerfilCliente'));
    modal.show();
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-cliente') {
            const id = document.getElementById('edit-cli-id').value;
            const inputCiudad = document.getElementById('edit-cli-id-ciudad');
            const inputDireccion = document.getElementById('edit-cli-direccion');

            const datosActualizados = {
                identificacion: document.getElementById('edit-cli-identificacion').value,
                nombres: document.getElementById('edit-cli-nombres').value,
                apellidos: document.getElementById('edit-cli-apellidos').value,
                correo: document.getElementById('edit-cli-email').value,
                telefono_principal: document.getElementById('edit-cli-telefono').value,
                telefono_alterno: document.getElementById('edit-cli-telefono-alt').value,
                id_ciudad: inputCiudad && inputCiudad.value !== "" ? inputCiudad.value : null,
                direccion: inputDireccion ? inputDireccion.value : null
            };

            try {
                const response = await fetch(`http://localhost:3000/api/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosActualizados)
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
                    cargarClientesDesdeBD(); 
                }
            } catch (error) { console.error("Error guardando cliente:", error); }
        }
    });
});

// ==============================================================
// MÓDULO DE USUARIOS Y ROLES (ACTUALIZADO SIN TABLA ROLES)
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

        let cAdmins = 0, cAgentes = 0, cClientes = 0;

        usuarios.forEach(user => {
            if (user.tipo_rol === 'Súper Administrador') cAdmins++;
            else if (user.tipo_rol === 'Agente de Aerolínea') cAgentes++;
            else if (user.tipo_rol === 'Cliente') cClientes++;

            const numId = `#${user.id_usuario}`;
            const clienteAsc = user.id_cliente ? `<a href="#" class="text-orange-link">CLI${String(user.id_cliente).padStart(3, '0')}</a>` : '<span class="text-muted">—</span>';
            const estadoBadge = user.estado === 'Activo' ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>';
            const btnEstadoTxt = user.estado === 'Activo' ? 'Desactivar' : 'Activar';
            
            let rolHtml = '';
            let iconHtml = '';
            
            if (user.tipo_rol === 'Súper Administrador') {
                rolHtml = `<span class="badge-rol-admin text-nowrap"><i class="bi bi-shield me-1"></i> Administrador</span>`;
                iconHtml = `<div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 32px; height: 32px;"><i class="bi bi-shield-lock"></i></div>`;
            } else if (user.tipo_rol === 'Agente de Aerolínea') {
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

        document.getElementById('count-admins').textContent = cAdmins;
        document.getElementById('count-agentes').textContent = cAgentes;
        document.getElementById('count-clientes').textContent = cClientes;

    } catch (error) { console.error("Error cargando usuarios:", error); }
}

window.abrirModalUsuario = function() {
    document.getElementById('form-usuario').reset();
    document.getElementById('user-pass').parentElement.style.display = 'block'; 
    
    const modalTitle = document.querySelector('#modalCrearUsuario .modal-header h5');
    if (modalTitle) modalTitle.textContent = 'Crear Nuevo Usuario';
    
    const btnGuardar = document.getElementById('btn-guardar-usuario');
    btnGuardar.textContent = 'Crear Usuario';
    delete btnGuardar.dataset.editId; 
    
    new bootstrap.Modal(document.getElementById('modalCrearUsuario')).show();
};

window.abrirModalEditarUsuario = function(id_usuario) {
    const user = listaUsuariosGlobal.find(u => u.id_usuario === id_usuario);
    if (!user) return;

    document.getElementById('user-username').value = user.username;
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-rol').value = user.tipo_rol;
    document.getElementById('user-cliente-id').value = user.id_cliente || '';
    
    document.getElementById('user-pass').parentElement.style.display = 'none';

    const modalTitle = document.querySelector('#modalCrearUsuario .modal-header h5');
    if (modalTitle) modalTitle.textContent = 'Editar Usuario';
    
    const btnGuardar = document.getElementById('btn-guardar-usuario');
    btnGuardar.textContent = 'Guardar Cambios';
    btnGuardar.dataset.editId = id_usuario; 

    new bootstrap.Modal(document.getElementById('modalCrearUsuario')).show();
};

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

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-guardar-usuario') {
            const editId = e.target.dataset.editId; 
            
            const datosUsuario = {
                username: document.getElementById('user-username').value,
                email: document.getElementById('user-email').value,
                tipo_rol: document.getElementById('user-rol').value,
                id_cliente: document.getElementById('user-cliente-id').value || null
            };

            let url = 'http://localhost:3000/api/usuarios';
            let method = 'POST';

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
                    delete e.target.dataset.editId; 
                    cargarUsuariosDesdeBD();
                } else {
                    alert("Error: Verifica que los datos sean correctos y el username no esté repetido.");
                }
            } catch (error) { console.error("Error procesando usuario:", error); }
        }
    });
});

// ==============================================================
// MÓDULO DE UBICACIONES JERÁRQUICAS
// ==============================================================

let globalPaises = [], globalDeptos = [], globalCiudades = [];

async function cargarUbicacionesDesdeBD() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/ubicaciones');
        const data = await respuesta.json();
        
        globalPaises = data.paises;
        globalDeptos = data.departamentos;
        globalCiudades = data.ciudades;

        renderizarArbolUbicaciones();
    } catch (error) { console.error("Error cargando ubicaciones:", error); }
}

function renderizarArbolUbicaciones() {
    const contenedor = document.getElementById('contenedor-ubicaciones');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    globalPaises.forEach(pais => {
        const deptosDelPais = globalDeptos.filter(d => d.id_pais === pais.id_pais);
        const totalCiudadesPais = deptosDelPais.reduce((acc, depto) => {
            return acc + globalCiudades.filter(c => c.id_departamento === depto.id_departamento).length;
        }, 0);

        const divPais = document.createElement('div');
        divPais.innerHTML = `
            <div class="ubi-item d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapsePais${pais.id_pais}" onclick="toggleChevron(this)">
                <div class="d-flex align-items-center">
                    <i class="bi bi-chevron-right ubi-chevron me-3"></i>
                    <span class="ubi-icon">🌍</span>
                    <div>
                        <h6 class="fw-bold mb-0 text-dark">${pais.nombre}</h6>
                        <small class="text-muted">${deptosDelPais.length} departamentos • ${totalCiudadesPais} ciudades</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn-texto-accion" onclick="event.stopPropagation(); abrirModalEditarPais(${pais.id_pais})"><i class="bi bi-pencil-square fs-5 text-muted"></i></button>
                    <button class="btn-texto-accion" onclick="event.stopPropagation(); eliminarPais(${pais.id_pais})"><i class="bi bi-trash fs-5 text-muted text-danger"></i></button>
                </div>
            </div>
            <div class="collapse" id="collapsePais${pais.id_pais}">
                <div class="deptos-wrapper" id="wrapper-pais-${pais.id_pais}"></div>
            </div>
        `;
        contenedor.appendChild(divPais);

        const wrapperDeptos = document.getElementById(`wrapper-pais-${pais.id_pais}`);

        deptosDelPais.forEach(depto => {
            const ciudadesDelDepto = globalCiudades.filter(c => c.id_departamento === depto.id_departamento);
            
            const divDepto = document.createElement('div');
            divDepto.innerHTML = `
                <div class="ubi-item depto-container d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapseDepto${depto.id_departamento}" onclick="toggleChevron(this)">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-chevron-right ubi-chevron me-3"></i>
                        <span class="ubi-icon" style="color: #e11d48;">📍</span>
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">${depto.nombre}</h6>
                            <small class="text-muted">${ciudadesDelDepto.length} ciudades</small>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn-texto-accion" onclick="event.stopPropagation(); abrirModalEditarDepto(${depto.id_departamento})"><i class="bi bi-pencil-square fs-5 text-muted"></i></button>
                        <button class="btn-texto-accion" onclick="event.stopPropagation(); eliminarDepto(${depto.id_departamento})"><i class="bi bi-trash fs-5 text-muted text-danger"></i></button>
                    </div>
                </div>
                <div class="collapse" id="collapseDepto${depto.id_departamento}">
                    <div class="ciudades-wrapper" id="wrapper-depto-${depto.id_departamento}"></div>
                </div>
            `;
            wrapperDeptos.appendChild(divDepto);

            const wrapperCiudades = document.getElementById(`wrapper-depto-${depto.id_departamento}`);

            ciudadesDelDepto.forEach(ciudad => {
                const divCiudad = document.createElement('div');
                divCiudad.className = 'ubi-item ciudad-container d-flex justify-content-between align-items-center';
                divCiudad.innerHTML = `
                    <div class="d-flex align-items-center">
                        <span class="ubi-icon ms-4">🏙️</span>
                        <h6 class="fw-medium mb-0 text-dark">${ciudad.nombre}</h6>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn-texto-accion" onclick="abrirModalEditarCiudad(${ciudad.id_ciudad})"><i class="bi bi-pencil-square fs-5 text-muted"></i></button>
                        <button class="btn-texto-accion" onclick="eliminarCiudad(${ciudad.id_ciudad})"><i class="bi bi-trash fs-5 text-muted text-danger"></i></button>
                    </div>
                `;
                wrapperCiudades.appendChild(divCiudad);
            });

            wrapperCiudades.innerHTML += `
                <div class="ciudad-container py-3 d-flex justify-content-center">
                    <button class="btn-add-nested" onclick="abrirModalCiudad(${pais.id_pais}, ${depto.id_departamento})">
                        <i class="bi bi-plus-lg"></i> Agregar Ciudad
                    </button>
                </div>
            `;
        });

        wrapperDeptos.innerHTML += `
            <div class="depto-container py-3 ms-4">
                <button class="btn-add-nested" onclick="abrirModalDepto(${pais.id_pais})">
                    <i class="bi bi-plus-lg"></i> Agregar Departamento
                </button>
            </div>
        `;
    });
}

window.toggleChevron = function(elemento) {
    const icon = elemento.querySelector('.ubi-chevron');
    if(icon) icon.classList.toggle('open');
};

window.abrirModalPais = function() {
    document.getElementById('form-pais').reset();
    new bootstrap.Modal(document.getElementById('modalPais')).show();
};

window.abrirModalDepto = function(id_pais_preseleccionado = null) {
    document.getElementById('form-depto').reset();
    const selectPais = document.getElementById('depto-pais');
    selectPais.innerHTML = '<option value="">Seleccionar país</option>';
    
    globalPaises.forEach(p => {
        selectPais.innerHTML += `<option value="${p.id_pais}">${p.nombre}</option>`;
    });

    if(id_pais_preseleccionado) selectPais.value = id_pais_preseleccionado;
    new bootstrap.Modal(document.getElementById('modalDepto')).show();
};

window.abrirModalCiudad = function(id_pais_pre = null, id_depto_pre = null) {
    document.getElementById('form-ciudad').reset();
    const selPais = document.getElementById('ciudad-pais');
    const selDepto = document.getElementById('ciudad-depto');
    
    selPais.innerHTML = '<option value="">Seleccionar país</option>';
    globalPaises.forEach(p => selPais.innerHTML += `<option value="${p.id_pais}">${p.nombre}</option>`);

    selPais.onchange = () => {
        selDepto.innerHTML = '<option value="">Seleccionar departamento</option>';
        const deptosFiltrados = globalDeptos.filter(d => d.id_pais == selPais.value);
        deptosFiltrados.forEach(d => selDepto.innerHTML += `<option value="${d.id_departamento}">${d.nombre}</option>`);
    };

    if(id_pais_pre) {
        selPais.value = id_pais_pre;
        selPais.dispatchEvent(new Event('change'));
        if(id_depto_pre) selDepto.value = id_depto_pre;
    } else {
        selDepto.innerHTML = '<option value="">Primero selecciona un país</option>';
    }

    new bootstrap.Modal(document.getElementById('modalCiudad')).show();
};

document.body.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-guardar-pais') {
        if (e.target.textContent === 'Guardar Cambios') return; 
        
        const data = { nombre: document.getElementById('pais-nombre').value, codigo: document.getElementById('pais-codigo').value };
        try {
            await fetch('http://localhost:3000/api/paises', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
            bootstrap.Modal.getInstance(document.getElementById('modalPais')).hide();
            cargarUbicacionesDesdeBD();
        } catch (error) { console.error("Error guardando país:", error); }
    }

    if (e.target && e.target.id === 'btn-guardar-depto') {
        if (e.target.textContent === 'Guardar Cambios') return;
        
        const data = { id_pais: document.getElementById('depto-pais').value, nombre: document.getElementById('depto-nombre').value };
        try {
            await fetch('http://localhost:3000/api/departamentos', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
            bootstrap.Modal.getInstance(document.getElementById('modalDepto')).hide();
            cargarUbicacionesDesdeBD();
        } catch (error) { console.error("Error guardando depto:", error); }
    }

    if (e.target && e.target.id === 'btn-guardar-ciudad') {
        if (e.target.textContent === 'Guardar Cambios') return;
        
        const data = { id_departamento: document.getElementById('ciudad-depto').value, nombre: document.getElementById('ciudad-nombre').value };
        try {
            await fetch('http://localhost:3000/api/ciudades', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
            bootstrap.Modal.getInstance(document.getElementById('modalCiudad')).hide();
            cargarUbicacionesDesdeBD();
        } catch (error) { console.error("Error guardando ciudad:", error); }
    }
});

window.abrirModalEditarPais = function(id) {
    const p = globalPaises.find(item => item.id_pais === id);
    if (!p) return;
    document.getElementById('pais-nombre').value = p.nombre;
    document.getElementById('pais-codigo').value = p.codigo || '';
    
    const btn = document.getElementById('btn-guardar-pais');
    btn.textContent = 'Guardar Cambios';
    btn.onclick = async () => {
        const payload = { nombre: document.getElementById('pais-nombre').value, codigo: document.getElementById('pais-codigo').value };
        await fetch(`http://localhost:3000/api/paises/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        bootstrap.Modal.getInstance(document.getElementById('modalPais')).hide();
        cargarUbicacionesDesdeBD();
    };
    new bootstrap.Modal(document.getElementById('modalPais')).show();
};

window.eliminarPais = async function(id) {
    if (confirm("¿Seguro que deseas eliminar este país? Al hacerlo se borrarán todos sus departamentos y ciudades asociadas.")) {
        await fetch(`http://localhost:3000/api/paises/${id}`, { method: 'DELETE' });
        cargarUbicacionesDesdeBD();
    }
};

window.abrirModalEditarDepto = function(id) {
    const d = globalDeptos.find(item => item.id_departamento === id);
    if (!d) return;
    
    abrirModalDepto(d.id_pais); 
    document.getElementById('depto-nombre').value = d.nombre;
    
    const btn = document.getElementById('btn-guardar-depto');
    btn.textContent = 'Guardar Cambios';
    btn.onclick = async () => {
        const payload = { id_pais: document.getElementById('depto-pais').value, nombre: document.getElementById('depto-nombre').value };
        await fetch(`http://localhost:3000/api/departamentos/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        bootstrap.Modal.getInstance(document.getElementById('modalDepto')).hide();
        cargarUbicacionesDesdeBD();
    };
};

window.eliminarDepto = async function(id) {
    if (confirm("¿Seguro que deseas eliminar este departamento? Se perderán todas sus ciudades.")) {
        await fetch(`http://localhost:3000/api/departamentos/${id}`, { method: 'DELETE' });
        cargarUbicacionesDesdeBD();
    }
};

window.abrirModalEditarCiudad = function(id) {
    const c = globalCiudades.find(item => item.id_ciudad === id);
    if (!c) return;
    
    const depto = globalDeptos.find(d => d.id_departamento === c.id_departamento);
    abrirModalCiudad(depto.id_pais, c.id_departamento);
    document.getElementById('ciudad-nombre').value = c.nombre;
    
    const btn = document.getElementById('btn-guardar-ciudad');
    btn.textContent = 'Guardar Cambios';
    btn.onclick = async () => {
        const payload = { id_departamento: document.getElementById('ciudad-depto').value, nombre: document.getElementById('ciudad-nombre').value };
        await fetch(`http://localhost:3000/api/ciudades/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        bootstrap.Modal.getInstance(document.getElementById('modalCiudad')).hide();
        cargarUbicacionesDesdeBD();
    };
};

window.eliminarCiudad = async function(id) {
    if (confirm("¿Seguro que deseas eliminar esta ciudad?")) {
        await fetch(`http://localhost:3000/api/ciudades/${id}`, { method: 'DELETE' });
        cargarUbicacionesDesdeBD();
    }
};

// ==============================================================
// MÓDULO DE REPORTES Y ANÁLISIS 
// ==============================================================
async function cargarReportesDesdeBD() {
    try {
        // 1. Cargar Clientes Frecuentes
        const resFrec = await fetch('http://localhost:3000/api/reportes/clientes-frecuentes');
        const dataFrec = await resFrec.json();
        const tbodyFrec = document.getElementById('rep-frecuentes-body');
        tbodyFrec.innerHTML = '';
        dataFrec.forEach(c => {
            tbodyFrec.innerHTML += `
                <tr>
                    <td class="py-3">${c.identificacion || 'N/A'}</td>
                    <td class="py-3 fw-medium text-dark">${c.cliente}</td>
                    <td class="py-3 text-muted">${c.correo}</td>
                    <td class="py-3 text-center"><span class="badge bg-primary rounded-pill px-3">${c.total_reservas}</span></td>
                    <td class="py-3 text-end fw-bold text-success">$${parseFloat(c.dinero_invertido).toLocaleString('es-ES')}</td>
                </tr>
            `;
        });

        // 2. Cargar Cobertura Geográfica
        const resCob = await fetch('http://localhost:3000/api/reportes/cobertura');
        const dataCob = await resCob.json();
        const tbodyCob = document.getElementById('rep-cobertura-body');
        tbodyCob.innerHTML = '';
        dataCob.forEach(v => {
            const badgeEstado = v.estado_vuelo === 'Cancelado' ? 'badge-cancelado' : 'badge-confirmado';
            tbodyCob.innerHTML += `
                <tr>
                    <td class="py-3 fw-bold text-dark"><i class="bi bi-globe-americas me-2 text-muted"></i>${v.pais}</td>
                    <td class="py-3">${v.departamento}</td>
                    <td class="py-3 fw-medium">${v.ciudad_destino}</td>
                    <td class="py-3 text-orange fw-bold">${v.cod_vuelo}</td>
                    <td class="py-3">${v.ciudad_origen}</td>
                    <td class="py-3"><span class="badge ${badgeEstado}">${v.estado_vuelo}</span></td>
                </tr>
            `;
        });

        // 3. Cargar Cancelaciones
        const resCanc = await fetch('http://localhost:3000/api/reportes/cancelaciones');
        const dataCanc = await resCanc.json();
        const tbodyCanc = document.getElementById('rep-cancelaciones-body');
        tbodyCanc.innerHTML = '';
        dataCanc.forEach(r => {
            const fecha = new Date(r.fecha_cancelacion).toLocaleString('es-ES');
            tbodyCanc.innerHTML += `
                <tr>
                    <td class="py-3 fw-bold text-dark">RES${String(r.id_reserva).padStart(3, '0')}</td>
                    <td class="py-3 text-orange fw-bold">${r.cod_vuelo}</td>
                    <td class="py-3">${r.cliente}</td>
                    <td class="py-3 text-muted">${fecha}</td>
                    <td class="py-3 text-end fw-bold text-danger">-$${parseFloat(r.valor_total).toLocaleString('es-ES')}</td>
                    <td class="py-3"><span class="text-danger small fw-medium"><i class="bi bi-exclamation-circle me-1"></i>${r.causa_estimada}</span></td>
                </tr>
            `;
        });

        // 4. Cargar Métrica de Eficiencia
        const resEf = await fetch('http://localhost:3000/api/reportes/eficiencia');
        const dataEf = await resEf.json();
        document.getElementById('rep-promedio-global').innerHTML = `${dataEf.promedioGlobal} <span class="fs-5 fw-medium text-muted">minutos</span>`;
        
        const tbodyEf = document.getElementById('rep-eficiencia-body');
        tbodyEf.innerHTML = '';
        dataEf.detalle.forEach(r => {
            tbodyEf.innerHTML += `
                <tr>
                    <td class="py-3 fw-bold text-dark">RES${String(r.id_reserva).padStart(3, '0')}</td>
                    <td class="py-3">${r.cliente}</td>
                    <td class="py-3 text-muted">${new Date(r.momento_reserva).toLocaleString('es-ES')}</td>
                    <td class="py-3 text-muted">${new Date(r.momento_confirmacion).toLocaleString('es-ES')}</td>
                    <td class="py-3 text-center fw-bold text-success">${r.minutos_transcurridos} min</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error al cargar los reportes:", error);
    }
}