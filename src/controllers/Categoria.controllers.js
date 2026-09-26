import { CategoriaModel } from '../models/Categoria.model.js';
import { ProductoModel } from '../models/Producto.model.js';

const normalizarTexto = (valor = '') => String(valor).trim();

const existeCategoriaConNombre = async (nombre, idActual = null) => {
    const nombreNormalizado = normalizarTexto(nombre);
    if (!nombreNormalizado) return false;

    const filtro = {
        nombre: { $regex: `^${nombreNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    };

    if (idActual) {
        filtro._id = { $ne: idActual };
    }

    const categoria = await CategoriaModel.findOne(filtro);
    return Boolean(categoria);
};

export const postCategoria = async (request, response) => {
    try {
        const nombre = normalizarTexto(request.body.nombre);
        const descripcion = normalizarTexto(request.body.descripcion ?? '');
        const imagen = normalizarTexto(request.body.imagen ?? '');

        if (!nombre) {
            return response.status(400).json({
                mensaje: 'el nombre de la categoría es requerido'
            });
        }

        if (await existeCategoriaConNombre(nombre)) {
            return response.status(409).json({
                mensaje: 'ya existe una categoría con ese nombre'
            });
        }

        const nuevaCategoria = await CategoriaModel.create({
            nombre,
            descripcion: descripcion || undefined,
            imagen: imagen || undefined,
            estado: true
        });

        return response.status(201).json({
            mensaje: 'categoría creada satisfactoriamente',
            datos: nuevaCategoria
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear la categoría',
            problema
        });
    }
};

// Uso público (catálogo): solo trae categorías activas.
export const getCategorias = async (request, response) => {
    try {
        const categorias = await CategoriaModel.find({ estado: true });
        if (!categorias || categorias.length === 0) {
            return response.status(200).json({
                mensaje: 'no se encontraron categorías en la base de datos',
                datos: []
            });
        }
        return response.status(200).json({
            mensaje: 'estas son todas las categorías encontradas',
            datos: categorias
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar las categorías',
            problema
        });
    }
};

// Uso administrativo: trae TODAS las categorías, activas e inactivas,
// para que el admin pueda gestionar el catálogo completo.
export const getCategoriasAdmin = async (request, response) => {
    try {
        const categorias = await CategoriaModel.find();
        return response.status(200).json({
            mensaje: 'estas son todas las categorías (incluye inactivas)',
            datos: categorias
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar las categorías',
            problema
        });
    }
};

export const putCategoriaById = async (request, response) => {
    try {
        const idForPut = request.params.id;
        const dataForUpdate = { ...request.body };

        if (dataForUpdate.nombre !== undefined) {
            dataForUpdate.nombre = normalizarTexto(dataForUpdate.nombre);
            if (!dataForUpdate.nombre) {
                return response.status(400).json({
                    mensaje: 'el nombre de la categoría no puede quedar vacío'
                });
            }

            if (await existeCategoriaConNombre(dataForUpdate.nombre, idForPut)) {
                return response.status(409).json({
                    mensaje: 'ya existe una categoría con ese nombre'
                });
            }
        }

        if (dataForUpdate.descripcion !== undefined) {
            dataForUpdate.descripcion = normalizarTexto(dataForUpdate.descripcion);
        }

        if (dataForUpdate.imagen !== undefined) {
            dataForUpdate.imagen = normalizarTexto(dataForUpdate.imagen);
        }

        const categoriaUpdated = await CategoriaModel.findByIdAndUpdate(
            idForPut,
            dataForUpdate,
            { new: true, runValidators: true }
        );

        if (!categoriaUpdated) {
            return response.status(404).json({
                mensaje: 'no se encontró la categoría para actualizar'
            });
        }

        return response.status(200).json({
            mensaje: 'categoría actualizada satisfactoriamente',
            datos: categoriaUpdated
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar la categoría',
            problema
        });
    }
};

// Soft delete: nunca se borra físicamente, se desactiva.
// Antes de desactivar, avisa si hay productos activos usando esta categoría.
export const deleteCategoriaById = async (request, response) => {
    try {
        const idForDelete = request.params.id;

        const productosAsociados = await ProductoModel.countDocuments({
            categoria: idForDelete,
            estado: true
        });

        if (productosAsociados > 0) {
            return response.status(409).json({
                mensaje: `no se puede desactivar: hay ${productosAsociados} producto(s) activos en esta categoría`
            });
        }

        const categoriaDeleted = await CategoriaModel.findByIdAndUpdate(
            idForDelete,
            { estado: false },
            { new: true }
        );

        if (!categoriaDeleted) {
            return response.status(404).json({
                mensaje: 'no se encontró la categoría para eliminar'
            });
        }

        return response.status(200).json({
            mensaje: 'categoría desactivada satisfactoriamente',
            datos: categoriaDeleted
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al eliminar la categoría',
            problema: (error && error.message) || error
        });
    }
};