import mongoose from "mongoose";

const favoritoSchema = new mongoose.Schema({

    usuario:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Usuario",
        required:true,
        unique:true // un solo documento de favoritos por usuario
    },

    productos:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Producto"
        }
    ]

},{timestamps:true});

export const FavoritoModel= mongoose.model("Favorito",favoritoSchema);