import jwt from 'jsonwebtoken';

/**
 * Verifica que la petición traiga un token JWT válido en el header:
 * Authorization: Bearer <token>
 *
 * Si es válido, guarda el payload decodificado en request.usuario
 * (contendrá { id, rol }) para que los siguientes middlewares/controllers
 * puedan usarlo.
 */
export const verificarToken = (request, response, next) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.status(401).json({
            mensaje: 'no autorizado, se requiere un token'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        request.usuario = payload; // { id, rol, iat, exp }
        next();
    } catch (error) {
        return response.status(401).json({
            mensaje: 'token inválido o expirado'
        });
    }
};

/**
 * Debe usarse SIEMPRE después de verificarToken.
 * Bloquea el paso si el usuario autenticado no es administrador.
 */
export const soloAdmin = (request, response, next) => {
    if (!request.usuario || request.usuario.rol !== 'administrador') {
        return response.status(403).json({
            mensaje: 'acceso restringido a administradores'
        });
    }
    next();
};

/**
 * Debe usarse SIEMPRE después de verificarToken.
 * Permite el paso solo si el usuario autenticado es el dueño del recurso
 * (comparando request.params.id con el id del token) o si es administrador.
 *
 * Útil en rutas como PUT /usuarios/:id, donde un cliente solo debería
 * poder editar su propio perfil.
 */
export const soloDuenoOAdmin = (request, response, next) => {
    const esDueno = request.usuario?.id === request.params.id;
    const esAdmin = request.usuario?.rol === 'administrador';

    if (!esDueno && !esAdmin) {
        return response.status(403).json({
            mensaje: 'no tienes permiso para modificar este recurso'
        });
    }
    next();
};