import mongoose from 'mongoose';
import { FavoritoModel } from '../models/Favorito.model.js';
import { ProductoModel } from '../models/Producto.model.js';

/**
 * Agrega UN producto a la lista de favoritos del usuario autenticado.
 * Si el usuario todavía no tiene documento de Favorito, se crea automáticamente
 * (upsert). Si el producto ya estaba en la lista, no se duplica ($addToSet).
 *
 * POST /favoritos  body: { producto: "id" }
 */
export const agregarFavorito = async (request, response) => {
    try {
        const usuarioId = request.usuario?.id;
        const { producto } = request.body;

        if (!mongoose.Types.ObjectId.isValid(producto)) {
            return response.status(400).json({ mensaje: 'el id de producto no es válido' });
        }

        const productoDb = await ProductoModel.findById(producto);
        if (!productoDb || !productoDb.estado) {
            return response.status(404).json({ mensaje: 'el producto no existe o no está disponible' });
        }

        const favorito = await FavoritoModel.findOneAndUpdate(
            { usuario: usuarioId },
            { $addToSet: { productos: producto } },
            { new: true, upsert: true }
        );

        return response.status(200).json({
            mensaje: 'producto agregado a favoritos',
            datos: favorito
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al agregar el favorito',
            problema: (error && error.message) || error
        });
    }
};

/**
 * Quita UN producto de la lista de favoritos del usuario autenticado.
 *
 * DELETE /favoritos/:productoId
 */
export const quitarFavorito = async (request, response) => {
    try {
        const usuarioId = request.usuario?.id;
        const { productoId } = request.params;

        const favorito = await FavoritoModel.findOneAndUpdate(
            { usuario: usuarioId },
            { $pull: { productos: productoId } },
            { new: true }
        );

        if (!favorito) {
            return response.status(404).json({ mensaje: 'no tienes una lista de favoritos todavía' });
        }

        return response.status(200).json({
            mensaje: 'producto eliminado de favoritos',
            datos: favorito
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al quitar el favorito',
            problema: (error && error.message) || error
        });
    }
};

/**
 * Devuelve los favoritos del usuario autenticado (con los datos del producto ya poblados).
 *
 * GET /favoritos/mios
 */
export const getMisFavoritos = async (request, response) => {
    try {
        const usuarioId = request.usuario?.id;

        const favorito = await FavoritoModel
            .findOne({ usuario: usuarioId })
            .populate({
                path: 'productos',
                match: { estado: true } // no mostrar productos que ya fueron desactivados
            });

        return response.status(200).json({
            mensaje: 'estos son tus favoritos',
            datos: favorito?.productos || []
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar tus favoritos',
            problema: (error && error.message) || error
        });
    }
};

/**
 * Uso administrativo: ver los favoritos de un usuario específico.
 * GET /favoritos/usuario/:usuarioId
 */
export const getFavoritosPorUsuarioAdmin = async (request, response) => {
    try {
        const { usuarioId } = request.params;

        const favorito = await FavoritoModel
            .findOne({ usuario: usuarioId })
            .populate('productos');

        return response.status(200).json({
            mensaje: 'favoritos del usuario',
            datos: favorito?.productos || []
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar los favoritos',
            problema: (error && error.message) || error
        });
    }
};