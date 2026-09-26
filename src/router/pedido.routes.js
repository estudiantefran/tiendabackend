import { Router } from 'express';
import {
    postPedido,
    getPedidos,
    getMisPedidos,
    putPedidoById,
    cancelarPedidoById
} from '../controllers/Pedido.controllers.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

const router = Router();

// Cualquier usuario logueado puede crear un pedido (usa su propio id del token)
router.post('/agregarpedido', verificarToken, postPedido);

// Solo un administrador ve TODOS los pedidos
router.get('/mostrarpedidos', verificarToken, soloAdmin, getPedidos);

// Un usuario logueado ve solo SUS propios pedidos
router.get('/mispedidos', verificarToken, getMisPedidos);

// El dueño del pedido o un admin puede actualizar (la restricción de qué
// campos según el rol ya se valida dentro del controller)
router.put('/actualizarpedido/:id', verificarToken, putPedidoById);

// Reemplaza el eliminarpedido: un pedido nunca se borra, se cancela
router.patch('/cancelarpedido/:id', verificarToken, cancelarPedidoById);

export default router;
