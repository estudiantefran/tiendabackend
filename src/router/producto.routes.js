import { Router } from 'express';
import {
    postProducto,
    getProductos,
    getProductosAdmin,
    putProductoById,
    deleteProductoById,
    agregarPresentacion,
    actualizarPresentacion,
    eliminarPresentacion
} from '../controllers/Producto.controllers.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

const router = Router();

// Pública: cualquiera puede ver el catálogo de productos activos
router.get('/mostrarproducto', getProductos);

// Administrativas: producto en general
router.post('/crearproducto', verificarToken, soloAdmin, postProducto);
router.get('/mostrarproducto/admin', verificarToken, soloAdmin, getProductosAdmin);
router.put('/actualizarproducto/:id', verificarToken, soloAdmin, putProductoById);
router.delete('/eliminarproducto/:id', verificarToken, soloAdmin, deleteProductoById);

// Administrativas: gestión de presentaciones puntuales de un producto
router.post('/:id/presentaciones', verificarToken, soloAdmin, agregarPresentacion);
router.put('/:id/presentaciones/:presentacionId', verificarToken, soloAdmin, actualizarPresentacion);
router.delete('/:id/presentaciones/:presentacionId', verificarToken, soloAdmin, eliminarPresentacion);

export default router;