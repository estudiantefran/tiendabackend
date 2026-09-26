import mongoose from 'mongoose';
import { ProductoModel } from '../models/Producto.model.js';
import { CategoriaModel } from '../models/Categoria.model.js';

const normalizarTexto = (valor = '') => String(valor).trim();

const validarCategoriaExistente = async (categoriaId) => {
    if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
        return { valida: false, mensaje: 'el id de categoría no es válido' };
    }
    const categoria = await CategoriaModel.findById(categoriaId);
    if (!categoria || !categoria.estado) {
        return { valida: false, mensaje: 'la categoría indicada no existe o no está activa' };
    }
    return { valida: true };
};

/**
 * Valida y normaliza el array de presentaciones que llega en el body.
 * Devuelve { error } si algo está mal, o { presentaciones } ya limpias.
 */
const validarPresentaciones = (presentaciones) => {
    if (!Array.isArray(presentaciones) || presentaciones.length === 0) {
        return { error: 'el producto debe tener al menos una presentación' };
    }

    const presentacionesValidadas = [];

    for (const item of presentaciones) {
        const peso = normalizarTexto(item?.peso);
        const precio = Number(item?.precio);
        const stockActual = Number(item?.stockActual ?? 0);
        const stockMinimo = Number(item?.stockMinimo ?? 0);
        const stockMaximo = Number(item?.stockMaximo ?? 0);

        if (!peso) {
            return { error: 'cada presentación debe indicar su peso/nombre (ej. "100g")' };
        }
        if (Number.isNaN(precio) || precio < 0) {
            return { error: `el precio de la presentación "${peso}" no es válido` };
        }
        if (stockMaximo > 0 && stockMinimo > stockMaximo) {
            return { error: `en la presentación "${peso}", el stock mínimo no puede ser mayor al máximo` };
        }

        presentacionesValidadas.push({
            peso,
            precio,
            stockActual,
            stockMinimo,
            stockMaximo,
            estado: true
        });
    }

    return { presentaciones: presentacionesValidadas };
};

export const postProducto = async (request, response) => {
    try {
        const datos = { ...request.body };
        const nombre = normalizarTexto(datos.nombre);
        const descripcion = normalizarTexto(datos.descripcion);
        const categoria = datos.categoria;

        if (!nombre || !descripcion || !categoria) {
            return response.status(400).json({
                mensaje: 'nombre, descripcion y categoria son requeridos'
            });
        }

        const categoriaValidada = await validarCategoriaExistente(categoria);
        if (!categoriaValidada.valida) {
            return response.status(404).json({ mensaje: categoriaValidada.mensaje });
        }

        const { error, presentaciones } = validarPresentaciones(datos.presentaciones);
        if (error) {
            return response.status(400).json({ mensaje: error });
        }

        const nuevoProducto = await ProductoModel.create({
            nombre,
            descripcion,
            categoria,
            porcentajeCacao: datos.porcentajeCacao ? normalizarTexto(datos.porcentajeCacao) : undefined,
            ingredientes: Array.isArray(datos.ingredientes)
                ? datos.ingredientes.map((item) => normalizarTexto(item))
                : [],
            imagenes: Array.isArray(datos.imagenes)
                ? datos.imagenes.map((item) => normalizarTexto(item))
                : [],
            presentaciones,
            estado: true
        });

        return response.status(201).json({
            mensaje: 'producto creado satisfactoriamente',
            datos: nuevoProducto
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear el producto',
            problema
        });
    }
};

// Uso público (catálogo): solo productos activos.
// Query params soportados:
//   ?categoria=<id>        -> filtra por categoría
//   ?buscar=<texto>        -> busca coincidencias en el nombre (insensible a mayúsculas)
//   ?page=<numero>         -> página actual (default 1)
//   ?limit=<numero>        -> resultados por página (default 12, máximo 50)
export const getProductos = async (request, response) => {
    try {
        const { categoria, buscar } = request.query;

        const page = Math.max(1, parseInt(request.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(request.query.limit, 10) || 12));
        const skip = (page - 1) * limit;

        const filtro = { estado: true };

        if (categoria) {
            if (!mongoose.Types.ObjectId.isValid(categoria)) {
                return response.status(400).json({ mensaje: 'el id de categoría no es válido' });
            }
            filtro.categoria = categoria;
        }

        if (buscar) {
            const textoEscapado = String(buscar).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filtro.nombre = { $regex: textoEscapado, $options: 'i' };
        }

        const [productos, total] = await Promise.all([
            ProductoModel.find(filtro)
                .populate('categoria')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ProductoModel.countDocuments(filtro)
        ]);

        return response.status(200).json({
            mensaje: productos.length > 0
                ? 'estos son los productos encontrados'
                : 'no se encontraron productos con esos filtros',
            datos: productos,
            paginacion: {
                total,
                paginaActual: page,
                totalPaginas: Math.ceil(total / limit) || 1,
                porPagina: limit
            }
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar los productos',
            problema
        });
    }
};

// Uso administrativo: trae TODOS los productos, activos e inactivos.
export const getProductosAdmin = async (request, response) => {
    try {
        const productos = await ProductoModel.find().populate('categoria');
        return response.status(200).json({
            mensaje: 'estos son todos los productos (incluye inactivos)',
            datos: productos
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar los productos',
            problema
        });
    }
};

// Actualiza SOLO los datos generales del producto (nombre, descripcion,
// categoria, ingredientes, imagenes, porcentajeCacao). El stock/precio de
// cada presentación se maneja con los endpoints dedicados de abajo.
export const putProductoById = async (request, response) => {
    try {
        const idForPut = request.params.id;
        const dataForUpdate = { ...request.body };

        // Las presentaciones nunca se reemplazan por este endpoint, para no
        // arriesgar borrar accidentalmente presentaciones con historial de ventas.
        delete dataForUpdate.presentaciones;

        if (dataForUpdate.nombre !== undefined) {
            dataForUpdate.nombre = normalizarTexto(dataForUpdate.nombre);
        }

        if (dataForUpdate.descripcion !== undefined) {
            dataForUpdate.descripcion = normalizarTexto(dataForUpdate.descripcion);
        }

        if (dataForUpdate.categoria !== undefined) {
            const categoriaValidada = await validarCategoriaExistente(dataForUpdate.categoria);
            if (!categoriaValidada.valida) {
                return response.status(404).json({ mensaje: categoriaValidada.mensaje });
            }
        }

        if (dataForUpdate.porcentajeCacao !== undefined) {
            dataForUpdate.porcentajeCacao = normalizarTexto(dataForUpdate.porcentajeCacao);
        }

        if (Array.isArray(dataForUpdate.ingredientes)) {
            dataForUpdate.ingredientes = dataForUpdate.ingredientes.map((item) => normalizarTexto(item));
        }

        if (Array.isArray(dataForUpdate.imagenes)) {
            dataForUpdate.imagenes = dataForUpdate.imagenes.map((item) => normalizarTexto(item));
        }

        const productoUpdated = await ProductoModel.findByIdAndUpdate(
            idForPut,
            dataForUpdate,
            { new: true, runValidators: true }
        );

        if (!productoUpdated) {
            return response.status(404).json({
                mensaje: 'no se encontró el producto para actualizar'
            });
        }

        return response.status(200).json({
            mensaje: 'producto actualizado satisfactoriamente',
            datos: productoUpdated
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar el producto',
            problema
        });
    }
};

// Soft delete del producto completo (todas sus presentaciones dejan de
// mostrarse en el catálogo, aunque el documento se conserva).
export const deleteProductoById = async (request, response) => {
    try {
        const idForDelete = request.params.id;
        const productoDeleted = await ProductoModel.findByIdAndUpdate(
            idForDelete,
            { estado: false },
            { new: true }
        );

        if (!productoDeleted) {
            return response.status(404).json({
                mensaje: 'no se encontró el producto para eliminar'
            });
        }

        return response.status(200).json({
            mensaje: 'producto desactivado satisfactoriamente',
            datos: productoDeleted
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al eliminar el producto',
            problema: (error && error.message) || error
        });
    }
};

// ---- Gestión de presentaciones individuales ----

// Agrega una nueva presentación a un producto ya existente.
// POST /productos/:id/presentaciones
export const agregarPresentacion = async (request, response) => {
    try {
        const { id } = request.params;
        const { error, presentaciones } = validarPresentaciones([request.body]);

        if (error) {
            return response.status(400).json({ mensaje: error });
        }

        const producto = await ProductoModel.findByIdAndUpdate(
            id,
            { $push: { presentaciones: presentaciones[0] } },
            { new: true, runValidators: true }
        );

        if (!producto) {
            return response.status(404).json({ mensaje: 'no se encontró el producto' });
        }

        return response.status(201).json({
            mensaje: 'presentación agregada satisfactoriamente',
            datos: producto
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al agregar la presentación',
            problema: (error && error.message) || error
        });
    }
};

// Actualiza una presentación puntual (precio, stock, peso) sin tocar las demás.
// PUT /productos/:id/presentaciones/:presentacionId
export const actualizarPresentacion = async (request, response) => {
    try {
        const { id, presentacionId } = request.params;
        const cambios = { ...request.body };

        const producto = await ProductoModel.findById(id);
        if (!producto) {
            return response.status(404).json({ mensaje: 'no se encontró el producto' });
        }

        const presentacion = producto.presentaciones.id(presentacionId);
        if (!presentacion) {
            return response.status(404).json({ mensaje: 'no se encontró la presentación' });
        }

        if (cambios.peso !== undefined) presentacion.peso = normalizarTexto(cambios.peso);

        if (cambios.precio !== undefined) {
            const precio = Number(cambios.precio);
            if (Number.isNaN(precio) || precio < 0) {
                return response.status(400).json({ mensaje: 'el precio no es válido' });
            }
            presentacion.precio = precio;
        }

        if (cambios.stockActual !== undefined) presentacion.stockActual = Number(cambios.stockActual);
        if (cambios.stockMinimo !== undefined) presentacion.stockMinimo = Number(cambios.stockMinimo);
        if (cambios.stockMaximo !== undefined) presentacion.stockMaximo = Number(cambios.stockMaximo);

        if (presentacion.stockMaximo > 0 && presentacion.stockMinimo > presentacion.stockMaximo) {
            return response.status(400).json({
                mensaje: 'el stock mínimo no puede ser mayor al stock máximo'
            });
        }

        if (cambios.estado !== undefined) presentacion.estado = Boolean(cambios.estado);

        await producto.save();

        return response.status(200).json({
            mensaje: 'presentación actualizada satisfactoriamente',
            datos: producto
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar la presentación',
            problema: (error && error.message) || error
        });
    }
};

// Desactiva una presentación puntual (soft delete a nivel de presentación).
// DELETE /productos/:id/presentaciones/:presentacionId
export const eliminarPresentacion = async (request, response) => {
    try {
        const { id, presentacionId } = request.params;

        const producto = await ProductoModel.findById(id);
        if (!producto) {
            return response.status(404).json({ mensaje: 'no se encontró el producto' });
        }

        const presentacion = producto.presentaciones.id(presentacionId);
        if (!presentacion) {
            return response.status(404).json({ mensaje: 'no se encontró la presentación' });
        }

        presentacion.estado = false;
        await producto.save();

        return response.status(200).json({
            mensaje: 'presentación desactivada satisfactoriamente',
            datos: producto
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al desactivar la presentación',
            problema: (error && error.message) || error
        });
    }
};