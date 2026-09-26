import mongoose from 'mongoose';
import { ResenaModel } from '../models/Resena.model.js';
import { ProductoModel } from '../models/Producto.model.js';
import { PedidoModel } from '../models/Pedido.model.js';

const normalizarComentario = (valor = '') => String(valor).trim();

/**
 * Verifica que el usuario tenga al menos un pedido con estado "Entregado"
 * que incluya ese producto. Evita reseñas falsas o spam de quien nunca
 * compró el producto.
 */
const usuarioComproElProducto = async (usuarioId, productoId) => {
    const pedido = await PedidoModel.findOne({
        usuario: usuarioId,
        estado: 'Entregado',
        'productos.producto': productoId
    });
    return Boolean(pedido);
};

export const postResena = async (request, response) => {
    try {
        // El usuario de la reseña es siempre el autenticado, nunca uno del body
        // (evita que alguien deje reseñas a nombre de otra persona).
        const usuario = request.usuario?.id;
        const { producto, calificacion, comentario } = request.body;

        if (!usuario) {
            return response.status(401).json({ mensaje: 'no autorizado' });
        }

        if (!producto || !mongoose.Types.ObjectId.isValid(producto)) {
            return response.status(400).json({
                mensaje: 'el id de producto no es válido'
            });
        }

        const productoDb = await ProductoModel.findById(producto);
        if (!productoDb || !productoDb.estado) {
            return response.status(404).json({
                mensaje: 'el producto no existe o no está disponible'
            });
        }

        const calificacionValue = Number(calificacion);
        if (Number.isNaN(calificacionValue) || calificacionValue < 1 || calificacionValue > 5) {
            return response.status(400).json({
                mensaje: 'la calificación debe estar entre 1 y 5'
            });
        }

        const resenaExistente = await ResenaModel.findOne({ usuario, producto });
        if (resenaExistente) {
            return response.status(409).json({
                mensaje: 'este usuario ya dejó una reseña para este producto'
            });
        }

        const compro = await usuarioComproElProducto(usuario, producto);
        if (!compro) {
            return response.status(403).json({
                mensaje: 'solo puedes reseñar productos que hayas comprado y recibido'
            });
        }

        const nuevaResena = await ResenaModel.create({
            usuario,
            producto,
            calificacion: calificacionValue,
            comentario: comentario !== undefined ? normalizarComentario(comentario) : undefined
        });

        return response.status(201).json({
            mensaje: 'reseña creada satisfactoriamente',
            datos: nuevaResena
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear la reseña',
            problema
        });
    }
};

// Pública: cualquiera puede ver las reseñas de un producto (catálogo/detalle de producto)
export const getResenas = async (request, response) => {
    try {
        const resenas = await ResenaModel.find().populate('usuario producto');
        if (!resenas || resenas.length === 0) {
            return response.status(200).json({
                mensaje: 'no se encontraron reseñas en la base de datos',
                datos: []
            });
        }
        return response.status(200).json({
            mensaje: 'estas son todas las reseñas encontradas',
            datos: resenas
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar las reseñas',
            problema
        });
    }
};

// Solo el dueño de la reseña puede editarla
export const putResenaById = async (request, response) => {
    try {
        const idForPut = request.params.id;
        const dataForUpdate = { ...request.body };

        // El usuario y el producto de una reseña nunca deberían cambiar tras crearla.
        delete dataForUpdate.usuario;
        delete dataForUpdate.producto;

        const resena = await ResenaModel.findById(idForPut);
        if (!resena) {
            return response.status(404).json({ mensaje: 'no se encontró la reseña para actualizar' });
        }

        const esDueno = resena.usuario.toString() === request.usuario?.id;
        const esAdmin = request.usuario?.rol === 'administrador';

        if (!esDueno && !esAdmin) {
            return response.status(403).json({ mensaje: 'no tienes permiso para editar esta reseña' });
        }

        if (dataForUpdate.calificacion !== undefined) {
            const calificacionValue = Number(dataForUpdate.calificacion);
            if (Number.isNaN(calificacionValue) || calificacionValue < 1 || calificacionValue > 5) {
                return response.status(400).json({
                    mensaje: 'la calificación debe estar entre 1 y 5'
                });
            }
            dataForUpdate.calificacion = calificacionValue;
        }

        if (dataForUpdate.comentario !== undefined) {
            dataForUpdate.comentario = normalizarComentario(dataForUpdate.comentario);
        }

        const resenaUpdated = await ResenaModel.findByIdAndUpdate(
            idForPut,
            dataForUpdate,
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            mensaje: 'reseña actualizada satisfactoriamente',
            datos: resenaUpdated
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar la reseña',
            problema
        });
    }
};

// El dueño de la reseña o un administrador pueden eliminarla
export const deleteResenaById = async (request, response) => {
    try {
        const idForDelete = request.params.id;

        const resena = await ResenaModel.findById(idForDelete);
        if (!resena) {
            return response.status(404).json({ mensaje: 'no se encontró la reseña para eliminar' });
        }

        const esDueno = resena.usuario.toString() === request.usuario?.id;
        const esAdmin = request.usuario?.rol === 'administrador';

        if (!esDueno && !esAdmin) {
            return response.status(403).json({ mensaje: 'no tienes permiso para eliminar esta reseña' });
        }

        await ResenaModel.findByIdAndDelete(idForDelete);

        return response.status(200).json({
            mensaje: 'reseña eliminada satisfactoriamente'
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al eliminar la reseña',
            problema: (error && error.message) || error
        });
    }
};