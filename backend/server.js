// backend/server.js

// Cargar variables de entorno desde .env (dentro de /backend)
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_este_secreto';

// =======================
// CLAVES DE ACCESO PARA REGISTRO
// =======================
// Claves tipo "MEDICO123", adaptadas a tu proyecto.
const CLAVES_ACCESO = {
  'ADMIN123': 'admin',
  'SUENO123': 'usuario'
};

// =======================
// Middlewares base
// =======================
app.use(cors());
app.use(express.json()); // Para leer JSON en req.body

// Rutas de frontend y uploads
const frontendPath = path.join(__dirname, '../frontend');
const uploadsDir = path.join(__dirname, 'uploads');

// Crear carpeta uploads si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos estáticos del frontend
app.use(express.static(frontendPath));
// Servir archivos subidos (PDF/Excel)
app.use('/uploads', express.static(uploadsDir));

// =======================
// Configuración de subida de archivos (multer)
// =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

function fileFilter(req, file, cb) {
  const mime = file.mimetype;
  if (
    mime === 'application/pdf' ||
    mime === 'application/vnd.ms-excel' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'text/csv'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// =======================
// Pool de conexión a MySQL
// =======================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER, // sueno_app (o root si así lo tienes en .env)
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // gestion_sueno
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// =======================
// Middlewares de autenticación y autorización
// =======================

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res
      .status(401)
      .json({ ok: false, mensaje: 'Token no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id_usuario, nombre, correo, rol, iat, exp }
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res
      .status(401)
      .json({ ok: false, mensaje: 'Token inválido o expirado.' });
  }
}

function autorizarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res
        .status(401)
        .json({ ok: false, mensaje: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ ok: false, mensaje: 'No tienes permisos para esta acción.' });
    }
    next();
  };
}

// =======================
// Rutas básicas
// =======================

// Ruta raíz: devuelve el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Ruta para probar conexión a la base de datos
app.get('/api/ping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS ahora');
    res.json({
      ok: true,
      mensaje: 'Conexión a la base de datos OK',
      ahora: rows[0].ahora
    });
  } catch (error) {
    console.error('Error en /api/ping:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al conectar con la base de datos'
    });
  }
});

// =======================
// Rutas de USUARIOS
// =======================

// REGISTRO DE USUARIO (con CÓDIGO DE ACCESO)
app.post('/api/usuarios/registro', async (req, res) => {
  try {
    const { nombre, correo, password, codigo_acceso } = req.body;

    if (!nombre || !correo || !password || !codigo_acceso) {
      return res.status(400).json({
        ok: false,
        mensaje:
          'Faltan datos. Necesitas nombre, correo, contraseña y código de acceso.'
      });
    }

    const clave = codigo_acceso.trim().toUpperCase();
    const rol = CLAVES_ACCESO[clave];

    if (!rol) {
      return res.status(400).json({
        ok: false,
        mensaje:
          'Código de acceso inválido. Usa SUENO123 (usuario) o ADMIN123 (admin).'
      });
    }

    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existe.length > 0) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'El correo ya está registrado.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, password_hash, rol]
    );

    res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente.',
      id_usuario: resultado.insertId,
      rol
    });
  } catch (error) {
    console.error('Error en /api/usuarios/registro:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno en el servidor.' });
  }
});

// LOGIN DE USUARIO
app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Faltan correo o contraseña.' });
    }

    const [rows] = await pool.query(
      'SELECT id_usuario, nombre, correo, password_hash, rol FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Correo o contraseña incorrectos.' });
    }

    const usuario = rows[0];
    const esValida = await bcrypt.compare(password, usuario.password_hash);

    if (!esValida) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      ok: true,
      mensaje: 'Login exitoso.',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en /api/usuarios/login:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno en el servidor.' });
  }
});

// LISTAR USUARIOS (solo admin)
app.get(
  '/api/admin/usuarios',
  autenticar,
  autorizarRol('admin'),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id_usuario, nombre, correo, rol, creado_en FROM usuarios ORDER BY creado_en DESC'
      );
      res.json({ ok: true, usuarios: rows });
    } catch (error) {
      console.error('Error en GET /api/admin/usuarios:', error);
      res
        .status(500)
        .json({ ok: false, mensaje: 'Error interno al obtener usuarios.' });
    }
  }
);

// ELIMINAR USUARIO (solo admin)
app.delete(
  '/api/admin/usuarios/:id_usuario',
  autenticar,
  autorizarRol('admin'),
  async (req, res) => {
    try {
      const { id_usuario } = req.params;
      const idAdmin = req.usuario.id_usuario;

      // Para no romper tu sesión de admin en la demo
      if (Number(id_usuario) === idAdmin) {
        return res.status(400).json({
          ok: false,
          mensaje: 'No puedes eliminar tu propio usuario administrador.'
        });
      }

      // Verificar que exista
      const [rowsUsuario] = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
        [id_usuario]
      );

      if (rowsUsuario.length === 0) {
        return res
          .status(404)
          .json({ ok: false, mensaje: 'Usuario no encontrado.' });
      }

      // Guardar rutas de archivos para borrarlos físicamente después
      const [archivos] = await pool.query(
        'SELECT ruta_archivo FROM archivos_usuarios WHERE id_usuario = ?',
        [id_usuario]
      );

      // Borrar usuario (ON DELETE CASCADE eliminará registros_sueno y archivos_usuarios)
      await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [
        id_usuario
      ]);

      // Eliminar archivos físicos
      archivos.forEach((a) => {
        if (a.ruta_archivo) {
          const filePath = path.join(
            uploadsDir,
            path.basename(a.ruta_archivo)
          );
          fs.unlink(filePath, (err) => {
            if (err) {
              console.warn(
                'No se pudo eliminar archivo físico (posiblemente ya no existe):',
                err.message
              );
            }
          });
        }
      });

      res.json({
        ok: true,
        mensaje:
          'Usuario eliminado correctamente. También se eliminaron sus registros y archivos asociados.'
      });
    } catch (error) {
      console.error('Error en DELETE /api/admin/usuarios/:id_usuario:', error);
      res.status(500).json({
        ok: false,
        mensaje: 'Error interno al eliminar el usuario.'
      });
    }
  }
);

// =======================
// Rutas de REGISTROS DE SUEÑO (PROTEGIDAS)
// =======================

// Crear un registro de sueño
app.post('/api/registros', autenticar, async (req, res) => {
  try {
    const {
      fecha,
      hora_acostarse,
      hora_despertar,
      despertares_nocturnos,
      calidad,
      cafeina,
      pantallas_minutos,
      actividad_fisica,
      nota
    } = req.body;

    const id_usuario = req.usuario.id_usuario;

    if (!id_usuario || !fecha || !hora_acostarse || !hora_despertar) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Faltan datos obligatorios.' });
    }

    const desp = despertares_nocturnos ?? 0;
    const qual = calidad ?? 3;
    const caf = cafeina ?? 0;
    const pant = pantallas_minutos ?? 0;
    const act = actividad_fisica || 'baja';
    const notaTexto = nota && nota.trim() !== '' ? nota.trim() : null;

    const [resultado] = await pool.query(
      `INSERT INTO registros_sueno
      (id_usuario, fecha, hora_acostarse, hora_despertar,
       despertares_nocturnos, calidad, cafeina, pantallas_minutos, actividad_fisica, nota)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_usuario,
        fecha,
        hora_acostarse,
        hora_despertar,
        desp,
        qual,
        caf,
        pant,
        act,
        notaTexto
      ]
    );

    res.status(201).json({
      ok: true,
      mensaje: 'Registro de sueño creado correctamente.',
      id_registro: resultado.insertId
    });
  } catch (error) {
    console.error('Error en POST /api/registros:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno al crear el registro.' });
  }
});

// Obtener todos los registros de un usuario
app.get('/api/registros/:id_usuario', autenticar, async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const idToken = req.usuario.id_usuario;
    const rol = req.usuario.rol;

    if (rol !== 'admin' && Number(id_usuario) !== idToken) {
      return res
        .status(403)
        .json({ ok: false, mensaje: 'No puedes ver registros de otro usuario.' });
    }

    const [rows] = await pool.query(
      `SELECT
         id_registro,
         id_usuario,
         fecha,
         hora_acostarse,
         hora_despertar,
         despertares_nocturnos,
         calidad,
         cafeina,
         pantallas_minutos,
         actividad_fisica,
         nota,
         creado_en
       FROM registros_sueno
       WHERE id_usuario = ?
       ORDER BY fecha DESC, hora_acostarse DESC`,
      [id_usuario]
    );

    res.json({
      ok: true,
      registros: rows
    });
  } catch (error) {
    console.error('Error en GET /api/registros/:id_usuario:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno al obtener registros.' });
  }
});

// Actualizar un registro de sueño
app.put('/api/registros/:id_registro', autenticar, async (req, res) => {
  try {
    const { id_registro } = req.params;
    const {
      fecha,
      hora_acostarse,
      hora_despertar,
      despertares_nocturnos,
      calidad,
      cafeina,
      pantallas_minutos,
      actividad_fisica,
      nota
    } = req.body;

    const idUsuarioToken = req.usuario.id_usuario;
    const esAdmin = req.usuario.rol === 'admin';

    if (!fecha || !hora_acostarse || !hora_despertar) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Faltan datos obligatorios.' });
    }

    const desp = despertares_nocturnos ?? 0;
    const qual = calidad ?? 3;
    const caf = cafeina ?? 0;
    const pant = pantallas_minutos ?? 0;
    const act = actividad_fisica || 'baja';
    const notaTexto = nota && nota.trim() !== '' ? nota.trim() : null;

    let query = `
      UPDATE registros_sueno
      SET fecha = ?, hora_acostarse = ?, hora_despertar = ?,
          despertares_nocturnos = ?, calidad = ?, cafeina = ?, pantallas_minutos = ?, actividad_fisica = ?, nota = ?
      WHERE id_registro = ?
    `;
    const params = [
      fecha,
      hora_acostarse,
      hora_despertar,
      desp,
      qual,
      caf,
      pant,
      act,
      notaTexto,
      id_registro
    ];

    if (!esAdmin) {
      query += ' AND id_usuario = ?';
      params.push(idUsuarioToken);
    }

    const [resultado] = await pool.query(query, params);

    if (resultado.affectedRows === 0) {
      return res
        .status(404)
        .json({ ok: false, mensaje: 'Registro no encontrado o sin permiso.' });
    }

    res.json({
      ok: true,
      mensaje: 'Registro de sueño actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error en PUT /api/registros/:id_registro:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno al actualizar el registro.' });
  }
});

// Eliminar un registro de sueño
app.delete('/api/registros/:id_registro', autenticar, async (req, res) => {
  try {
    const { id_registro } = req.params;
    const idUsuarioToken = req.usuario.id_usuario;
    const esAdmin = req.usuario.rol === 'admin';

    let query = 'DELETE FROM registros_sueno WHERE id_registro = ?';
    const params = [id_registro];

    if (!esAdmin) {
      query += ' AND id_usuario = ?';
      params.push(idUsuarioToken);
    }

    const [resultado] = await pool.query(query, params);

    if (resultado.affectedRows === 0) {
      return res
        .status(404)
        .json({ ok: false, mensaje: 'Registro no encontrado o sin permiso.' });
    }

    res.json({
      ok: true,
      mensaje: 'Registro de sueño eliminado correctamente.'
    });
  } catch (error) {
    console.error('Error en DELETE /api/registros/:id_registro:', error);
    res
      .status(500)
      .json({ ok: false, mensaje: 'Error interno al eliminar el registro.' });
  }
});

// =======================
// Resumen de sueño
// =======================

app.get('/api/resumen/:id_usuario', autenticar, async (req, res) => {
  try {
    const { id_usuario } = req.params;
    let { dias } = req.query;

    const idToken = req.usuario.id_usuario;
    const rol = req.usuario.rol;

    if (rol !== 'admin' && Number(id_usuario) !== idToken) {
      return res
        .status(403)
        .json({ ok: false, mensaje: 'No puedes ver el resumen de otro usuario.' });
    }

    dias = parseInt(dias, 10);
    if (Number.isNaN(dias) || dias <= 0) {
      dias = 7;
    }

    const [rows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_registros,
        MIN(fecha) AS fecha_primera,
        MAX(fecha) AS fecha_ultima,
        AVG(
          CASE
            WHEN hora_despertar <= hora_acostarse
            THEN TIMESTAMPDIFF(
              MINUTE,
              CONCAT(fecha, ' ', hora_acostarse),
              DATE_ADD(CONCAT(fecha, ' ', hora_despertar), INTERVAL 1 DAY)
            )
            ELSE TIMESTAMPDIFF(
              MINUTE,
              CONCAT(fecha, ' ', hora_acostarse),
              CONCAT(fecha, ' ', hora_despertar)
            )
          END
        ) / 60 AS promedio_horas,
        AVG(calidad) AS promedio_calidad,
        SUM(cafeina) AS dias_con_cafeina,
        AVG(pantallas_minutos) AS promedio_pantallas,
        SUM(CASE WHEN actividad_fisica = 'baja' THEN 1 ELSE 0 END) AS dias_act_baja,
        SUM(CASE WHEN actividad_fisica = 'media' THEN 1 ELSE 0 END) AS dias_act_media,
        SUM(CASE WHEN actividad_fisica = 'alta' THEN 1 ELSE 0 END) AS dias_act_alta
      FROM registros_sueno
      WHERE id_usuario = ?
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY);
      `,
      [id_usuario, dias]
    );

    const resumen = rows[0];

    if (!resumen || resumen.total_registros === 0) {
      return res.json({
        ok: true,
        mensaje: 'Sin registros en el rango seleccionado.',
        resumen: null
      });
    }

    let actividadDominante = 'baja';
    let max = resumen.dias_act_baja || 0;

    if ((resumen.dias_act_media || 0) > max) {
      max = resumen.dias_act_media;
      actividadDominante = 'media';
    }

    if ((resumen.dias_act_alta || 0) > max) {
      actividadDominante = 'alta';
    }

    res.json({
      ok: true,
      resumen: {
        ...resumen,
        dias,
        actividad_dominante: actividadDominante
      }
    });
  } catch (error) {
    console.error('Error en GET /api/resumen/:id_usuario:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al obtener el resumen.'
    });
  }
});

// =======================
// EXPORTAR REGISTROS A CSV
// =======================

app.get('/api/export/registros', autenticar, async (req, res) => {
  try {
    const idToken = req.usuario.id_usuario;
    const rol = req.usuario.rol;
    let idUsuario = idToken;

    if (rol === 'admin' && req.query.id_usuario) {
      idUsuario = Number(req.query.id_usuario);
    }

    let { dias } = req.query;
    let filtroFecha = '';
    const params = [idUsuario];

    dias = parseInt(dias, 10);
    if (!Number.isNaN(dias) && dias > 0) {
      filtroFecha = ' AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
      params.push(dias);
    }

    const [rows] = await pool.query(
      `
      SELECT
        fecha,
        hora_acostarse,
        hora_despertar,
        despertares_nocturnos,
        calidad,
        cafeina,
        pantallas_minutos,
        actividad_fisica,
        nota
      FROM registros_sueno
      WHERE id_usuario = ?
      ${filtroFecha}
      ORDER BY fecha ASC, hora_acostarse ASC
      `,
      params
    );

    let csv =
      'fecha,hora_acostarse,hora_despertar,despertares_nocturnos,calidad,cafeina,pantallas_minutos,actividad_fisica,nota\n';

    rows.forEach((r) => {
      const fecha =
        r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha);
      const horaAc = String(r.hora_acostarse || '').slice(0, 8);
      const horaDes = String(r.hora_despertar || '').slice(0, 8);
      const desp = r.despertares_nocturnos ?? 0;
      const calidad = r.calidad ?? '';
      const caf = r.cafeina ?? 0;
      const pant = r.pantallas_minutos ?? 0;
      const act = r.actividad_fisica || '';
      const nota = (r.nota || '').replace(/"/g, '""');

      csv += `${fecha},${horaAc},${horaDes},${desp},${calidad},${caf},${pant},${act},"${nota}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="registros_sueno_usuario_${idUsuario}.csv"`
    );

    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error en GET /api/export/registros:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al exportar registros.'
    });
  }
});

// =======================
// Rutas de ARCHIVOS (PDF / Excel)
// =======================

app.post(
  '/api/archivos',
  autenticar,
  upload.single('archivo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          mensaje:
            'No se recibió archivo o el tipo no está permitido (solo PDF o Excel/CSV).'
        });
      }

      const id_usuario = req.usuario.id_usuario;
      const nombreOriginal = req.file.originalname;
      const rutaRelativa = '/uploads/' + req.file.filename;
      const mime = req.file.mimetype;

      let tipo_archivo = 'otro';
      if (mime === 'application/pdf') tipo_archivo = 'pdf';
      else if (
        mime === 'application/vnd.ms-excel' ||
        mime ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'text/csv'
      )
        tipo_archivo = 'excel';

      const [resultado] = await pool.query(
        `INSERT INTO archivos_usuarios (id_usuario, tipo_archivo, nombre_archivo, ruta_archivo)
         VALUES (?, ?, ?, ?)`,
        [id_usuario, tipo_archivo, nombreOriginal, rutaRelativa]
      );

      res.status(201).json({
        ok: true,
        mensaje: 'Archivo subido correctamente.',
        archivo: {
          id_archivo: resultado.insertId,
          id_usuario,
          tipo_archivo,
          nombre_archivo: nombreOriginal,
          ruta_archivo: rutaRelativa
        }
      });
    } catch (error) {
      console.error('Error en POST /api/archivos:', error);
      res.status(500).json({
        ok: false,
        mensaje: 'Error interno al subir el archivo.'
      });
    }
  }
);

app.get('/api/archivos', autenticar, async (req, res) => {
  try {
    const rol = req.usuario.rol;
    let id_usuario = req.usuario.id_usuario;

    if (rol === 'admin' && req.query.id_usuario) {
      id_usuario = Number(req.query.id_usuario);
    }

    const [rows] = await pool.query(
      `SELECT id_archivo, id_usuario, tipo_archivo, nombre_archivo, ruta_archivo, subido_en
       FROM archivos_usuarios
       WHERE id_usuario = ?
       ORDER BY subido_en DESC`,
      [id_usuario]
    );

    res.json({ ok: true, archivos: rows });
  } catch (error) {
    console.error('Error en GET /api/archivos:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al obtener archivos.'
    });
  }
});

app.delete('/api/archivos/:id_archivo', autenticar, async (req, res) => {
  try {
    const { id_archivo } = req.params;
    const idToken = req.usuario.id_usuario;
    const esAdmin = req.usuario.rol === 'admin';

    const [rows] = await pool.query(
      'SELECT id_usuario, ruta_archivo FROM archivos_usuarios WHERE id_archivo = ?',
      [id_archivo]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, mensaje: 'Archivo no encontrado.' });
    }

    const archivo = rows[0];

    if (!esAdmin && archivo.id_usuario !== idToken) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permiso para eliminar este archivo.'
      });
    }

    await pool.query('DELETE FROM archivos_usuarios WHERE id_archivo = ?', [
      id_archivo
    ]);

    if (archivo.ruta_archivo) {
      const filePath = path.join(
        uploadsDir,
        path.basename(archivo.ruta_archivo)
      );
      fs.unlink(filePath, (err) => {
        if (err) {
          console.warn(
            'No se pudo eliminar archivo físico (posiblemente ya no existe):',
            err.message
          );
        }
      });
    }

    res.json({
      ok: true,
      mensaje: 'Archivo eliminado correctamente.'
    });
  } catch (error) {
    console.error('Error en DELETE /api/archivos/:id_archivo:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno al eliminar el archivo.'
    });
  }
});

// =======================
// Arrancar servidor
// =======================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

module.exports = { app, pool };
