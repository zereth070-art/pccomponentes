import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiFetch } from "../../../../../utils/apiFetch";
import "./OffCanvas.css";

/*
 * Panel de subcategorías (nivel 2) que desliza desde la derecha.
 * Soporta navegación a nivel 3 (tipos) dentro del mismo panel.
 *
 * Props:
 *   - parentId: ObjectId de la categoría padre (nivel 1)
 *   - parentNombre: nombre para mostrar en el título
 *   - onClose: función para cerrar el panel completamente
 *   - onGoToProductos: función para navegar a la página de productos
 */
function SubcategoriasPanel({ parentId, parentNombre, onClose, onGoToProductos }) {
  const [nivel2, setNivel2] = useState([]);      // Subcategorías (hijos de parentId)
  const [nivel3, setNivel3] = useState(null);    // { catPadre, items[] } cuando se abre nivel 3
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  // Cargar nivel 2 (hijos de parentId)
  useEffect(() => {
    if (!parentId) return;
    setLoading(true);
    setError(false);
    setNivel3(null); // Reset nivel 3 al cambiar parentId
    apiFetch(`/api/categorias/public?parent=${parentId}`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((datos) => {
        setNivel2(datos);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando subcategorías:", err);
        setError(true);
        setLoading(false);
      });
  }, [parentId]);

  // Cerrar con Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Click en item nivel 2 → carga sus hijos (nivel 3) y los muestra
  const handleNivel2Click = async (cat) => {
    const resp = await apiFetch(`/api/categorias/public?parent=${cat._id}`);
    if (!resp.ok) return;
    const hijos = await resp.json();

    if (hijos.length > 0) {
      // Tiene nivel 3 → mostramos en el mismo panel
      setNivel3({ catPadre: cat, items: hijos });
    } else {
      // Sin más niveles → directo a productos
      onGoToProductos(cat.nombre);
    }
  };

  // Click en item nivel 3 → navega a productos
  const handleNivel3Click = (cat) => {
    onGoToProductos(cat.nombre);
  };

  // Volver del nivel 3 al nivel 2
  const volverANivel2 = () => setNivel3(null);

  // Render del esqueleto del panel (header + contenido)
  const renderPanel = (children) => (
    <div className="subcats-panel open" role="dialog" aria-modal="true" aria-label={parentNombre}>
      <div className="subcats-header">
        <h3 className="subcats-title">
          {nivel3 ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-decoration-none text-dark"
                onClick={volverANivel2}
                aria-label="Volver"
              >
                <i className="fa-solid fa-chevron-left me-1"></i>{parentNombre}
              </button>
              {nivel3.catPadre.nombre}
            </>
          ) : (
            parentNombre
          )}
        </h3>
        <button className="subcats-close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <div className="subcats-list">{children}</div>
    </div>
  );

  if (loading) {
    return renderPanel(
      <p className="text-center text-muted py-4">Cargando…</p>
    );
  }

  if (error) {
    return renderPanel(
      <p className="text-danger text-center py-4">Error al cargar subcategorías</p>
    );
  }

  // --- MODO NIVEL 3: mostramos los tipos (ej: Gaming, Ultrabook, etc.) ---
  if (nivel3) {
    return renderPanel(
      <div className="subcats-level3">
        <div className="subcats-group-label">{nivel3.catPadre.nombre}</div>
        {nivel3.items.map((cat) => (
          <button
            key={cat._id}
            className="subcats-level3-item"
            onClick={() => handleNivel3Click(cat)}
          >
            {cat.nombre}
          </button>
        ))}
      </div>
    );
  }

  // --- MODO NIVEL 2: lista de subcategorías con chevron si tienen hijos ---
  return renderPanel(
    <>
      {nivel2.length === 0 && (
        <p className="text-muted text-center py-4">Sin subcategorías</p>
      )}
      {nivel2.map((cat) => (
        <button
          key={cat._id}
          className="subcats-item"
          onClick={() => handleNivel2Click(cat)}
        >
          <span>{cat.nombre}</span>
          {/* Chevron solo si la categoría TIENE hijos (nivel 3) */}
          {cat._id && (
            <i className="fa-solid fa-chevron-right subcats-chevron" aria-hidden="true"></i>
          )}
        </button>
      ))}
    </>
  );
}

export default SubcategoriasPanel;