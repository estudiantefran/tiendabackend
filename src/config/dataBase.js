import mongoose from "mongoose";

export async function conectionMongo() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI no está definida en el archivo .env');
        }

        const uriOculta = process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '///***:***@');
        console.log('intentado conectar a:', uriOculta);

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            retryWrites: true
        });

        console.log('conexion exitosa a la bases de datos');
    } catch (error) {
        console.error('error al conectarse a la bases de datos:', error.message || error);
    }
}
