import { Router } from 'express';
import {
    postUsuario,
    postAdmin,
    getUsuarios,
    putUsuarioById,
    deleteUsuarioById,
    loginUsuario
} from '../controllers/Usuario.controllers.js';
import { verificarToken, soloAdmin, soloDuenoOAdmin } from '../middlewares/auth.js';

const router = Router();

// Públicas: cualquiera puede registrarse (siempre como "cliente") e iniciar sesión
router.post('/crear', postUsuario);
router.post('/login', loginUsuario);

// Protegidas: solo un administrador autenticado puede crear otros administradores
// o ver la lista completa de usuarios
router.post('/admin', verificarToken, soloAdmin, postAdmin);
router.get('/mostrar', verificarToken, soloAdmin, getUsuarios);

// Protegida: solo el dueño del perfil o un administrador puede modificar/eliminar
router.put('/modificar/:id', verificarToken, soloDuenoOAdmin, putUsuarioById);
router.delete('/eliminar/:id', verificarToken, soloAdmin, deleteUsuarioById);

export default router;