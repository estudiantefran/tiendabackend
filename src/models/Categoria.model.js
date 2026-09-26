import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({

    nombre:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    descripcion:{
        type:String,
        trim:true
    },

    imagen:{
        type:String,
        trim:true
    },

    estado:{
        type:Boolean,
        default:true
    }

},{timestamps:true});

export const CategoriaModel= mongoose.model("Categoria",categoriaSchema);