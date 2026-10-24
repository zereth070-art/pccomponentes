import { Router } from "express";
import { Categoria } from "../models/Categoria.js";
import requiereAuth from "../middleware/requiereAuth.js";

export const routerCategorias = Router();

/*
 * GET /api/categorias/public
 *   Endpoint PÚBLICO para el menú de navegación (sin auth).
 *   - ?parent=null: solo raíces (nivel 1)
 *   - ?parent=<ObjectId>: hijos de esa categoría (nivel 2, 3...)
 */
routerCategorias.get("/api/categorias/public", async (req, res) => {
  const { parent } = req.query;
  const filtro = {};

  if (parent === "null") {
    filtro.parent = null;
  } else if (parent) {
    filtro.parent = parent;
  }

  const categorias = await Categoria.find(filtro).sort({ nombre: 1 });
  res.json(categorias);
});

/*
 * GET /api/categorias
 *   Endpoint PRIVADO (requiere auth) para admin/debugging.
 *   Sin query: todas las categorías.
 */
routerCategorias.get("/api/categorias", requiereAuth, async (req, res) => {
  const { parent } = req.query;
  const filtro = {};

  if (parent === "null") {
    filtro.parent = null;
  } else if (parent) {
    filtro.parent = parent;
  }

  const categorias = await Categoria.find(filtro).sort({ nombre: 1 });
  res.json(categorias);
});
