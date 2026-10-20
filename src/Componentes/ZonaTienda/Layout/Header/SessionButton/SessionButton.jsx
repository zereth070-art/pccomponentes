import "./SessionButton.css";

/*
 * Boton de sesion tal como lo plantea el profe: el componente recibe por props
 * la funcion para saltar a una url, el email y el icono, y decide que mostar.
 *  - Si no hay email (nadie logueado): "Mi Cuenta" -> va al login.
 *  - Si hay email: saludo con el email + icono/avatar.
 *
 * Los nombres de las props se mantienen los del profe (saltarAUrl, email, icono)
 * y se anaden las funciones salir/urlSalir para no dejar el componente a medias.
 */
export function SessionButton({ saltarAUrl, email, icono, salir, urlSalir = "/" }) {
  return (
    <button
      className="btn btn-light btn-sm"
      onClick={() => {
        // si hay sesion, el boton sirve para cerrarla; si no, para ir al login
        if (email) {
          salir?.();
          saltarAUrl(urlSalir);
        } else {
          saltarAUrl("/Cliente/LoginRegistro");
        }
      }}
    >
      <i className="fa-regular fa-user"></i>{" "}
      {email ? (
        <>
          Hola, {email}
          {icono ? (
            <img src={icono} alt="avatar" className="session-avatar" />
          ) : null}
        </>
      ) : (
        "Mi Cuenta"
      )}
    </button>
  );
}

export default SessionButton;
