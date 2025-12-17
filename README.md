# Sistema Web de Gestión de Sueño 😴

Proyecto académico desarrollado como práctica de **Ingeniería Biomédica** en el Instituto Tecnológico de Tijuana.  
El objetivo es implementar un **sistema web** que permita a los usuarios registrar, consultar y analizar sus hábitos de sueño mediante una interfaz sencilla, conectada a una API REST con base de datos MySQL.

---

 Objetivo del proyecto

Diseñar e implementar un sistema cliente–servidor que:

- Permita a los usuarios **registrar sus noches de sueño** (hora de acostarse, despertar, calidad, cafeína, pantallas, actividad física, etc.).
- Genere un **historial de registros** para consultar patrones.
- Muestre un **resumen estadístico** (promedio de horas dormidas, calidad, uso de pantallas, etc.).
- Implemente **roles** (usuario / administrador), control de acceso y manejo seguro de contraseñas.
- Permita **subir archivos** (PDF/Excel) asociados al usuario y **exportar** los registros a CSV.

 Funcionalidades principales

 Autenticación y usuarios
- Registro de usuarios con **código de acceso**:
  - `SUENO123` → rol `usuario`.
  - `ADMIN123` → rol `admin`.
- Inicio de sesión con correo y contraseña.
- Contraseñas encriptadas con **bcrypt**.
- Manejo de sesión con **JSON Web Tokens (JWT)**.
- Panel de administración (solo rol `admin`):
  - Listado de todos los usuarios.
  - Eliminación de usuarios (borra también sus registros y archivos asociados).

 Gestión de sueño
- Formulario para registrar:
  - Fecha.
  - Hora de acostarse / despertar (formato 24 h).
  - Despertares nocturnos.
  - Calidad del sueño (1–5).
  - Consumo de cafeína.
  - Minutos de pantallas antes de dormir.
  - Nivel de actividad física (baja, media, alta).
  - Nota / comentario.
- Tabla de **“Mis registros de sueño”**:
  - Cálculo automático de horas dormidas.
  - Buscador / filtro de registros.
  - Edición y eliminación de registros.

 Resumen estadístico
- Promedio de horas dormidas.
- Promedio de calidad del sueño.
- Total de registros en el rango seleccionado.
- Días con consumo de cafeína.
- Promedio de minutos de pantallas.
- Actividad física dominante (baja / media / alta).
- Rango configurable (7, 30 o 90 días).

 Archivos y exportación
- Subida de archivos PDF / Excel / CSV asociados al usuario.
- Listado de archivos subidos (ver y eliminar).
- Exportación de registros de sueño a **CSV** para análisis externo (por ejemplo, en Excel).

 Tecnologías utilizadas

- **Backend**
  - Node.js
  - Express
  - MySQL2 (pool de conexiones)
  - dotenv
  - bcryptjs
  - jsonwebtoken (JWT)
  - multer (subida de archivos)
  - cors
  - nodemon (desarrollo)

- **Base de datos**
  - MySQL  
  - Tablas principales:
    - `usuarios`
    - `registros_sueno`
    - `archivos_usuarios`

- **Frontend**
  - HTML5
  - CSS3 (diseño tipo dashboard, tema oscuro)
  - JavaScript (fetch API, manipulación del DOM)

- **Control de versiones**
  - Git
  - GitHub

---

 Estructura del proyecto

```bash
sistema-web-gestion-sueno/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── .env        # (no se versiona, ejemplo abajo)
│   └── uploads/    # archivos subidos (ignorado en Git)
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .gitignore
└── README.md
