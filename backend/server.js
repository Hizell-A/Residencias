// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware para aceptar peticiones del frontend
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// MIDDLEWARE DE VERIFICACIÓN DE SESIÓN (SSO JWT a través de Cookie HTTP-Only)
const verificarAccesoOrtopedia = async (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar si el usuario tiene el acceso requerido ("ortopedia")
        const roles = decoded.roles || decoded.rol;
        let hasAccess = false;

        if (Array.isArray(roles)) {
            hasAccess = roles.includes('ortopedia');
        } else if (typeof roles === 'string') {
            hasAccess = roles.split(',').map(r => r.trim()).includes('ortopedia');
        }

        if (!hasAccess) {
            return res.status(403).json({ error: 'Acceso denegado: se requiere el rol ortopedia' });
        }

        // Inyectar los datos decodificados del token en la petición
        req.usuario = decoded;

        // Upsert en la tabla usuarios local
        const id_usuario = decoded.id_usuario || decoded.id;
        if (!id_usuario) {
            return res.status(400).json({ error: 'El token de acceso no contiene un identificador de usuario válido' });
        }

        const nombre = decoded.nombre || decoded.name || 'Usuario SSO';
        const correo = decoded.correo || decoded.email || '';
        const rol = decoded.rol || (Array.isArray(decoded.roles) ? decoded.roles.join(',') : '') || 'operador';

        // Buscar si el id_usuario existe localmente
        const existeUsuario = await db.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [id_usuario]);
        if (existeUsuario.rows.length === 0) {
            // INSERT (utilizando valores seguros para campos no nulos requeridos por la base de datos)
            await db.query(
                `INSERT INTO usuarios (id_usuario, nombre, correo, password_hash, rol, verificado) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id_usuario, nombre, correo, 'sso_login_dummy_hash', rol, true]
            );
        } else {
            // UPDATE
            await db.query(
                `UPDATE usuarios 
                 SET nombre = $1, correo = $2, rol = $3 
                 WHERE id_usuario = $4`,
                [nombre, correo, rol, id_usuario]
            );
        }

        next();
    } catch (error) {
        console.error('Error de verificación JWT/SSO:', error);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ENDPOINT DE ESTADO DE AUTENTICACIÓN
app.get('/auth/status', verificarAccesoOrtopedia, (req, res) => {
    res.json({ authenticated: true, usuario: req.usuario });
});

// ENDPOINT DE LOGOUT (Borrar Cookie HTTP-Only)
app.post('/auth/logout', (req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: false, // Cambiar a true en producción si se utiliza HTTPS
        sameSite: 'lax',
        path: '/'
    });
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// APLICAR PROTECCIÓN A TODOS LOS ENDPOINTS DE LA APLICACIÓN
app.use('/usuarios', verificarAccesoOrtopedia);
app.use('/inventario', verificarAccesoOrtopedia);
app.use('/beneficiarios', verificarAccesoOrtopedia);
app.use('/prestamos', verificarAccesoOrtopedia);
app.use('/devoluciones', verificarAccesoOrtopedia);
app.use('/reportes', verificarAccesoOrtopedia);
app.use('/dashboard', verificarAccesoOrtopedia);
app.use('/categorias', verificarAccesoOrtopedia);

// OBTENER TODOS LOS USUARIOS (GET /usuarios)
app.get('/usuarios', async (req, res) => {
    try {
        const resultado = await db.query('SELECT id_usuario, nombre, correo, rol, activo FROM usuarios ORDER BY id_usuario ASC');
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// ACTUALIZAR USUARIO (PUT /usuarios/:id)
app.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, rol } = req.body;
    try {
        const resultado = await db.query(
            `UPDATE usuarios 
             SET nombre = COALESCE($1, nombre),
                 correo = COALESCE($2, correo),
                 rol = COALESCE($3, rol)
             WHERE id_usuario = $4 
             RETURNING id_usuario, nombre, correo, rol, activo`,
            [nombre, correo, rol, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: 'Usuario actualizado exitosamente', usuario: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// CAMBIAR ESTADO DE USUARIO (PUT /usuarios/:id/estado)
app.put('/usuarios/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE usuarios SET activo = $1 WHERE id_usuario = $2 RETURNING id_usuario, nombre, correo, rol, activo",
            [activo, id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: 'Estado actualizado', usuario: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado del usuario' });
    }
});

// RESTABLECER CONTRASEÑA DE USUARIO (PUT /usuarios/:id/password)
app.put('/usuarios/:id/password', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ error: 'La nueva contraseña es requerida' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const resultado = await db.query(
            "UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2 RETURNING id_usuario",
            [passwordHash, id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la contraseña' });
    }
});

// BITÁCORA DEL USUARIO (GET /usuarios/:id/actividad)
app.get('/usuarios/:id/actividad', async (req, res) => {
    const { id } = req.params;
    try {
        const prestamosRes = await db.query(
            "SELECT COUNT(*) AS total FROM prestamos WHERE id_usuario_autoriza = $1 AND EXTRACT(MONTH FROM fecha_prestamo) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_prestamo) = EXTRACT(YEAR FROM CURRENT_DATE)",
            [id]
        );
        const devolucionesRes = await db.query(
            "SELECT COUNT(*) AS total FROM devoluciones WHERE id_usuario_recibe = $1 AND EXTRACT(MONTH FROM fecha_devolucion) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_devolucion) = EXTRACT(YEAR FROM CURRENT_DATE)",
            [id]
        );
        res.json({
            prestamos_mes: parseInt(prestamosRes.rows[0].total, 10),
            devoluciones_mes: parseInt(devolucionesRes.rows[0].total, 10)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la actividad del usuario' });
    }
});

// ==========================================
// RUTAS DE INVENTARIO (CRUD)
// ==========================================

// OBTENER TODOS LOS ARTÍCULOS (GET /inventario)
app.get('/inventario', async (req, res) => {
    try {
        const queryText = `
            SELECT 
                i.*,
                g.imagen_binaria
            FROM inventario i
            LEFT JOIN galeria_imagenes g ON i.id_imagen_previsualizacion = g.id
            ORDER BY i.id_articulo ASC
        `;
        const resultado = await db.query(queryText);
        const rows = resultado.rows.map(row => ({
            id_articulo: row.id_articulo,
            codigo_articulo: row.codigo_articulo,
            nombre: row.nombre,
            descripcion: row.descripcion,
            categoria: row.categoria,
            cantidad_total: row.cantidad_total,
            cantidad_disponible: row.cantidad_disponible,
            estado_fisico: row.estado_fisico,
            fecha_ingreso: row.fecha_ingreso,
            id_imagen_previsualizacion: row.id_imagen_previsualizacion,
            imagen_url: row.imagen_binaria ? row.imagen_binaria.toString('utf-8') : null
        }));
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// AGREGAR NUEVO ARTÍCULO (POST /inventario)
app.post('/inventario', async (req, res) => {
    const { nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado_fisico, imagen_url } = req.body;
    try {
        // 1. Obtener la abreviación de la categoría
        const catRes = await db.query('SELECT abreviacion FROM categorias WHERE categoria = $1', [categoria]);
        let abbr = 'ART'; // fallback
        if (catRes.rows.length > 0) {
            abbr = catRes.rows[0].abreviacion;
        } else {
            // Si la categoría no existe en la base de datos (por ejemplo, si es una por defecto inicial)
            // podemos extraer la primera letra de cada palabra o las dos primeras letras como abreviatura rápida
            const cleanCat = (categoria || '').trim().toUpperCase();
            if (cleanCat.length > 0) {
                const words = cleanCat.split(' ');
                if (words.length >= 2) {
                    abbr = words[0][0] + words[1][0];
                } else {
                    abbr = cleanCat.slice(0, 2);
                }
            }
        }

        // 2. Buscar todos los códigos de artículos que empiecen con "ABBR-"
        const existingCodesRes = await db.query(
            "SELECT codigo_articulo FROM inventario WHERE codigo_articulo LIKE $1",
            [`${abbr}-%`]
        );
        
        let maxNum = 0;
        for (const row of existingCodesRes.rows) {
            const parts = row.codigo_articulo.split('-');
            const numPart = parts[parts.length - 1];
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }

        // 3. Generar el código secuencial (maxNum + 1)
        const nextNum = maxNum + 1;
        const codigo_articulo = `${abbr}-${String(nextNum).padStart(3, '0')}`;

        // 4. Guardar la imagen en galeria_imagenes si existe
        let id_imagen_previsualizacion = null;
        if (imagen_url && imagen_url.trim() !== '') {
            const buffer = Buffer.from(imagen_url, 'utf-8');
            let mimeType = 'image/png';
            const match = imagen_url.match(/^data:([^;]+);base64,/);
            if (match) {
                mimeType = match[1];
            }
            const resGaleria = await db.query(
                `INSERT INTO galeria_imagenes (nombre_archivo, tipo_mime, imagen_binaria)
                 VALUES ($1, $2, $3) RETURNING id`,
                [`preview_${codigo_articulo.toLowerCase()}.png`, mimeType, buffer]
            );
            id_imagen_previsualizacion = resGaleria.rows[0].id;
        }

        const resultado = await db.query(
            `INSERT INTO inventario 
             (codigo_articulo, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado_fisico, id_imagen_previsualizacion) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [codigo_articulo, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado_fisico || 'Bueno', id_imagen_previsualizacion]
        );
        
        const articulo = resultado.rows[0];
        articulo.imagen_url = imagen_url;

        res.status(201).json({ mensaje: 'Artículo agregado exitosamente', articulo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar el artículo' });
    }
});

// ACTUALIZAR ARTÍCULO (PUT /inventario/:id)
app.put('/inventario/:id', async (req, res) => {
    const { id } = req.params;
    const { codigo_articulo, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado_fisico, imagen_url } = req.body;
    try {
        // 1. Obtener los datos actuales del artículo (para verificar la imagen vieja)
        const artActualRes = await db.query(
            'SELECT id_imagen_previsualizacion, codigo_articulo FROM inventario WHERE id_articulo = $1',
            [id]
        );
        if (artActualRes.rows.length === 0) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }
        
        const oldImageId = artActualRes.rows[0].id_imagen_previsualizacion;
        const currentCode = artActualRes.rows[0].codigo_articulo;
        let id_imagen_previsualizacion = oldImageId;

        // 2. Si se envió la propiedad imagen_url, evaluar cambios
        if (req.body.hasOwnProperty('imagen_url')) {
            let oldImageUrl = null;
            if (oldImageId) {
                const oldImgRes = await db.query('SELECT imagen_binaria FROM galeria_imagenes WHERE id = $1', [oldImageId]);
                if (oldImgRes.rows.length > 0) {
                    oldImageUrl = oldImgRes.rows[0].imagen_binaria.toString('utf-8');
                }
            }

            if (imagen_url !== oldImageUrl) {
                if (imagen_url && imagen_url.trim() !== '') {
                    // Es una imagen nueva -> Insertar
                    const buffer = Buffer.from(imagen_url, 'utf-8');
                    let mimeType = 'image/png';
                    const match = imagen_url.match(/^data:([^;]+);base64,/);
                    if (match) {
                        mimeType = match[1];
                    }
                    const resGaleria = await db.query(
                        `INSERT INTO galeria_imagenes (nombre_archivo, tipo_mime, imagen_binaria)
                         VALUES ($1, $2, $3) RETURNING id`,
                        [`preview_${(codigo_articulo || currentCode).toLowerCase()}.png`, mimeType, buffer]
                    );
                    id_imagen_previsualizacion = resGaleria.rows[0].id;
                } else {
                    // La imagen fue removida
                    id_imagen_previsualizacion = null;
                }
            }
        }

        // 3. Ejecutar actualización del artículo
        const resultado = await db.query(
            `UPDATE inventario 
             SET codigo_articulo = COALESCE($1, codigo_articulo),
                 nombre = COALESCE($2, nombre),
                 descripcion = COALESCE($3, descripcion),
                 categoria = COALESCE($4, categoria),
                 cantidad_total = COALESCE($5, cantidad_total),
                 cantidad_disponible = COALESCE($6, cantidad_disponible),
                 estado_fisico = COALESCE($7, estado_fisico),
                 id_imagen_previsualizacion = $8
             WHERE id_articulo = $9 
             RETURNING *`,
            [codigo_articulo, nombre, descripcion, categoria, cantidad_total, cantidad_disponible, estado_fisico, id_imagen_previsualizacion, id]
        );

        const articuloActualizado = resultado.rows[0];
        
        // 4. Si la imagen cambió y había una imagen previa, eliminarla de la galería
        if (req.body.hasOwnProperty('imagen_url')) {
            let oldImageUrl = null;
            if (oldImageId) {
                const oldImgRes = await db.query('SELECT imagen_binaria FROM galeria_imagenes WHERE id = $1', [oldImageId]);
                if (oldImgRes.rows.length > 0) {
                    oldImageUrl = oldImgRes.rows[0].imagen_binaria.toString('utf-8');
                }
            }
            if (imagen_url !== oldImageUrl && oldImageId) {
                await db.query('DELETE FROM galeria_imagenes WHERE id = $1', [oldImageId]);
            }
        }

        articuloActualizado.imagen_url = imagen_url;

        res.json({ mensaje: 'Artículo actualizado exitosamente', articulo: articuloActualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el artículo' });
    }
});

// ELIMINAR ARTÍCULO (DELETE /inventario/:id)
app.delete('/inventario/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await db.query("UPDATE inventario SET estado_fisico = 'Baja' WHERE id_articulo = $1", [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }
        res.json({ mensaje: 'Artículo eliminado exitosamente', articulo: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el artículo' });
    }
});

// ==========================================
// RUTAS DE BENEFICIARIOS
// ==========================================

// Función auxiliar para obtener un beneficiario con la información de su identificación oficial desde la galería
async function obtenerBeneficiarioCompleto(id) {
    const queryText = `
        SELECT 
            b.id_beneficiario,
            b.nombre_completo,
            b.identificacion,
            b.telefono,
            b.correo,
            b.direccion,
            b.fecha_registro,
            b.id_imagen_identificacion,
            g.nombre_archivo AS identificacion_archivo_nombre,
            g.tipo_mime AS identificacion_archivo_tipo,
            g.imagen_binaria
        FROM beneficiarios b
        LEFT JOIN galeria_imagenes g ON b.id_imagen_identificacion = g.id
        WHERE b.id_beneficiario = $1
    `;
    const res = await db.query(queryText, [id]);
    if (res.rows.length === 0) return null;
    
    const row = res.rows[0];
    return {
        id_beneficiario: row.id_beneficiario,
        nombre_completo: row.nombre_completo,
        identificacion: row.identificacion,
        telefono: row.telefono,
        correo: row.correo,
        direccion: row.direccion,
        fecha_registro: row.fecha_registro,
        id_imagen_identificacion: row.id_imagen_identificacion,
        identificacion_archivo_nombre: row.identificacion_archivo_nombre,
        identificacion_archivo_tipo: row.identificacion_archivo_tipo,
        identificacion_archivo_url: row.imagen_binaria ? row.imagen_binaria.toString('utf-8') : null
    };
}

// OBTENER TODOS LOS BENEFICIARIOS (GET /beneficiarios)
app.get('/beneficiarios', async (req, res) => {
    try {
        const queryText = `
            SELECT 
                b.id_beneficiario,
                b.nombre_completo,
                b.identificacion,
                b.telefono,
                b.correo,
                b.direccion,
                b.fecha_registro,
                b.id_imagen_identificacion,
                g.nombre_archivo AS identificacion_archivo_nombre,
                g.tipo_mime AS identificacion_archivo_tipo,
                g.imagen_binaria
            FROM beneficiarios b
            LEFT JOIN galeria_imagenes g ON b.id_imagen_identificacion = g.id
            ORDER BY b.id_beneficiario ASC
        `;
        const resultado = await db.query(queryText);
        const rows = resultado.rows.map(row => ({
            id_beneficiario: row.id_beneficiario,
            nombre_completo: row.nombre_completo,
            identificacion: row.identificacion,
            telefono: row.telefono,
            correo: row.correo,
            direccion: row.direccion,
            fecha_registro: row.fecha_registro,
            id_imagen_identificacion: row.id_imagen_identificacion,
            identificacion_archivo_nombre: row.identificacion_archivo_nombre,
            identificacion_archivo_tipo: row.identificacion_archivo_tipo,
            identificacion_archivo_url: row.imagen_binaria ? row.imagen_binaria.toString('utf-8') : null
        }));
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los beneficiarios' });
    }
});

// AGREGAR NUEVO BENEFICIARIO (POST /beneficiarios)
app.post('/beneficiarios', async (req, res) => {
    const { 
        nombre_completo, 
        identificacion, 
        telefono, 
        correo, 
        direccion, 
        identificacion_archivo_nombre, 
        identificacion_archivo_tipo, 
        identificacion_archivo_url 
    } = req.body;
    try {
        // Validación de Identificación Única
        const existe = await db.query('SELECT id_beneficiario FROM beneficiarios WHERE identificacion = $1', [identificacion]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Este usuario ya está registrado' });
        }

        let id_imagen_identificacion = null;
        if (identificacion_archivo_url) {
            const buffer = Buffer.from(identificacion_archivo_url, 'utf-8');
            const resGaleria = await db.query(
                `INSERT INTO galeria_imagenes (nombre_archivo, tipo_mime, imagen_binaria)
                 VALUES ($1, $2, $3) RETURNING id`,
                [identificacion_archivo_nombre || 'identificacion_ine.png', identificacion_archivo_tipo || 'image/png', buffer]
            );
            id_imagen_identificacion = resGaleria.rows[0].id;
        }

        const resultado = await db.query(
            `INSERT INTO beneficiarios 
             (nombre_completo, identificacion, telefono, correo, direccion, id_imagen_identificacion) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id_beneficiario`,
            [nombre_completo, identificacion, telefono, correo, direccion, id_imagen_identificacion]
        );

        const nuevoBeneficiario = await obtenerBeneficiarioCompleto(resultado.rows[0].id_beneficiario);
        res.status(201).json({ mensaje: 'Beneficiario agregado exitosamente', beneficiario: nuevoBeneficiario });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // Postgres Unique Violation
            return res.status(400).json({ error: 'Este usuario ya está registrado' });
        }
        res.status(500).json({ error: 'Error al agregar el beneficiario' });
    }
});

// ACTUALIZAR BENEFICIARIO (PUT /beneficiarios/:id)
app.put('/beneficiarios/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        nombre_completo, 
        identificacion, 
        telefono, 
        correo, 
        direccion, 
        identificacion_archivo_nombre, 
        identificacion_archivo_tipo, 
        identificacion_archivo_url 
    } = req.body;
    try {
        // Verificar si la nueva identificación ya pertenece a otro usuario
        if (identificacion) {
            const existe = await db.query('SELECT id_beneficiario FROM beneficiarios WHERE identificacion = $1 AND id_beneficiario != $2', [identificacion, id]);
            if (existe.rows.length > 0) {
                return res.status(400).json({ error: 'Este usuario ya está registrado con la misma identificación' });
            }
        }

        // Obtener la imagen actual para detectar cambios y evitar duplicados o registros huérfanos
        const actualRes = await db.query(
            `SELECT b.id_imagen_identificacion, g.imagen_binaria 
             FROM beneficiarios b 
             LEFT JOIN galeria_imagenes g ON b.id_imagen_identificacion = g.id 
             WHERE b.id_beneficiario = $1`,
            [id]
        );

        if (actualRes.rows.length === 0) {
            return res.status(404).json({ error: 'Beneficiario no encontrado' });
        }

        const oldImageId = actualRes.rows[0].id_imagen_identificacion;
        const oldImageBuffer = actualRes.rows[0].imagen_binaria;
        const oldImageUrl = oldImageBuffer ? oldImageBuffer.toString('utf-8') : null;

        let id_imagen_identificacion = oldImageId;

        // Si se envió la propiedad de la URL del archivo, evaluar si cambió
        if (req.body.hasOwnProperty('identificacion_archivo_url')) {
            if (identificacion_archivo_url !== oldImageUrl) {
                if (identificacion_archivo_url) {
                    // Es un archivo nuevo -> Insertar en la tabla galeria_imagenes
                    const buffer = Buffer.from(identificacion_archivo_url, 'utf-8');
                    const resGaleria = await db.query(
                        `INSERT INTO galeria_imagenes (nombre_archivo, tipo_mime, imagen_binaria)
                         VALUES ($1, $2, $3) RETURNING id`,
                        [identificacion_archivo_nombre || 'identificacion_ine.png', identificacion_archivo_tipo || 'image/png', buffer]
                    );
                    id_imagen_identificacion = resGaleria.rows[0].id;
                } else {
                    // El archivo fue removido
                    id_imagen_identificacion = null;
                }
            }
        }

        const queryParams = [nombre_completo, identificacion, telefono, correo, direccion, id_imagen_identificacion, id];
        const queryText = `
            UPDATE beneficiarios 
            SET nombre_completo = COALESCE($1, nombre_completo),
                identificacion = COALESCE($2, identificacion),
                telefono = COALESCE($3, telefono),
                correo = COALESCE($4, correo),
                direccion = COALESCE($5, direccion),
                id_imagen_identificacion = $6
            WHERE id_beneficiario = $7 
            RETURNING *
        `;

        await db.query(queryText, queryParams);

        // Si la imagen cambió y había una imagen previa, eliminarla de la galería
        if (req.body.hasOwnProperty('identificacion_archivo_url') && identificacion_archivo_url !== oldImageUrl && oldImageId) {
            await db.query('DELETE FROM galeria_imagenes WHERE id = $1', [oldImageId]);
        }

        const beneficiarioActualizado = await obtenerBeneficiarioCompleto(id);
        res.json({ mensaje: 'Beneficiario actualizado exitosamente', beneficiario: beneficiarioActualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el beneficiario' });
    }
});

// ELIMINAR BENEFICIARIO (DELETE /beneficiarios/:id)
app.delete('/beneficiarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Verificar si tiene historial de préstamos (llave foránea)
        const prestamos = await db.query('SELECT id_prestamo FROM prestamos WHERE id_beneficiario = $1 LIMIT 1', [id]);
        if (prestamos.rows.length > 0) {
            return res.status(400).json({ error: 'No se puede eliminar: El beneficiario tiene un historial de préstamos.' });
        }

        const resultado = await db.query('DELETE FROM beneficiarios WHERE id_beneficiario = $1 RETURNING *', [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Beneficiario no encontrado' });
        }

        // Si el beneficiario tenía una imagen en la galería, limpiarla también de galeria_imagenes
        const oldImageId = resultado.rows[0].id_imagen_identificacion;
        if (oldImageId) {
            await db.query('DELETE FROM galeria_imagenes WHERE id = $1', [oldImageId]);
        }

        res.json({ mensaje: 'Beneficiario eliminado exitosamente', beneficiario: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el beneficiario. Verifique que no tenga dependencias.' });
    }
});

// ==========================================
// RUTAS DE PRÉSTAMOS
// ==========================================

// OBTENER TODOS LOS PRÉSTAMOS (GET /prestamos)
app.get('/prestamos', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id_prestamo,
                p.fecha_prestamo,
                p.fecha_limite_devolucion,
                p.estado_prestamo,
                p.observaciones,
                i.nombre AS nombre_articulo,
                b.nombre_completo AS nombre_beneficiario,
                b.id_beneficiario
            FROM prestamos p
            JOIN inventario i ON p.id_articulo = i.id_articulo
            JOIN beneficiarios b ON p.id_beneficiario = b.id_beneficiario
            ORDER BY p.fecha_prestamo DESC
        `;
        const resultado = await db.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los préstamos' });
    }
});

app.post('/prestamos', async (req, res) => {
    // La base de datos asume 1 artículo por registro de préstamo, así que se restará 1 unidad.
    const { id_articulo, id_beneficiario, id_usuario_autoriza, fecha_limite_devolucion, observaciones } = req.body;

    const cliente = await db.connect();
    try {
        await cliente.query('BEGIN'); // Iniciar transacción

        // 1. Verificar stock
        const art = await cliente.query('SELECT cantidad_disponible FROM inventario WHERE id_articulo = $1', [id_articulo]);
        if (art.rows.length === 0) throw new Error('Artículo no encontrado');
        if (art.rows[0].cantidad_disponible < 1) throw new Error('Stock insuficiente para realizar el préstamo');

        // 2. Descontar 1 unidad del inventario
        await cliente.query('UPDATE inventario SET cantidad_disponible = cantidad_disponible - 1 WHERE id_articulo = $1', [id_articulo]);

        // 3. Registrar préstamo
        const prestamo = await cliente.query(
            `INSERT INTO prestamos (id_articulo, id_beneficiario, id_usuario_autoriza, fecha_limite_devolucion, observaciones)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_articulo, id_beneficiario, id_usuario_autoriza || 1, fecha_limite_devolucion, observaciones]
        );

        await cliente.query('COMMIT'); // Confirmar cambios
        res.status(201).json({ mensaje: 'Préstamo registrado y stock descontado exitosamente', prestamo: prestamo.rows[0] });
    } catch (error) {
        await cliente.query('ROLLBACK'); // Revertir en caso de error
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al registrar el préstamo' });
    } finally {
        cliente.release(); // Liberar conexión al pool
    }
});

// CANCELAR PRÉSTAMO (PUT /prestamos/:id/cancelar)
app.put('/prestamos/:id/cancelar', async (req, res) => {
    const { id } = req.params;
    const cliente = await db.connect();
    try {
        await cliente.query('BEGIN'); // Iniciar transacción

        // 1. Verificar si el préstamo está activo
        const prestamo = await cliente.query('SELECT * FROM prestamos WHERE id_prestamo = $1 AND estado_prestamo = $2', [id, 'Activo']);
        if (prestamo.rows.length === 0) throw new Error('El préstamo no se encontró o no está Activo');

        const id_articulo = prestamo.rows[0].id_articulo;

        // 2. Cambiar estado a Cancelado
        await cliente.query("UPDATE prestamos SET estado_prestamo = 'Cancelado' WHERE id_prestamo = $1", [id]);

        // 3. Devolver el stock
        await cliente.query('UPDATE inventario SET cantidad_disponible = cantidad_disponible + 1 WHERE id_articulo = $1', [id_articulo]);

        await cliente.query('COMMIT');
        res.json({ mensaje: 'Préstamo cancelado exitosamente' });
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al cancelar el préstamo' });
    } finally {
        cliente.release();
    }
});

// ==========================================
// RUTAS DE DEVOLUCIONES
// ==========================================

// OBTENER HISTORIAL DE DEVOLUCIONES (GET /devoluciones)
app.get('/devoluciones', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.id_devolucion,
                d.fecha_devolucion,
                d.estado_fisico_recibido,
                d.multa_o_cargo,
                d.observaciones AS observaciones_devolucion,
                p.id_prestamo,
                p.fecha_prestamo,
                p.fecha_limite_devolucion,
                i.nombre AS nombre_articulo,
                b.nombre_completo AS nombre_beneficiario
            FROM devoluciones d
            JOIN prestamos p ON d.id_prestamo = p.id_prestamo
            JOIN inventario i ON p.id_articulo = i.id_articulo
            JOIN beneficiarios b ON p.id_beneficiario = b.id_beneficiario
            ORDER BY d.fecha_devolucion DESC
        `;
        
        const resultado = await db.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las devoluciones' });
    }
});

app.post('/devoluciones', async (req, res) => {
    const { id_prestamo, id_usuario_recibe, estado_fisico_recibido, multa_o_cargo, observaciones } = req.body;

    const cliente = await db.connect();
    try {
        await cliente.query('BEGIN'); // Iniciar transacción

        // 1. Verificar que el préstamo exista y esté activo
        const prestamo = await cliente.query('SELECT * FROM prestamos WHERE id_prestamo = $1 AND estado_prestamo = $2', [id_prestamo, 'Activo']);
        if (prestamo.rows.length === 0) throw new Error('Préstamo no encontrado o ya fue devuelto');
        
        const id_articulo = prestamo.rows[0].id_articulo;

        // 2. Cambiar estado del préstamo a Devuelto
        await cliente.query('UPDATE prestamos SET estado_prestamo = $1 WHERE id_prestamo = $2', ['Devuelto', id_prestamo]);

        // 3. Registrar la devolución
        const devolucion = await cliente.query(
            `INSERT INTO devoluciones (id_prestamo, id_usuario_recibe, estado_fisico_recibido, multa_o_cargo, observaciones)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_prestamo, id_usuario_recibe || 1, estado_fisico_recibido, multa_o_cargo || 0, observaciones]
        );

        // 4. Devolver 1 unidad al inventario y actualizar su estado físico
        await cliente.query(
            'UPDATE inventario SET cantidad_disponible = cantidad_disponible + 1, estado_fisico = $1 WHERE id_articulo = $2', 
            [estado_fisico_recibido, id_articulo]
        );

        await cliente.query('COMMIT'); // Confirmar cambios
        res.status(201).json({ mensaje: 'Devolución registrada y stock restaurado exitosamente', devolucion: devolucion.rows[0] });
    } catch (error) {
        await cliente.query('ROLLBACK'); // Revertir cambios
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al registrar la devolución' });
    } finally {
        cliente.release();
    }
});

// ==========================================
// RUTAS DE REPORTES
// ==========================================

// RESUMEN DE KPIs (GET /reportes/resumen)
app.get('/reportes/resumen', async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        // Total de aparatos (suma de todas las cantidades totales)
        const totalAparatosRes = await db.query('SELECT COALESCE(SUM(cantidad_total), 0) AS total FROM inventario');
        
        // Total de préstamos activos
        let prestadosQuery = "SELECT COUNT(*) AS total FROM prestamos WHERE estado_prestamo = 'Activo'";
        const prestadosValues = [];
        if (fechaInicio && fechaFin) {
            prestadosQuery += " AND fecha_prestamo >= $1 AND fecha_prestamo <= $2";
            prestadosValues.push(fechaInicio, fechaFin);
        }
        const prestadosRes = await db.query(prestadosQuery, prestadosValues);
        
        // Devoluciones atrasadas (préstamos activos con fecha límite pasada)
        let atrasadasQuery = "SELECT COUNT(*) AS total FROM prestamos WHERE estado_prestamo = 'Activo' AND fecha_limite_devolucion < CURRENT_DATE";
        const atrasadasValues = [];
        if (fechaInicio && fechaFin) {
            atrasadasQuery += " AND fecha_prestamo >= $1 AND fecha_prestamo <= $2";
            atrasadasValues.push(fechaInicio, fechaFin);
        }
        const atrasadasRes = await db.query(atrasadasQuery, atrasadasValues);
        
        // Aparatos en mantenimiento
        const mantenimientoRes = await db.query("SELECT COALESCE(SUM(cantidad_total), 0) AS total FROM inventario WHERE estado_fisico = 'Mantenimiento' OR estado_fisico = 'Reparación'");

        res.json({
            total_aparatos: parseInt(totalAparatosRes.rows[0].total, 10),
            total_prestados: parseInt(prestadosRes.rows[0].total, 10),
            devoluciones_atrasadas: parseInt(atrasadasRes.rows[0].total, 10),
            en_mantenimiento: parseInt(mantenimientoRes.rows[0].total, 10)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el resumen de reportes' });
    }
});

// ACTIVIDAD RECIENTE (GET /dashboard/actividad)
app.get('/dashboard/actividad', async (req, res) => {
    try {
        const query = `
            SELECT * FROM (
                (SELECT 
                    'prestamo' AS tipo,
                    p.id_prestamo AS id,
                    p.fecha_prestamo AS fecha,
                    i.nombre AS aparato,
                    b.nombre_completo AS usuario
                FROM prestamos p
                JOIN inventario i ON p.id_articulo = i.id_articulo
                JOIN beneficiarios b ON p.id_beneficiario = b.id_beneficiario
                ORDER BY p.fecha_prestamo DESC LIMIT 5)
                UNION ALL
                (SELECT 
                    'devolucion' AS tipo,
                    d.id_devolucion AS id,
                    d.fecha_devolucion AS fecha,
                    i.nombre AS aparato,
                    b.nombre_completo AS usuario
                FROM devoluciones d
                JOIN prestamos p ON d.id_prestamo = p.id_prestamo
                JOIN inventario i ON p.id_articulo = i.id_articulo
                JOIN beneficiarios b ON p.id_beneficiario = b.id_beneficiario
                ORDER BY d.fecha_devolucion DESC LIMIT 5)
            ) as combined_activity
            ORDER BY fecha DESC
        `;
        const resultado = await db.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la actividad reciente' });
    }
});


// STOCK CRÍTICO (GET /dashboard/stock-critico)
app.get('/dashboard/stock-critico', async (req, res) => {
    try {
        const query = `
            SELECT id_articulo, nombre, cantidad_disponible 
            FROM inventario 
            WHERE cantidad_disponible <= 2 AND estado_fisico != 'Baja'
            ORDER BY cantidad_disponible ASC
        `;
        const resultado = await db.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener stock crítico' });
    }
});


// INVENTARIO POR CATEGORÍA (GET /dashboard/inventario-categoria)
app.get('/dashboard/inventario-categoria', async (req, res) => {
    try {
        const query = `
            SELECT categoria, SUM(cantidad_total) as total
            FROM inventario
            WHERE estado_fisico != 'Baja'
            GROUP BY categoria
            ORDER BY total DESC
        `;
        const resultado = await db.query(query);
        res.json(resultado.rows.map(row => ({
            categoria: row.categoria || 'Sin Categoría',
            total: parseInt(row.total, 10)
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener inventario por categoría' });
    }
});

// TOP 5 APARATOS MÁS SOLICITADOS (GET /reportes/top-aparatos)
app.get('/reportes/top-aparatos', async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        let query = `
            SELECT i.nombre, COUNT(p.id_prestamo) AS total_prestamos
            FROM prestamos p
            JOIN inventario i ON p.id_articulo = i.id_articulo
        `;
        const values = [];
        
        if (fechaInicio && fechaFin) {
            query += " WHERE p.fecha_prestamo >= $1 AND p.fecha_prestamo <= $2";
            values.push(fechaInicio, fechaFin);
        }
        
        query += `
            GROUP BY i.id_articulo, i.nombre
            ORDER BY total_prestamos DESC
            LIMIT 5
        `;
        
        const resultado = await db.query(query, values);
        // Convertimos a número para asegurar el tipo de dato correcto
        const datos = resultado.rows.map(row => ({
            ...row,
            total_prestamos: parseInt(row.total_prestamos, 10)
        }));
        res.json(datos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el top de aparatos' });
    }
});

// TENDENCIA DE PRÉSTAMOS POR MES (ÚLTIMOS 6 MESES) (GET /reportes/prestamos-mes)
app.get('/reportes/prestamos-mes', async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        let query = `
            SELECT 
                TO_CHAR(fecha_prestamo, 'YYYY-MM') AS mes,
                COUNT(*) AS total_prestamos
            FROM prestamos
        `;
        const values = [];

        if (fechaInicio && fechaFin) {
            query += " WHERE fecha_prestamo >= $1 AND fecha_prestamo <= $2";
            values.push(fechaInicio, fechaFin);
        } else {
            query += " WHERE fecha_prestamo >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'";
        }

        query += `
            GROUP BY TO_CHAR(fecha_prestamo, 'YYYY-MM')
            ORDER BY mes ASC
        `;
        
        const resultado = await db.query(query, values);
        // Convertimos a número para asegurar el tipo de dato correcto
        const datos = resultado.rows.map(row => ({
            ...row,
            total_prestamos: parseInt(row.total_prestamos, 10)
        }));
        res.json(datos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la tendencia de préstamos' });
    }
});

// REPORTE DE MOROSIDAD (GET /reportes/morosidad)
app.get('/reportes/morosidad', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.nombre_completo AS beneficiario,
                b.telefono,
                i.nombre AS aparato,
                p.fecha_prestamo,
                p.fecha_limite_devolucion,
                CURRENT_DATE - p.fecha_limite_devolucion AS dias_retraso
            FROM prestamos p
            JOIN beneficiarios b ON p.id_beneficiario = b.id_beneficiario
            JOIN inventario i ON p.id_articulo = i.id_articulo
            WHERE p.estado_prestamo = 'Activo' 
              AND p.fecha_limite_devolucion < CURRENT_DATE
            ORDER BY dias_retraso DESC
        `;
        const resultado = await db.query(query);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el reporte de morosidad' });
    }
});

// OBTENER TODAS LAS CATEGORÍAS (GET /categorias)
app.get('/categorias', async (req, res) => {
    try {
        let resultado = await db.query('SELECT * FROM categorias ORDER BY categoria ASC');
        if (resultado.rows.length === 0) {
            // Auto-seed default categories
            const defaultCategories = [
                ['Silla de ruedas', 'SR'],
                ['Muletas', 'MU'],
                ['Andadera', 'AN'],
                ['Bastón', 'BA']
            ];
            for (const [name, abbr] of defaultCategories) {
                await db.query('INSERT INTO categorias (categoria, abreviacion) VALUES ($1, $2)', [name, abbr]);
            }
            resultado = await db.query('SELECT * FROM categorias ORDER BY categoria ASC');
        }
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las categorías' });
    }
});

// AGREGAR NUEVA CATEGORÍA (POST /categorias)
app.post('/categorias', async (req, res) => {
    const { categoria, abreviacion } = req.body;
    
    // Validaciones
    if (!categoria || categoria.trim() === '') {
        return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
    }
    if (categoria.length > 100) {
        return res.status(400).json({ error: 'El nombre de la categoría no puede exceder los 100 caracteres.' });
    }
    if (!abreviacion || abreviacion.trim() === '') {
        return res.status(400).json({ error: 'La abreviación es requerida.' });
    }
    if (abreviacion.length > 5) {
        return res.status(400).json({ error: 'La abreviación no puede exceder los 5 caracteres.' });
    }

    try {
        // Verificar duplicados
        const duplicado = await db.query('SELECT * FROM categorias WHERE LOWER(categoria) = LOWER($1)', [categoria.trim()]);
        if (duplicado.rows.length > 0) {
            return res.status(400).json({ error: 'Esta categoría ya existe.' });
        }

        const resultado = await db.query(
            'INSERT INTO categorias (categoria, abreviacion) VALUES ($1, $2) RETURNING *',
            [categoria.trim(), abreviacion.trim().toUpperCase()]
        );
        res.status(201).json({ mensaje: 'Categoría agregada exitosamente', categoria: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar la categoría' });
    }
});

// ELIMINAR CATEGORÍA (DELETE /categorias/:id)
app.delete('/categorias/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Obtener el nombre de la categoría
        const catRes = await db.query('SELECT categoria FROM categorias WHERE id_categoria = $1', [id]);
        if (catRes.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        const nombreCategoria = catRes.rows[0].categoria;

        // 2. Verificar si tiene artículos asociados en el inventario
        const inventarioRes = await db.query('SELECT COUNT(*) AS total FROM inventario WHERE categoria = $1', [nombreCategoria]);
        const totalAsociados = parseInt(inventarioRes.rows[0].total, 10);
        
        if (totalAsociados > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar la categoría "${nombreCategoria}" porque tiene ${totalAsociados} artículo(s) asignado(s) en el inventario.` 
            });
        }

        // 3. Eliminar de la base de datos
        await db.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
        res.json({ mensaje: `La categoría "${nombreCategoria}" ha sido eliminada exitosamente.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});