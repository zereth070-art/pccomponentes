import "dotenv/config";
import mongoose from "mongoose";
import { Categoria } from "../models/Categoria.js";

/*
 * Estructura de categorías en 3 niveles:
 * Nivel 1 (raíz): Componentes, Ordenadores, Perifericos, Consolas
 * Nivel 2 (hijos de "Ordenadores"): Portátiles por tipo, Sobremesa, Workstations
 * Nivel 3 (hijos de "Portátiles por tipo"): Gaming, Ultrabook, 2-en-1, Profesionales
 *
 * El seed es IDEMPOTENTE (upsert por slug), ejecútalo cuantas veces quieras.
 */
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/pccomponentes";

/* Helper: crea/actualiza una categoría y devuelve su _id */
async function upsertCat(nombre, slug, parentId = null) {
  const doc = await Categoria.findOneAndUpdate(
    { slug },
    { $set: { nombre, slug, parent: parentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);

    // ---- NIVEL 1 (raíz) ----
    const idComponentes = await upsertCat("Componentes", "componentes");
    const idOrdenadores = await upsertCat("Ordenadores", "ordenadores");
    const idPerifericos = await upsertCat("Perifericos", "perifericos");
    const idConsolas = await upsertCat("Consolas", "consolas");

    // ---- NIVEL 2 (hijos de Ordenadores) ----
    const idPortatilesTipo = await upsertCat(
      "Portátiles por tipo",
      "portatiles-por-tipo",
      idOrdenadores,
    );
    const idSobremesa = await upsertCat("Sobremesa", "sobremesa", idOrdenadores);
    const idWorkstations = await upsertCat(
      "Workstations",
      "workstations",
      idOrdenadores,
    );

    // ---- NIVEL 3 (hijos de Portátiles por tipo) ----
    await upsertCat("Gaming", "portatiles-gaming", idPortatilesTipo);
    await upsertCat("Ultrabook", "portatiles-ultrabook", idPortatilesTipo);
    await upsertCat("2-en-1", "portatiles-2-en-1", idPortatilesTipo);
    await upsertCat("Profesionales", "portatiles-profesionales", idPortatilesTipo);

    // (Opcional) hijos de ejemplo para otras ramas
    await upsertCat("Procesadores", "procesadores", idComponentes);
    await upsertCat("Tarjetas Gráficas", "tarjetas-graficas", idComponentes);
    await upsertCat("Monitores", "monitores", idPerifericos);
    await upsertCat("Teclados", "teclados", idPerifericos);

    const guardadas = await Categoria.find().sort({ parent: 1, nombre: 1 });
    console.log(`[seed] ${guardadas.length} categorías en la base:`);
    guardadas.forEach((c) => {
      const nivel = c.parent ? "  └─" : "●";
      console.log(`  ${nivel} ${c.nombre} (${c.slug})${c.parent ? ` → parent:${c.parent}` : ""}`);
    });
  } catch (err) {
    console.error("[seed] error:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
