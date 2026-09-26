import { Router } from 'express';
import {
    agregarFavorito,
    quitarFavorito,
    getMisFavoritos,
    getFavoritosPorUsuarioAdmin
} from '../controllers/Favorito.controllers.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

const router = Router();

// Cualquier usuario logueado gestiona SUS PROPIOS favoritos
router.post('/agregarfavorito', verificarToken, agregarFavorito);
router.get('/mostrarfavoritos', verificarToken, getMisFavoritos);
router.delete('/eliminarfavorito/:productoId', verificarToken, quitarFavorito);

// Solo administrador: ver los favoritos de un usuario específico
router.get('/admin/:usuarioId', verificarToken, soloAdmin, getFavoritosPorUsuarioAdmin);

export default router;