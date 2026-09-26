import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UsuarioModel } from '../models/Usuario.model.js';

const normalizarEmail = (valor = '') => String(valor).trim().toLowerCase();

const validarPasswordSegura = (password) => {
    if (typeof password !== 'string') return false;
    const passwordLimpio = password.trim();
    return passwordLimpio.length >= 8;
};

const generarToken = (usuario) => {
    return jwt.sign(
        { id: usuario._id.toString(), rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

export const postUsuario = async (request, response) => {
    try {
        const nombre = String(request.body.nombre ?? '').trim();
        const email = normalizarEmail(request.body.email);
        const telefono = String(request.body.telefono ?? '').trim();
        const password = String(request.body.password ?? '').trim();

        if (!nombre || !email || !telefono || !password) {
            return response.status(400).json({
                mensaje: 'nombre, email, telefono y password son requeridos'
            });
        }

        if (!validarPasswordSegura(password)) {
            return response.status(400).json({
                mensaje: 'la password debe tener al menos 8 caracteres'
            });
        }

        const usuarioExistente = await UsuarioModel.findOne({ email });
        if (usuarioExistente) {
            return response.status(409).json({
                mensaje: 'ya existe un usuario con este email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // IMPORTANTE: nunca se toma "rol" del body en el registro público.
        const newUsuario = await UsuarioModel.create({
            nombre,
            email,
            telefono,
            password: hashedPassword,
            rol: 'cliente',
            direccion: request.body.direccion,
            estado: true
        });

        const usuarioData = newUsuario.toObject();
        delete usuarioData.password;

        return response.status(201).json({
            mensaje: 'usuario creado satisfactoriamente',
            datos: usuarioData
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear el usuario',
            problema
        });
    }
};

export const postAdmin = async (request, response) => {
    try {
        const nombre = String(request.body.nombre ?? '').trim();
        const email = normalizarEmail(request.body.email);
        const telefono = String(request.body.telefono ?? '').trim();
        const password = String(request.body.password ?? '').trim();

        if (!nombre || !email || !telefono || !password) {
            return response.status(400).json({
                mensaje: 'nombre, email, telefono y password son requeridos'
            });
        }

        if (!validarPasswordSegura(password)) {
            return response.status(400).json({
                mensaje: 'la password debe tener al menos 8 caracteres'
            });
        }

        const usuarioExistente = await UsuarioModel.findOne({ email });
        if (usuarioExistente) {
            return response.status(409).json({
                mensaje: 'ya existe un usuario con este email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoAdmin = await UsuarioModel.create({
            nombre,
            email,
            telefono,
            password: hashedPassword,
            rol: 'administrador',
            direccion: request.body.direccion,
            estado: true
        });

        const adminData = nuevoAdmin.toObject();
        delete adminData.password;

        return response.status(201).json({
            mensaje: 'administrador creado satisfactoriamente',
            datos: adminData
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al crear el administrador',
            problema
        });
    }
};

export const getUsuarios = async (request, response) => {
    try {
        const usuarios = await UsuarioModel.find();
        if (!usuarios || usuarios.length === 0) {
            return response.status(200).json({
                mensaje: 'no se encontraron usuarios en la base de datos',
                datos: []
            });
        }
        return response.status(200).json({
            mensaje: 'estos son todos los usuarios encontrados',
            datos: usuarios
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al buscar los usuarios',
            problema
        });
    }
};

export const putUsuarioById = async (request, response) => {
    try {
        const idForPut = request.params.id;
        const dataForUpdate = { ...request.body };

        // Solo un administrador puede cambiar el rol o el estado de un usuario.
        if (request.usuario?.rol !== 'administrador') {
            delete dataForUpdate.rol;
            delete dataForUpdate.estado;
        }

        if (dataForUpdate.nombre) {
            dataForUpdate.nombre = String(dataForUpdate.nombre).trim();
        }

        if (dataForUpdate.email) {
            dataForUpdate.email = normalizarEmail(dataForUpdate.email);
        }

        if (dataForUpdate.telefono) {
            dataForUpdate.telefono = String(dataForUpdate.telefono).trim();
        }

        if (dataForUpdate.password) {
            if (!validarPasswordSegura(dataForUpdate.password)) {
                return response.status(400).json({
                    mensaje: 'la password debe tener al menos 8 caracteres'
                });
            }
            dataForUpdate.password = await bcrypt.hash(dataForUpdate.password.trim(), 10);
        }

        const usuarioUpdated = await UsuarioModel.findByIdAndUpdate(
            idForPut,
            dataForUpdate,
            { new: true, runValidators: true }
        );

        if (!usuarioUpdated) {
            return response.status(404).json({
                mensaje: 'no se encontró el usuario para actualizar'
            });
        }

        const usuarioData = usuarioUpdated.toObject();
        delete usuarioData.password;

        return response.status(200).json({
            mensaje: 'usuario actualizado satisfactoriamente',
            datos: usuarioData
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error al actualizar el usuario',
            problema
        });
    }
};

export const loginUsuario = async (request, response) => {
    try {
        const email = normalizarEmail(request.body.email);
        const password = String(request.body.password ?? '').trim();

        if (!email || !password) {
            return response.status(400).json({
                mensaje: 'email y password son requeridos'
            });
        }

        const usuario = await UsuarioModel.findOne({ email }).select('+password');
        if (!usuario || !usuario.estado) {
            return response.status(401).json({
                mensaje: 'credenciales inválidas'
            });
        }

        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) {
            return response.status(401).json({
                mensaje: 'credenciales inválidas'
            });
        }

        const token = generarToken(usuario);

        const usuarioData = usuario.toObject();
        delete usuarioData.password;

        return response.status(200).json({
            mensaje: 'inicio de sesión exitoso',
            token,
            datos: usuarioData
        });
    } catch (error) {
        const problema = (error && error.message) || error;
        return response.status(400).json({
            mensaje: 'ocurrió un error en el inicio de sesión',
            problema
        });
    }
};

export const deleteUsuarioById = async (request, response) => {
    try {
        const idForDelete = request.params.id;

        const usuarioDeleted = await UsuarioModel.findByIdAndUpdate(
            idForDelete,
            { estado: false },
            { new: true }
        );

        if (!usuarioDeleted) {
            return response.status(404).json({
                mensaje: 'no se encontró el usuario para eliminar'
            });
        }

        return response.status(200).json({
            mensaje: 'usuario desactivado satisfactoriamente'
        });
    } catch (error) {
        return response.status(400).json({
            mensaje: 'ocurrió un error al eliminar el usuario',
            problema: (error && error.message) || error
        });
    }
};