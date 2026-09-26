import mongoose from 'mongoose';
import { PedidoModel } from '../models/Pedido.model.js';
import { ProductoModel } from '../models/Producto.model.js';
import { UsuarioModel } from '../models/Usuario.model.js';

/**
 * Resuelve la dirección de envío del pedido:
 * - Si el cliente manda "direccionEnvio" en el body, se usa esa (permite
 *   enviar a una dirección distinta a la guardada en su perfil).
 * - Si no manda nada, se copia la dirección guardada en su perfil de Usuario.
 * En ambos casos, el resultado queda "congelado" dentro del pedido (snapshot),
 * así que si el usuario cambia su dirección de perfil después, los pedidos
 * ya creados no se ven afectados.
 */
const resolverDireccionEnvio = async (usuarioId, direccionDelBody) => {
    const tieneCamposMinimos = (direccion) =>
        direccion && direccion.departamento && direccion.ciudad && direccion.direccion;

    if (tieneCamposMinimos(direccionDelBody)) {
        return {
            direccionEnvio: {
                departamento: String(direccionDelBody.departamento).trim(),
                ciudad: String(direccionDelBody.ciudad).trim(),
                barrio: direccionDelBody.barrio ? String(direccionDelBody.barrio).trim() : undefined,
                direccion: String(direccionDelBody.direccion).trim()
            }
        };
    }

    const usuario = await UsuarioModel.findById(usuarioId);
    if (tieneCamposMinimos(usuario?.direccion)) {
        return { direccionEnvio: usuario.direccion };
    }

    return {
        error: {
            status: 400,
            mensaje: 'debes indicar una dirección de envío (departamento, ciudad y dirección son obligatorios)'
        }
    };
};

const calcularTotalesPedido = (productos = [], envio = 0) => {
    const subtotal = productos.reduce((acumulador, item) => {
        const precio = Number(item?.precio || 0);
        const cantidad = Number(item?.cantidad || 0);
        return acumulador + (precio * cantidad);
    }, 0);

    const envioCalculado = Number(envio || 0);
    const total = subtotal + envioCalculado;

    return {
        subtotal,
        envio: envioCalculado,
        total
    };
};

/**
 * El cliente ahora manda { producto, presentacion, cantidad } por cada línea.
 * Esta función busca el producto, localiza esa presentación específica dentro
 * de su array "presentaciones", valida que esté activa y tenga stock, y arma
 * la línea final del pedido con el precio y peso reales tomados de la BD.
 */
const verificarProductosDelPedido = async (productos) => {
    if (!Array.isArray(productos) || productos.length === 0) {
        return { error: { status: 400, mensaje: 'el pedido debe tener al menos un producto' } };
    }

    const productosVerificados = [];

    for (const item of productos) {
        if (!mongoose.Types.ObjectId.isValid(item?.producto)) {
            return { error: { status: 400, mensaje: 'el id de producto no es válido' } };
        }
        if (!mongoose.Types.ObjectId.isValid(item?.presentacion)) {
            return { error: { status: 400, mensaje: 'el id de presentación no es válido' } };
        }

        const cantidad = Number(item.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
            return { error: { status: 400, mensaje: 'la cantidad debe ser un número entero mayor o igual a 1' } };
        }

        const productoDb = await ProductoModel.findById(item.producto);
        if (!productoDb || !productoDb.estado) {
            return { error: { status: 404, mensaje: `el producto ${item.producto} no existe o no está disponible` } };
        }

        const presentacionDb = productoDb.presentaciones.id(item.presentacion);
        if (!presentacionDb || !presentacionDb.estado) {
            return {
                error: {
                    status: 404,
                    mensaje: `la presentación indicada de "${productoDb.nombre}" no existe o no está disponible`
                }
            };
        }

        if (presentacionDb.stockActual < cantidad) {
            return {
                error: {
                    status: 409,
                    mensaje: `stock insuficiente para "${productoDb.nombre} - ${presentacionDb.peso}" (disponible: ${presentacionDb.stockActual})`
                }
            };
        }

        productosVerificados.push({
            producto: productoDb._id,
            presentacion: presentacionDb._id,
            peso: presentacionDb.peso,
            cantidad,
            precio: presentacionDb.precio // precio real desde la BD, nunca desde el body
        });
    }

    return { productosVerificados };
};

export const postPedido = async (request, response) => {
    try {
        const { productos = [], envio = 0, direccionEnvio, ...restoPedido } = request.body;

        const usuarioId = request.usuario?.id;
        if (!usuarioId) {
            return response.status(401).json({ mensaje: 'no autorizado' });
        }

        const direccion = await resolverDireccionEnvio(usuarioId, direccionEnvio);
        if (direccion.error) {
            return response.status(direccion.error.status).json({ mensaje: direccion.error.mensaje });
        }

        const { error, productosVerificados } = await verificarProductosDelPedido(productos);
        if (error) {
            return response.status(error.status).json({ mensaje: error.mensaje });
        }

        const totales = calcularTotalesPedido(productosVerificados, envio);

        const newPedido = await PedidoModel.create({
            ...restoPedido,
            usuario: usuarioId,
            productos: productosVerificados,
            direccionEnvio: direccion.direccionEnvio,
            envio: totales.envio,
            subtotal: totales.subtotal,
            total: totales.total
        });

        // Descontar el stock de la presentación específica comprada
        // (no del producto en general, ya que cada presentación tiene su propio stock).
        for (const item of productosVerificados) {
            await ProductoModel.updateOne(
                { _id: item.producto, 'presentaciones._id': item.presentacion },
                { $inc: { 'presentaciones.$.stockActual': -item.cantidad } }
            );
        }

        return response.status(201).json({
            mensaje: 'pedido creado satisfactoriamente',
            datos: newPedido
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear el pedido',
            problema
        });
    }
};

// Proteger con: router.get('/pedidos', verificarToken, soloAdmin, getPedidos)
export const getPedidos = async (request, response) => {
    try {
        const pedidos = await PedidoModel.find().populate('usuario productos.producto');
        if (!pedidos || pedidos.length === 0) {
            return response.status(200).json({
                mensaje: 'no se encontraron pedidos en la base de datos',
                datos: []
            });
        }
        return response.status(200).json({
            mensaje: 'estos son todos los pedidos encontrados',
            datos: pedidos
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar los pedidos',
            problema
        });
    }
};

export const getMisPedidos = async (request, response) => {
    try {
        const pedidos = await PedidoModel
            .find({ usuario: request.usuario.id })
            .populate('productos.producto');

        return response.status(200).json({
            mensaje: 'estos son tus pedidos',
            datos: pedidos
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar tus pedidos',
            problema
        });
    }
};

export const putPedidoById = async (request, response) => {
    try {
        const idForPut = request.params.id;
        const dataForUpdate = { ...request.body };

        delete dataForUpdate.productos;
        delete dataForUpdate.subtotal;
        delete dataForUpdate.total;
        delete dataForUpdate.usuario;

        const pedido = await PedidoModel.findById(idForPut);
        if (!pedido) {
            return response.status(404).json({ mensaje: 'no se encontró el pedido para actualizar' });
        }

        const esDueno = pedido.usuario.toString() === request.usuario?.id;
        const esAdmin = request.usuario?.rol === 'administrador';

        if (!esDueno && !esAdmin) {
            return response.status(403).json({ mensaje: 'no tienes permiso sobre este pedido' });
        }

        if (!esAdmin) {
            delete dataForUpdate.estado;
            delete dataForUpdate.estadoPago;
            delete dataForUpdate.referenciaPago;
            delete dataForUpdate.valorPago;

            if (pedido.estado !== 'Pendiente' && dataForUpdate.direccionEnvio) {
                return response.status(409).json({
                    mensaje: 'el pedido ya no se puede modificar, contacta con soporte'
                });
            }
        }

        const pedidoUpdated = await PedidoModel.findByIdAndUpdate(
            idForPut,
            dataForUpdate,
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            mensaje: 'pedido actualizado satisfactoriamente',
            datos: pedidoUpdated
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar el pedido',
            problema
        });
    }
};

export const cancelarPedidoById = async (request, response) => {
    try {
        const idForUpdate = request.params.id;

        const pedido = await PedidoModel.findById(idForUpdate);
        if (!pedido) {
            return response.status(404).json({ mensaje: 'no se encontró el pedido' });
        }

        const esDueno = pedido.usuario.toString() === request.usuario?.id;
        const esAdmin = request.usuario?.rol === 'administrador';

        if (!esDueno && !esAdmin) {
            return response.status(403).json({ mensaje: 'no tienes permiso sobre este pedido' });
        }

        if (pedido.estado === 'Cancelado') {
            return response.status(409).json({ mensaje: 'el pedido ya estaba cancelado' });
        }

        if (pedido.estado === 'Entregado') {
            return response.status(409).json({ mensaje: 'no se puede cancelar un pedido ya entregado' });
        }

        pedido.estado = 'Cancelado';
        await pedido.save();

        // Devolver el stock a la presentación específica de cada línea del pedido.
        for (const item of pedido.productos) {
            await ProductoModel.updateOne(
                { _id: item.producto, 'presentaciones._id': item.presentacion },
                { $inc: { 'presentaciones.$.stockActual': item.cantidad } }
            );
        }

        return response.status(200).json({
            mensaje: 'pedido cancelado satisfactoriamente',
            datos: pedido
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al cancelar el pedido',
            problema: (error && error.message) || error
        });
    }
};