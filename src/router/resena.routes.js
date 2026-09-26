import { Router } from 'express';
import {
    postResena,
    getResenas,
    putResenaById,
    deleteResenaById
} from '../controllers/Resena.controllers.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

// Pública: cualquiera puede leer las reseñas de un producto
router.get('/', getResenas);

// Protegidas: se necesita estar logueado para crear/editar/eliminar
// (el propio controller valida que solo el dueño edite/borre su reseña,
// y que solo pueda reseñar quien haya comprado y recibido el producto)
router.post('/', verificarToken, postResena);
router.put('/:id', verificarToken, putResenaById);
router.delete('/:id', verificarToken, deleteResenaById);

export default router;