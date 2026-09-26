import mongoose from "mongoose";

const resenaSchema = new mongoose.Schema({

    usuario:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Usuario",
        required:true
    },

    producto:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Producto",
        required:true
    },

    calificacion:{
        type:Number,
        required:true,
        min:1,
        max:5,
        validate:{
            validator: Number.isInteger,
            message: "la calificación debe ser un número entero entre 1 y 5"
        }
    },

    comentario:{
        type:String,
        trim:true,
        maxlength:[500, "el comentario no puede superar los 500 caracteres"]
    }

},{timestamps:true});

resenaSchema.index({ usuario: 1, producto: 1 }, { unique: true });

export const ResenaModel = mongoose.model("Resena", resenaSchema);