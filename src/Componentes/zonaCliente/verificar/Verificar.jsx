import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiFetch } from "../../../utils/apiFetch.js";

/*
 * Página de destino del enlace del correo: /verificar?token=...
 * Llama al back, que marca verificado=true, y muestra el resultado.
 */
function Verificar() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [estado, setEstado] = useState({
    ok: false,
    mensaje: "Confirmando tu cuenta...",
  });

  useEffect(() => {
    // Sin token no hay nada que confirmar: el estado se deriva, no se guarda
    // (llamar a setState aqui seria un render en cascada).
    if (!token) return;

    // Si el usuario navega a otro sitio mientras llega la respuesta, no
    // actualizamos un componente que ya no esta montado.
    let cancelado = false;

    apiFetch(`/api/auth/verificar?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.mensaje ?? "Error inesperado");
        if (!cancelado)
          setEstado({
            ok: true,
            mensaje: data.mensaje ?? "Cuenta confirmada, ya puedes entrar.",
          });
      })
      .catch((err) => {
        if (!cancelado) setEstado({ ok: false, mensaje: err.message });
      });

    return () => {
      cancelado = true;
    };
  }, [token]);

  const ok = Boolean(token) && estado.ok;
  const mensaje = token
    ? estado.mensaje
    : "Enlace de verificación inválido.";

  return (
    <section className="form-container">
      <h1>Verificación de cuenta</h1>
      <div className={`alert ${ok ? "alert-success" : "alert-info"}`}>
        {mensaje}
      </div>
      {ok && (
        <Link className="btn btn-primary" to="/Cliente/LoginRegistro">
          Ir a entrar
        </Link>
      )}
    </section>
  );
}

export default Verificar;
