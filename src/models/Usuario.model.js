import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({

    nombre:{
        type:String,
        required:true,
        trim:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },

    telefono:{
        type:String,
        required:true,
        trim:true
    },

    password:{
        type:String,
        required:true,
        select:false
    },

    rol:{
        type:String,
        enum:["cliente","administrador"],
        default:"cliente"
    },

    direccion:{
        departamento:{ type:String, trim:true },
        ciudad:{ type:String, trim:true },
        barrio:{ type:String, trim:true },
        direccion:{ type:String, trim:true }
    },

    estado:{
        type:Boolean,
        default:true
    }

},{timestamps:true});

usuarioSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.password;
        return ret;
    }
});

export const UsuarioModel=mongoose.model("Usuario",usuarioSchema);