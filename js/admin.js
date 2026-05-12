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
                }
            } else {
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