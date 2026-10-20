// ============================================================================
// VERSION DEL PROFESOR (referencia de clase) - NO es el codigo activo.
// Se guarda en docs/profe/ para poder compararla con la version propia.
//
// Diferencias clave respecto a la version propia:
//  - Usa useRef para guardar la referencia del popup (elPopupRef).
//  - El useEffect lee el contrato del popup: evento.data.codigo y
//    evento.data.datos { cliente, accessToken, refreshToken }.
//  - Guarda la sesion con setters separados del store de zustand:
//    setDatosCliente, setAccessToken, setRefreshToken, setSesionIniciada.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { validateEmail } from "../../../utils/validaciones.js";
import "./LoginRegistro.css";
import { useNavigate } from "react-router";
import { apiFetch } from "../../../utils/apiFetch.js";
import useAuthStore from "../../../store/authStore.js";

const MIN_PASSWORD = 6;

function LoginRegistro() {
  const navigate = useNavigate();

  // setters del store global (zustand)
  const setDatosCliente = useAuthStore((e) => e.setDatosCliente);
  const setAccessToken = useAuthStore((e) => e.setAccessToken);
  const setRefreshToken = useAuthStore((e) => e.setRefreshToken);
  const setSesionIniciada = useAuthStore((e) => e.setSesionIniciada);

  // referencia al popup de Google: así podemos acceder a él fuera del
  // handler del click (por ejemplo, para cerrarlo desde el useEffect).
  const elPopupRef = useRef(null);

  // referencia al <div> del DOM de React donde se muestran los errores del
  // login con Google. El profe lo usa para inyectar HTML con innerHTML.
  // OJO: en React lo normal es usar estado + renderizado condicional; este
  // patrón (innerHTML manual) es didáctico para ver useRef sobre el DOM.
  const divErrores = useRef(null);

  const [modo, setModo] = useState("registro");
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    repetir: "",
  });
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorApi, setErrorApi] = useState("");
  const esRegistro = modo === "registro";

  // El login con Google pasa por un POPUP: el popup habla con Google y, al
  // terminar, manda los datos a ESTA ventana con postMessage.
  useEffect(() => {
    const recibirMensaje = (evento) => {
      // SEGURIDAD: solo aceptamos mensajes de nuestro propio origen.
      if (evento.origin !== window.location.origin) return;

      console.log(
        "evento message recibido del popup de login con google, datos:",
        evento.data,
      );

      if (evento.data.codigo !== 0) {
        console.log("error al hacer login con google:", evento.data.mensaje);
        // mostramos el mensaje en el div de errores del formulario, accediendo
        // al DOM de React con la ref (objeto { current: ... })
        if (divErrores.current) {
          divErrores.current.innerHTML = `
            <div class="alert alert-danger" role="alert">
              ${evento.data.mensaje}
            </div>
          `;
        }
        return;
      }

      // 1º cerrar el popup de login con google (usando la ref)
      elPopupRef.current?.close();

      // 2º guardar en el store global de zustand los datos del cliente y los
      //    tokens JWT
      const { cliente, accessToken, refreshToken } = evento.data.datos;
      setDatosCliente(cliente);
      setAccessToken(accessToken || "");
      setRefreshToken(refreshToken || "");
      setSesionIniciada(true);

      // 3º redireccionar a la pagina principal de la tienda
      navigate("/");
    };

    window.addEventListener("message", recibirMensaje);
    return () => window.removeEventListener("message", recibirMensaje);
  }, [
    navigate,
    setDatosCliente,
    setAccessToken,
    setRefreshToken,
    setSesionIniciada,
  ]);

  const campos = [
    ...(esRegistro
      ? [
          {
            nombre: "nombre",
            type: "text",
            label: "Nombre de usuario:",
            placeholder: "Nombre*",
          },
        ]
      : []),
    {
      nombre: "email",
      type: "email",
      label: "Email:",
      placeholder: "Email*",
    },
    {
      nombre: "password",
      type: "password",
      label: "Contraseña:",
      placeholder: "Contraseña*",
    },
    ...(esRegistro
      ? [
          {
            nombre: "repetir",
            type: "password",
            label: "Repetir contraseña:",
            placeholder: "Repetir contraseña*",
          },
        ]
      : []),
  ];

  function changeCampo(ev) {
    const { nombre } = ev.target.dataset;
    setForm((prev) => ({ ...prev, [nombre]: ev.target.value }));
    setExito("");
  }

  function validar() {
    const nuevosErrores = {};

    if (esRegistro && form.nombre.trim().length < 3) {
      nuevosErrores.nombre = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!validateEmail(form.email)) {
      nuevosErrores.email = "Introduce un email válido.";
    }

    if (form.password.length < MIN_PASSWORD) {
      nuevosErrores.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    }

    if (esRegistro && form.repetir !== form.password) {
      nuevosErrores.repetir = "Las contraseñas no coinciden.";
    }

    return nuevosErrores;
  }

  async function enviar(ev) {
    ev.preventDefault();

    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setCargando(true);
    setErrorApi("");
    try {
      const endpoint = esRegistro ? "/api/auth/register" : "/api/auth/login";
      const datos = esRegistro
        ? { nombre: form.nombre, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error?.mensaje ?? "No hemos podido conectar con el servidor",
        );
      }

      if (esRegistro) {
        setExito(data.mensaje ?? "Revisa tu correo para confirmar tu cuenta.");
        return;
      }

      setDatosCliente(data.cliente ?? data.usuario);
      setAccessToken(data.accessToken ?? data.token ?? "");
      setSesionIniciada(true);
      navigate("/");
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handlerGoogleLoginClick() {
    try {
      // El popup se abre de forma sincrona, con pagina en blanco; si
      // esperasemos al fetch, el navegador lo bloquearia.
      const popup = window.open("", "popupGoogle", "width=600,height=600");
      if (!popup) {
        setErrorApi("El navegador ha bloqueado la ventana de Google.");
        return;
      }
      // guardamos la referencia para poder cerrarlo desde el useEffect
      elPopupRef.current = popup;

      const respuesta = await fetch("/api/Cliente/LoginGoogle");
      const datos = await respuesta.json();
      if (!respuesta.ok || datos.codigo !== 0)
        throw new Error(datos.mensaje ?? "No se pudo iniciar el login con Google");

      popup.location.href = datos.datos.url;
    } catch (error) {
      console.error("error al hacer login con google: ", error);
      setErrorApi(error.message);
    }
  }

  return (
    <section className="form-container">
      <div className="row m-3">
        <div className="col d-grid gap-1">
          <button
            type="button"
            id="btnlogingmail"
            className="btn btn-light btn-sm"
            onClick={handlerGoogleLoginClick}
          >
            <img src="/imagenes/boton_login_GMAIL.png" />
          </button>
        </div>
      </div>
      <h1>
        {esRegistro
          ? "Registro de nuevo cliente"
          : "Inicio de sesión de cliente"}
      </h1>

      <div className="btn-group mb-3" role="group" aria-label="Modo de acceso">
        <button
          type="button"
          className={`btn ${esRegistro ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setModo("registro")}
        >
          Registro
        </button>
        <button
          type="button"
          className={`btn ${esRegistro ? "btn-secondary" : "btn-primary"}`}
          onClick={() => setModo("login")}
        >
          Login
        </button>
      </div>

      {exito && <div className="alert alert-success">{exito}</div>}
      {errorApi && <div className="alert alert-danger">{errorApi}</div>}
      {/* div de errores del popup de Google: el profe lo rellena con innerHTML
          desde el useEffect (useRef sobre el DOM) */}
      <div ref={divErrores}></div>
      <form onSubmit={enviar} noValidate>
        {campos.map((campo) => (
          <div key={campo.nombre}>
            <label className="form-label" htmlFor={campo.nombre}>
              {campo.label}
            </label>
            <input
              type={campo.type}
              id={campo.nombre}
              className="form-control"
              placeholder={campo.placeholder}
              data-nombre={campo.nombre}
              value={form[campo.nombre]}
              onChange={changeCampo}
            />
            {errores[campo.nombre] && (
              <small className="text-danger">{errores[campo.nombre]}</small>
            )}
          </div>
        ))}
        <button
          type="submit"
          className="btn btn-primary mt-3"
          disabled={cargando}
        >
          {cargando ? "Procesando..." : esRegistro ? "Registrarse" : "Entrar"}
        </button>
      </form>
    </section>
  );
}

export default LoginRegistro;
