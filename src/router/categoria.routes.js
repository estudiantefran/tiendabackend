import { Router } from 'express';
import {
    postCategoria,
    getCategorias,
    getCategoriasAdmin,
    putCategoriaById,
    deleteCategoriaById
} from '../controllers/Categoria.controllers.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

const router = Router();

// Pública: cualquiera puede ver el catálogo de categorías activas
router.get('/mostrarcategoria', getCategorias);

// Administrativas: crear, editar y "eliminar" (desactivar) solo con rol admin
router.post('/crearcategoria', verificarToken, soloAdmin, postCategoria);
router.get('/mostrarcategoria/admin', verificarToken, soloAdmin, getCategoriasAdmin);
router.put('/actualizarcategoria/:id', verificarToken, soloAdmin, putCategoriaById);
router.delete('/eliminarcategoria/:id', verificarToken, soloAdmin, deleteCategoriaById);

export default router;