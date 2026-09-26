import mongoose from "mongoose";

const pedidoSchema = new mongoose.Schema({

    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },

    productos: [
        {
            producto: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Producto",
                required: true
            },

            // Id de la presentación específica dentro de producto.presentaciones
            // (subdocumento, no una colección aparte).
            presentacion: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },

            // Snapshot del peso/nombre de la presentación al momento de la compra,
            // para que el pedido siga siendo legible aunque luego se edite o
            // desactive esa presentación en el catálogo.
            peso: {
                type: String,
                required: true
            },

            cantidad: {
                type: Number,
                required: true,
                min: 1
            },

            precio: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],

    direccionEnvio: {
        departamento: { type: String, required: true, trim: true },
        ciudad: { type: String, required: true, trim: true },
        barrio: { type: String, trim: true },
        direccion: { type: String, required: true, trim: true }
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },

    envio: {
        type: Number,
        default: 0,
        min: 0
    },

    total: {
        type: Number,
        required: true,
        min: 0
    },

    metodoPago: {
        type: String,
        required: true,
        trim: true
    },

    referenciaPago: {
        type: String,
        trim: true
    },

    valorPago: {
        type: Number,
        min: 0
    },

    estadoPago: {
        type: String,
        enum: ["Pendiente", "Aprobado", "Rechazado", "Reembolsado"],
        default: "Pendiente"
    },

    estado: {
        type: String,
        enum: [
            "Pendiente",
            "Preparando",
            "Enviado",
            "Entregado",
            "Cancelado"
        ],
        default: "Pendiente"
    }

}, { timestamps: true });


pedidoSchema.pre("validate", function() {
    if (!this.productos || this.productos.length === 0) {
        this.invalidate(
            "productos",
            "Un pedido debe tener al menos un producto"
        );
    }
});


export const PedidoModel = mongoose.model("Pedido", pedidoSchema);