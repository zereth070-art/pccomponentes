import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiFetch } from "../../../../../utils/apiFetch";
import SubcategoriasPanel from "./SubcategoriasPanel";
import "./OffCanvas.css";

function OffCanvasCats() {
  const [categorias, setCategorias] = useState([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null); // { _id, nombre } del nivel 1 seleccionado
  const navigate = useNavigate();

  /* Carga solo categorías raíz (parent=null) al montar - endpoint PÚBLICO */
  useEffect(() => {
    apiFetch("/api/categorias/public?parent=null")
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((datos) => setCategorias(datos))
      .catch((err) => {
        console.error("error cargando las categorias:", err);
        setErrorCarga(true);
      });
  }, []);

  /* Maneja click en categoría nivel 1:
     - Busca si tiene hijos (fetch a /api/categorias/public?parent=<id>)
     - Si tiene hijos: abre SubcategoriasPanel
     - Si no tiene hijos: navega directo a productos
  */
  const handleCategoriaClick = async (cat) => {
    // Verificamos si tiene hijos
    const resp = await apiFetch(`/api/categorias/public?parent=${cat._id}`);
    if (!resp.ok) {
      console.error("Error comprobando hijos:", resp.status);
      return;
    }
    const hijos = await resp.json();

    if (hijos.length > 0) {
      // Tiene subcategorías → abre panel nivel 2
      setCategoriaAbierta({ _id: cat._id, nombre: cat.nombre });
    } else {
      // Sin subcategorías → directo a productos
      navigate(`/Productos/Categoria?categoria=${encodeURIComponent(cat.nombre)}`);
    }
  };

  const cerrarPanel = () => setCategoriaAbierta(null);

  /* Callback para cuando se selecciona una categoría final (nivel 2 sin hijos, o nivel 3) */
  const irAProductos = (nombreCat) => {
    navigate(`/Productos/Categoria?categoria=${encodeURIComponent(nombreCat)}`);
    cerrarPanel();
  };

  return (
    <div className="mt-5 mb-4">
      <button
        className="btn btn-outline-secondary"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasWithBothOptions"
        aria-controls="offcanvasWithBothOptions"
      >
        <i className="fa-solid fa-bars"></i> Todas las categorias
      </button>

      <div
        className="offcanvas offcanvas-start"
        data-bs-scroll="true"
        tabIndex="-1"
        id="offcanvasWithBothOptions"
        aria-labelledby="offcanvasWithBothOptionsLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="offcanvasWithBothOptionsLabel">
            Campañas y ofertas
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <hr></hr>

        <div className="offcanvas-body">
          <h3>
            <strong>Categorias</strong>
          </h3>

          {errorCarga && (
            <p className="text-danger">
              No se han podido cargar las categorias. ¿Está el server de Express
              arrancado en el puerto 3000?
            </p>
          )}

          {!errorCarga && categorias.length === 0 && (
            <p>Cargando categorias...</p>
          )}

          <div className="list-group">
            {categorias.map((cat) => (
              <button
                key={cat._id}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => handleCategoriaClick(cat)}
              >
                {cat.nombre}
                {/* Indicador visual de que tiene subcategorías (lo confirmamos al click) */}
                <i className="fa-solid fa-chevron-right text-muted" style={{ fontSize: "0.75rem" }} aria-hidden="true"></i>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panel de subcategorías (nivel 2) - se renderiza SOLO cuando hay categoría abierta */}
      {categoriaAbierta && (
        <>
          {/* Backdrop para cerrar al clickar fuera */}
          <div className="subcats-backdrop show" onClick={cerrarPanel} aria-hidden="true"></div>
          <SubcategoriasPanel
            parentId={categoriaAbierta._id}
            parentNombre={categoriaAbierta.nombre}
            onClose={cerrarPanel}
            onGoToProductos={irAProductos}
          />
        </>
      )}
    </div>
  );
}

export default OffCanvasCats;
