import "dotenv/config";
import mongoose from "mongoose";
import { crearApp } from "./app.js";
import { conectarDB } from "./config/db.js";

const PORT = process.env.PORT ?? 3000;
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/pccomponentes";

try {
  // 1. conectar a la base ANTES de escuchar: si Mongo no está vivo, el
  //    server cae aquí con un mensaje claro en vez de aceptar peticiones
  //    que van a fallar todas
  await conectarDB(MONGO_URI);

  // 2. sincronizar índices a propósito: unique: true declara la intención,
  //    esto construye el índice de verdad (también con autoIndex off).
  //    syncIndexes() sin argumentos recorre TODOS los modelos registrados:
  //    si mañana añades un modelo, no hay que acordarte de esto.
  await mongoose.syncIndexes();

  // 3. ya sí: escuchar peticiones en 0.0.0.0 (IPv4 e IPv6)
  crearApp().listen(PORT, "0.0.0.0", () => {
    console.log(`[api] escuchando en http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("[api] no se ha podido arrancar:", err.message);
  process.exit(1);
}
