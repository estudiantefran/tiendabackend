import mongoose from "mongoose";

const presentacionSchema = new mongoose.Schema({

    peso: {
        type: String, // ej: "50g", "100g", "250g", "Caja x6"
        required: true,
        trim: true
    },

    precio: {
        type: Number,
        required: true,
        min: 0
    },

    stockActual: {
        type: Number,
        default: 0,
        min: 0
    },

    stockMinimo: {
        type: Number,
        default: 0,
        min: 0
    },

    stockMaximo: {
        type: Number,
        default: 0,
        min: 0
    },

    // Permite desactivar una presentación puntual sin afectar el resto del
    // producto (ej. dejar de vender la presentación "Caja x12" pero seguir
    // vendiendo "Caja x6" del mismo chocolate).
    estado: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

const productoSchema = new mongoose.Schema({

    nombre:{
        type:String,
        required:true,
        trim:true,
        maxlength:100
    },

    descripcion:{
        type:String,
        required:true,
        trim:true,
        maxlength:1000
    },

    porcentajeCacao:{
        type:String,
        trim:true
    },

    ingredientes:[
        {
            type:String,
            trim:true
        }
    ],

    imagenes:[
        {
            type:String,
            trim:true
        }
    ],

    presentaciones: {
        type: [presentacionSchema],
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length > 0,
            message: "el producto debe tener al menos una presentación"
        }
    },

    categoria:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Categoria",
        required:true
    },

    estado:{
        type:Boolean,
        default:true
    }

},{timestamps:true});

export const ProductoModel = mongoose.model("Producto", productoSchema);