// frontend/app.js

const API_BASE = "http://localhost:3000/api";

let usuarioActual = null;
let registrosActuales = [];
let registroEnEdicion = null;
let tokenActual = null;
let archivosActuales = [];

// Referencias a elementos del DOM
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

const formRegistro = document.getElementById("formRegistro");
const mensajeRegistro = document.getElementById("mensajeRegistro");

const formLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

const textoUsuario = document.getElementById("textoUsuario");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const formRegistroSueno = document.getElementById("formRegistroSueno");
const mensajeSueno = document.getElementById("mensajeSueno");
const tablaRegistros = document.getElementById("tablaRegistros");
const btnGuardarRegistro = document.getElementById("btnGuardarRegistro");
const buscadorRegistros = document.getElementById("buscadorRegistros");

// Resumen
const resumenDiasSelect = document.getElementById("resumenDias");
const resumenRango = document.getElementById("resumenRango");
const resumenHoras = document.getElementById("resumenHoras");
const resumenCalidad = document.getElementById("resumenCalidad");
const resumenTotal = document.getElementById("resumenTotal");
const resumenCafeina = document.getElementById("resumenCafeina");
const resumenPantallas = document.getElementById("resumenPantallas");
const resumenActividad = document.getElementById("resumenActividad");

// Archivos
const formArchivos = document.getElementById("formArchivos");
const inputArchivo = document.getElementById("inputArchivo");
const mensajeArchivos = document.getElementById("mensajeArchivos");
const tablaArchivos = document.getElementById("tablaArchivos");

// Admin
const adminSection = document.getElementById("admin-section");
const tablaUsuariosAdmin = document.getElementById("tablaUsuariosAdmin");

// Botón para descargar CSV
const btnDescargarCSV = document.getElementById("btnDescargarCSV");

// Helpers
function mostrarMensaje(elemento, texto, esError = false) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.style.color = esError ? "#f87171" : "#4ade80";
}

function limpiarMensaje(elemento) {
  if (!elemento) return;
  elemento.textContent = "";
}

function cambiarAVistaApp() {
  authSection.classList.add("oculto");
  appSection.classList.remove("oculto");
  textoUsuario.textContent = `Sesión iniciada como: ${usuarioActual.nombre} (${usuarioActual.correo})`;

  if (usuarioActual.rol === "admin" && adminSection) {
    adminSection.classList.remove("oculto");
    cargarUsuariosAdmin();
  } else if (adminSection) {
    adminSection.classList.add("oculto");
  }
}

function cambiarAVistaAuth() {
  authSection.classList.remove("oculto");
  appSection.classList.add("oculto");
  usuarioActual = null;
  registrosActuales = [];
  registroEnEdicion = null;
  tokenActual = null;
  archivosActuales = [];
  resetResumen();

  if (btnGuardarRegistro) btnGuardarRegistro.textContent = "Guardar registro";
  if (tablaRegistros) tablaRegistros.innerHTML = "";
  if (buscadorRegistros) buscadorRegistros.value = "";
  if (tablaArchivos) tablaArchivos.innerHTML = "";
  if (tablaUsuariosAdmin) tablaUsuariosAdmin.innerHTML = "";
  if (adminSection) adminSection.classList.add("oculto");
  limpiarMensaje(mensajeArchivos);
}

function calcularHorasDormidas(horaAcostarse, horaDespertar) {
  const [h1, m1] = horaAcostarse.split(":").map(Number);
  const [h2, m2] = horaDespertar.split(":").map(Number);

  let inicio = h1 * 60 + m1;
  let fin = h2 * 60 + m2;

  if (fin <= inicio) {
    fin += 24 * 60;
  }

  const minutos = fin - inicio;
  const horas = minutos / 60;
  return horas.toFixed(2);
}

function formatearFecha(fechaBD) {
  const fecha = new Date(fechaBD);
  if (Number.isNaN(fecha.getTime())) return fechaBD;
  return fecha.toLocaleDateString("es-MX");
}

function resetResumen() {
  if (!resumenHoras) return;
  resumenRango.textContent = "Últimos 7 días";
  resumenHoras.textContent = "--";
  resumenCalidad.textContent = "--";
  resumenTotal.textContent = "--";
  resumenCafeina.textContent = "--";
  resumenPantallas.textContent = "--";
  resumenActividad.textContent = "--";
}

function pintarTablaRegistros(lista) {
  if (!tablaRegistros) return;
  tablaRegistros.innerHTML = "";

  lista.forEach((reg) => {
    const tr = document.createElement("tr");

    const horasDormidas = calcularHorasDormidas(
      reg.hora_acostarse,
      reg.hora_despertar
    );

    const fechaBonita = formatearFecha(reg.fecha);
    const notaTexto = reg.nota || "";

    tr.innerHTML = `
      <td>${fechaBonita}</td>
      <td>${reg.hora_acostarse}</td>
      <td>${reg.hora_despertar}</td>
      <td>${horasDormidas}</td>
      <td>${reg.calidad}</td>
      <td>${reg.cafeina ? "Sí" : "No"}</td>
      <td>${reg.pantallas_minutos}</td>
      <td>${reg.actividad_fisica}</td>
      <td>${notaTexto}</td>
      <td>
        <button class="btn-sm btn-editar" data-id="${reg.id_registro}">Editar</button>
        <button class="btn-sm btn-eliminar" data-id="${reg.id_registro}">Eliminar</button>
      </td>
    `;

    tablaRegistros.appendChild(tr);
  });
}

function pintarTablaArchivos(lista) {
  if (!tablaArchivos) return;
  tablaArchivos.innerHTML = "";

  lista.forEach((arch) => {
    const tr = document.createElement("tr");
    const fecha = arch.subido_en
      ? new Date(arch.subido_en).toLocaleString("es-MX")
      : "";

    tr.innerHTML = `
      <td>${arch.nombre_archivo}</td>
      <td>${arch.tipo_archivo}</td>
      <td>${fecha}</td>
      <td>
        <a href="${arch.ruta_archivo}" target="_blank" class="btn-sm">Ver</a>
        <button class="btn-sm btn-eliminar btn-eliminar-archivo" data-id="${arch.id_archivo}">
          Eliminar
        </button>
      </td>
    `;

    tablaArchivos.appendChild(tr);
  });
}

function pintarTablaUsuariosAdmin(lista) {
  if (!tablaUsuariosAdmin) return;
  tablaUsuariosAdmin.innerHTML = "";

  lista.forEach((u) => {
    const tr = document.createElement("tr");
    const fecha = u.creado_en
      ? new Date(u.creado_en).toLocaleString("es-MX")
      : "";

    tr.innerHTML = `
      <td>${u.id_usuario}</td>
      <td>${u.nombre}</td>
      <td>${u.correo}</td>
      <td>${u.rol}</td>
      <td>${fecha}</td>
      <td>
        <button class="btn-sm btn-eliminar btn-eliminar-usuario" data-id="${u.id_usuario}">
          Eliminar
        </button>
      </td>
    `;

    tablaUsuariosAdmin.appendChild(tr);
  });
}

// =======================
// Eventos: Registro / Login
// =======================

if (formRegistro) {
  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje(mensajeRegistro);

    const nombre = document.getElementById("registroNombre").value.trim();
    const correo = document.getElementById("registroCorreo").value.trim();
    const password = document.getElementById("registroPassword").value;
    const codigo_acceso = document
      .getElementById("registroCodigo")
      .value.trim();

    try {
      const resp = await fetch(`${API_BASE}/usuarios/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, password, codigo_acceso })
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarMensaje(
          mensajeRegistro,
          data.mensaje || "Error al registrar usuario.",
          true
        );
        return;
      }

      mostrarMensaje(
        mensajeRegistro,
        `Usuario registrado correctamente. Rol asignado: ${data.rol}. Ahora puedes iniciar sesión.`
      );
      formRegistro.reset();
    } catch (error) {
      console.error("Error en registro:", error);
      mostrarMensaje(mensajeRegistro, "Error de conexión con la API.", true);
    }
  });
}

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje(mensajeLogin);

    const correo = document.getElementById("loginCorreo").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const resp = await fetch(`${API_BASE}/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarMensaje(
          mensajeLogin,
          data.mensaje || "Correo o contraseña incorrectos.",
          true
        );
        return;
      }

      usuarioActual = data.usuario;
      tokenActual = data.token;
      mostrarMensaje(mensajeLogin, "Login exitoso.");
      formLogin.reset();

      cambiarAVistaApp();
      cargarRegistros();
      cargarResumen();
      cargarArchivos();
      if (usuarioActual.rol === "admin") {
        cargarUsuariosAdmin();
      }
    } catch (error) {
      console.error("Error en login:", error);
      mostrarMensaje(mensajeLogin, "Error de conexión con la API.", true);
    }
  });
}

if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener("click", () => {
    cambiarAVistaAuth();
    limpiarMensaje(mensajeSueno);
    limpiarMensaje(mensajeLogin);
    limpiarMensaje(mensajeRegistro);
  });
}

// =======================
// Resumen y registros
// =======================

if (resumenDiasSelect) {
  resumenDiasSelect.addEventListener("change", () => {
    const dias = Number(resumenDiasSelect.value) || 7;
    cargarResumen(dias);
  });
}

if (formRegistroSueno) {
  formRegistroSueno.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje(mensajeSueno);

    if (!usuarioActual || !tokenActual) {
      mostrarMensaje(
        mensajeSueno,
        "Debes iniciar sesión para registrar tu sueño.",
        true
      );
      return;
    }

    const fecha = document.getElementById("fecha").value;
    let hora_acostarse = document.getElementById("horaAcostarse").value.trim();
    let hora_despertar = document.getElementById("horaDespertar").value.trim();
    const despertares_nocturnos = Number(
      document.getElementById("despertares").value || "0"
    );
    const calidad = Number(document.getElementById("calidad").value || "3");
    const cafeina = Number(document.getElementById("cafeina").value || "0");
    const pantallas_minutos = Number(
      document.getElementById("pantallas").value || "0"
    );
    const actividad_fisica = document.getElementById("actividad").value;
    const nota = document.getElementById("nota").value.trim();

    if (!fecha || !hora_acostarse || !hora_despertar) {
      mostrarMensaje(mensajeSueno, "Faltan datos obligatorios.", true);
      return;
    }

    if (hora_acostarse.length === 5) hora_acostarse += ":00";
    if (hora_despertar.length === 5) hora_despertar += ":00";

    try {
      let url = `${API_BASE}/registros`;
      let metodo = "POST";

      if (registroEnEdicion) {
        url = `${API_BASE}/registros/${registroEnEdicion}`;
        metodo = "PUT";
      }

      const resp = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenActual}`
        },
        body: JSON.stringify({
          fecha,
          hora_acostarse,
          hora_despertar,
          despertares_nocturnos,
          calidad,
          cafeina,
          pantallas_minutos,
          actividad_fisica,
          nota
        })
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarMensaje(
          mensajeSueno,
          data.mensaje || "Error al guardar el registro.",
          true
        );
        return;
      }

      if (registroEnEdicion) {
        mostrarMensaje(mensajeSueno, "Registro actualizado correctamente.");
      } else {
        mostrarMensaje(
          mensajeSueno,
          "Registro de sueño guardado correctamente."
        );
      }

      formRegistroSueno.reset();
      registroEnEdicion = null;
      if (btnGuardarRegistro)
        btnGuardarRegistro.textContent = "Guardar registro";

      await cargarRegistros();
      const dias = Number(resumenDiasSelect.value) || 7;
      cargarResumen(dias);
    } catch (error) {
      console.error("Error al guardar registro de sueño:", error);
      mostrarMensaje(mensajeSueno, "Error de conexión con la API.", true);
    }
  });
}

if (tablaRegistros) {
  tablaRegistros.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.classList.contains("btn-editar")) {
      const id = Number(target.dataset.id);
      const reg = registrosActuales.find((r) => r.id_registro === id);
      if (!reg) return;

      document.getElementById("fecha").value =
        reg.fecha.split("T")[0] || reg.fecha;
      document.getElementById("horaAcostarse").value =
        reg.hora_acostarse?.slice(0, 5) || "";
      document.getElementById("horaDespertar").value =
        reg.hora_despertar?.slice(0, 5) || "";
      document.getElementById("despertares").value =
        reg.despertares_nocturnos ?? 0;
      document.getElementById("calidad").value = reg.calidad ?? 3;
      document.getElementById("cafeina").value = reg.cafeina ? 1 : 0;
      document.getElementById("pantallas").value =
        reg.pantallas_minutos ?? 0;
      document.getElementById("actividad").value =
        reg.actividad_fisica || "baja";
      document.getElementById("nota").value = reg.nota || "";

      registroEnEdicion = id;
      if (btnGuardarRegistro)
        btnGuardarRegistro.textContent = "Actualizar registro";
      mostrarMensaje(
        mensajeSueno,
        "Editando registro. Modifica los datos y guarda para actualizar."
      );
    }

    if (target.classList.contains("btn-eliminar")) {
      const id = Number(target.dataset.id);
      const confirmar = window.confirm(
        "¿Seguro que deseas eliminar este registro de sueño?"
      );
      if (!confirmar) return;
      if (!tokenActual) {
        mostrarMensaje(
          mensajeSueno,
          "Debes iniciar sesión para eliminar registros.",
          true
        );
        return;
      }

      try {
        const resp = await fetch(`${API_BASE}/registros/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${tokenActual}`
          }
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          mostrarMensaje(
            mensajeSueno,
            data.mensaje || "Error al eliminar el registro.",
            true
          );
          return;
        }

        mostrarMensaje(mensajeSueno, "Registro eliminado correctamente.");
        registroEnEdicion = null;
        if (btnGuardarRegistro)
          btnGuardarRegistro.textContent = "Guardar registro";

        await cargarRegistros();
        const dias = Number(resumenDiasSelect.value) || 7;
        cargarResumen(dias);
      } catch (error) {
        console.error("Error al eliminar registro:", error);
        mostrarMensaje(mensajeSueno, "Error de conexión con la API.", true);
      }
    }
  });
}

if (buscadorRegistros) {
  buscadorRegistros.addEventListener("keyup", () => {
    const texto = buscadorRegistros.value.toLowerCase().trim();

    if (!texto) {
      pintarTablaRegistros(registrosActuales);
      return;
    }

    const filtrados = registrosActuales.filter((reg) => {
      const fechaBonita = formatearFecha(reg.fecha).toLowerCase();
      const horasDormidas = calcularHorasDormidas(
        reg.hora_acostarse,
        reg.hora_despertar
      );
      const calidad = String(reg.calidad ?? "");
      const actividad = (reg.actividad_fisica || "").toLowerCase();
      const cafeina = reg.cafeina ? "sí" : "no";
      const pantallas = String(reg.pantallas_minutos ?? "");
      const nota = (reg.nota || "").toLowerCase();

      const textoFila = [
        fechaBonita,
        reg.hora_acostarse,
        reg.hora_despertar,
        horasDormidas,
        calidad,
        cafeina,
        pantallas,
        actividad,
        nota
      ]
        .join(" ")
        .toLowerCase();

      return textoFila.includes(texto);
    });

    pintarTablaRegistros(filtrados);
  });
}

// =======================
// Archivos
// =======================

if (formArchivos) {
  formArchivos.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje(mensajeArchivos);

    if (!usuarioActual || !tokenActual) {
      mostrarMensaje(
        mensajeArchivos,
        "Debes iniciar sesión para subir archivos.",
        true
      );
      return;
    }

    if (!inputArchivo.files || inputArchivo.files.length === 0) {
      mostrarMensaje(
        mensajeArchivos,
        "Selecciona un archivo antes de subir.",
        true
      );
      return;
    }

    const archivo = inputArchivo.files[0];
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const resp = await fetch(`${API_BASE}/archivos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenActual}`
        },
        body: formData
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarMensaje(
          mensajeArchivos,
          data.mensaje || "Error al subir archivo.",
          true
        );
        return;
      }

      mostrarMensaje(mensajeArchivos, "Archivo subido correctamente.");
      formArchivos.reset();
      inputArchivo.value = "";
      await cargarArchivos();
    } catch (error) {
      console.error("Error al subir archivo:", error);
      mostrarMensaje(
        mensajeArchivos,
        "Error de conexión al subir archivo.",
        true
      );
    }
  });
}

if (tablaArchivos) {
  tablaArchivos.addEventListener("click", async (e) => {
    const target = e.target;
    if (!target.classList.contains("btn-eliminar-archivo")) return;

    const id = Number(target.dataset.id);
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este archivo?"
    );
    if (!confirmar) return;

    if (!tokenActual) {
      mostrarMensaje(
        mensajeArchivos,
        "Debes iniciar sesión para eliminar archivos.",
        true
      );
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/archivos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenActual}`
        }
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarMensaje(
          mensajeArchivos,
          data.mensaje || "Error al eliminar archivo.",
          true
        );
        return;
      }

      mostrarMensaje(mensajeArchivos, "Archivo eliminado correctamente.");
      await cargarArchivos();
    } catch (error) {
      console.error("Error al eliminar archivo:", error);
      mostrarMensaje(
        mensajeArchivos,
        "Error de conexión al eliminar archivo.",
        true
      );
    }
  });
}

// =======================
// Descargar registros a CSV
// =======================

async function descargarRegistrosCSV() {
  if (!usuarioActual || !tokenActual) {
    mostrarMensaje(
      mensajeSueno,
      "Debes iniciar sesión para descargar tus registros.",
      true
    );
    return;
  }

  try {
    const dias = Number(resumenDiasSelect?.value) || 0;
    let url = `${API_BASE}/export/registros`;
    if (dias > 0) {
      url += `?dias=${dias}`;
    }

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenActual}`
      }
    });

    if (!resp.ok) {
      const texto = await resp.text();
      console.error("Error al descargar CSV:", texto);
      mostrarMensaje(
        mensajeSueno,
        "Error al generar el archivo de registros.",
        true
      );
      return;
    }

    const blob = await resp.blob();
    const urlBlob = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = urlBlob;
    const nombreLimpio = (usuarioActual.nombre || "usuario").replace(
      /\s+/g,
      "_"
    );
    enlace.download = `registros_sueno_${nombreLimpio}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(urlBlob);
  } catch (error) {
    console.error("Error en descargarRegistrosCSV:", error);
    mostrarMensaje(
      mensajeSueno,
      "Error de conexión al descargar registros.",
      true
    );
  }
}

if (btnDescargarCSV) {
  btnDescargarCSV.addEventListener("click", descargarRegistrosCSV);
}

// =======================
// Admin: eliminar usuarios
// =======================

if (tablaUsuariosAdmin) {
  tablaUsuariosAdmin.addEventListener("click", async (e) => {
    const target = e.target;
    if (!target.classList.contains("btn-eliminar-usuario")) return;

    const id = Number(target.dataset.id);
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este usuario? Se borrarán también sus registros y archivos."
    );
    if (!confirmar) return;

    if (!usuarioActual || usuarioActual.rol !== "admin" || !tokenActual) {
      window.alert("No tienes permisos para realizar esta acción.");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/admin/usuarios/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenActual}`
        }
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        window.alert(data.mensaje || "Error al eliminar usuario.");
        return;
      }

      window.alert("Usuario eliminado correctamente.");
      await cargarUsuariosAdmin();
    } catch (error) {
      console.error("Error al eliminar usuario (admin):", error);
      window.alert("Error de conexión al eliminar usuario.");
    }
  });
}

// =======================
// Funciones para cargar datos
// =======================

async function cargarRegistros() {
  if (!usuarioActual || !tokenActual) return;

  try {
    const resp = await fetch(
      `${API_BASE}/registros/${usuarioActual.id_usuario}`,
      {
        headers: {
          Authorization: `Bearer ${tokenActual}`
        }
      }
    );
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      console.error("Error al obtener registros:", data.mensaje);
      return;
    }

    registrosActuales = data.registros || [];
    pintarTablaRegistros(registrosActuales);
  } catch (error) {
    console.error("Error en cargarRegistros:", error);
  }
}

async function cargarResumen(dias = 7) {
  if (!usuarioActual || !tokenActual || !resumenHoras) return;

  try {
    const resp = await fetch(
      `${API_BASE}/resumen/${usuarioActual.id_usuario}?dias=${dias}`,
      {
        headers: {
          Authorization: `Bearer ${tokenActual}`
        }
      }
    );
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      console.error("Error al obtener resumen:", data.mensaje);
      return;
    }

    if (!data.resumen) {
      resumenRango.textContent = `Sin registros en los últimos ${dias} días`;
      resumenHoras.textContent = "--";
      resumenCalidad.textContent = "--";
      resumenTotal.textContent = "0";
      resumenCafeina.textContent = "0";
      resumenPantallas.textContent = "--";
      resumenActividad.textContent = "--";
      return;
    }

    const r = data.resumen;

    resumenRango.textContent = `Resumen de los últimos ${r.dias} días`;
    resumenHoras.textContent = r.promedio_horas
      ? `${parseFloat(r.promedio_horas).toFixed(2)} h`
      : "--";
    resumenCalidad.textContent = r.promedio_calidad
      ? `${parseFloat(r.promedio_calidad).toFixed(1)} / 5`
      : "--";
    resumenTotal.textContent = r.total_registros || 0;
    resumenCafeina.textContent = r.dias_con_cafeina || 0;
    resumenPantallas.textContent = r.promedio_pantallas
      ? `${parseFloat(r.promedio_pantallas).toFixed(0)} min`
      : "--";

    let actividadTexto = "--";
    if (r.actividad_dominante === "baja") actividadTexto = "Baja";
    if (r.actividad_dominante === "media") actividadTexto = "Media";
    if (r.actividad_dominante === "alta") actividadTexto = "Alta";

    resumenActividad.textContent = actividadTexto;
  } catch (error) {
    console.error("Error en cargarResumen:", error);
  }
}

async function cargarArchivos() {
  if (!usuarioActual || !tokenActual || !tablaArchivos) return;

  try {
    const resp = await fetch(`${API_BASE}/archivos`, {
      headers: {
        Authorization: `Bearer ${tokenActual}`
      }
    });
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      console.error("Error al obtener archivos:", data.mensaje);
      return;
    }

    archivosActuales = data.archivos || [];
    pintarTablaArchivos(archivosActuales);
  } catch (error) {
    console.error("Error en cargarArchivos:", error);
  }
}

async function cargarUsuariosAdmin() {
  if (
    !usuarioActual ||
    !tokenActual ||
    usuarioActual.rol !== "admin" ||
    !tablaUsuariosAdmin
  )
    return;

  try {
    const resp = await fetch(`${API_BASE}/admin/usuarios`, {
      headers: {
        Authorization: `Bearer ${tokenActual}`
      }
    });

    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      console.error("Error al obtener usuarios (admin):", data.mensaje);
      return;
    }

    pintarTablaUsuariosAdmin(data.usuarios || []);
  } catch (error) {
    console.error("Error en cargarUsuariosAdmin:", error);
  }
}
