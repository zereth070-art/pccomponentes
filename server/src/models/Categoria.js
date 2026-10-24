import mongoose from "mongoose";

/*
 * Esquema de Categoria con soporte para jerarquía padre-hijo (subcategorías).
 * - parent: referencia a otra Categoria (null = categoría raíz/nivel 1)
 * - slug: único globalmente (no por padre), así que "portatiles-gaming" no
 *   colisiona con "portatiles-oficina" aunque cuelguen de padres distintos.
 */
const categoriaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

/* Índice compuesto para consultar "hijos de X ordenados por nombre" rápido */
categoriaSchema.index({ parent: 1, nombre: 1 });

export const Categoria = mongoose.model("Categoria", categoriaSchema);
