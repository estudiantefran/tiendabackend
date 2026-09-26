import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { conectionMongo } from "./config/dataBase.js";
import categoriaRoutes from "./router/categoria.routes.js";
import favoritoRoutes from "./router/favorito.routes.js";
import pedidoRoutes from "./router/pedido.routes.js";
import productoRoutes from "./router/producto.routes.js";
import resenaRoutes from "./router/resena.routes.js";
import usuarioRoutes from "./router/usuario.routes.js";

dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

const app = express();
app.use(express.json());

app.use("/api/categorias", categoriaRoutes);
app.use("/api/favoritos", favoritoRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/resenas", resenaRoutes);
app.use("/api/usuarios", usuarioRoutes);

const port = process.env.PORT || 3000;

await conectionMongo();
app.listen(port, () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});