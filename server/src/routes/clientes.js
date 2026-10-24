import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { enviarEmailBienvenida } from "../mail/mailer.js";
import { google } from "googleapis";
import { Usuario } from "../models/Usuario.js";
import { firmarToken, datosPublicos } from "./auth.js";
export const routerClientes = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT,
  process.env.GOOGLE_OAUTH_SECRET,
  // URL absoluta: tiene que coincidir con la registrada en Google Cloud Console
  process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    "http://localhost:3000/api/Cliente/LoginGoogleCallBack",
);
/*
 * El driver nativo comparte la misma conexión que mongoose: no hace falta
 * crear un segundo MongoClient. mongoose.connection.getClient() devuelve
 * el cliente real que ya está conectado.
 */
function db() {
  return mongoose.connection
    .getClient()
    .db(process.env.MONGODB_DBNAME ?? "pccomponentes");
}

routerClientes.post("/api/Cliente/Registro", async (req, res) => {
  try {
    // en req.body express.json() ha metido { nombre, email, password }
    const { nombre, email, password } = req.body;

    // 1º paso: comprobar si ya existe un usuario con ese email
    // OJO: en clase ponían 'cuenta.emaail' (typo): con ese campo la
    // búsqueda NUNCA encuentra nada y el registro duplicado pasaría
    const _clienteExiste = await db()
      .collection("clientes")
      .findOne({ "cuenta.email": email });
    if (_clienteExiste) throw new Error("Ya existe un usuario con ese email");

    // 2º paso: hashear la password y guardar el documento en "clientes"
    const _resultadoInsert = await db()
      .collection("clientes")
      .insertOne({
        nombre: nombre,
        apellidos: "",
        cuenta: {
          email: email,
          password: await bcrypt.hash(password, 10), // hash con 10 rondas de sal (con promesa: no bloquea el event loop)
          activada: false,
          telefono: "",
        },
        direcciones: [],
        listaFavoritos: [],
        pedidos: [],
      });
    console.log("Resultado de la insercion en la BD: ", _resultadoInsert);
    if (!_resultadoInsert.insertedId)
      throw new Error("No se ha podido insertar el cliente en la BD");

    // 3º paso: email de confirmación (fire and forget: no tumbar el registro)
    enviarEmailBienvenida({ nombre, email }).catch((err) =>
      console.error("[mail] error al enviar el email:", err.message),
    );

    // 4º paso: respuesta al cliente
    res.status(200).send({
      codigo: 0,
      mensaje:
        "Cliente registrado correctamente, revisa tu bandeja de entrada para confirmar tu cuenta",
    });
  } catch (error) {
    console.log(`Error al registrar cliente en la BD: ${error}`);
    res.status(200).send({
      codigo: 1,
      mensaje: `Error al registrar cliente en la BD: ${error}`,
    });
  }
});

routerClientes.get("/api/Cliente/LoginGoogle", async function (req, res) {
  try {
    //con las creds. de oauth obtenidsa en la consola de desarrolladores de Google, genreamos una url
    //q el usuario se autentifique con su cuenta de Google. Instalamos paquete 'googleapis' para crear el cliente oauth2.0
    //y generar la url de autentificacion
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        //<---------- info que quiero recuperar de la cuenta de google la info
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    });

    res.status(200).send({
      codigo: 0,
      mensaje: "login con google generado",
      datos: { url: url },
    });
    // A partir de aqui el popup se encarga del resto: navega a la URL de
    // Google, el usuario se autentica y Google redirige a
    // /api/Cliente/LoginGoogleCallBack, que es la ruta que canjea el codigo
    // por el token y se lo pasa a esta ventana con postMessage.
  } catch (error) {
    console.log(`'Error al procesar login con Google OAuth 2-0: ' ${error}`);
    res.status(200).send({
      codigo: 1,
      mensaje: `Error al porcesar login con Google OAuth 2.0  ${error}`,
    });
  }
});

routerClientes.get(
  "/api/Cliente/LoginGoogleCallBack",
  async function (req, res) {
    // Origen exacto al que el popup puede enviar el postMessage. Sale del .env
    // para que en produccion no apunte a localhost.
    const frontUrl = process.env.FRONT_URL ?? "http://localhost:5173";

    // Pagina HTML que el popup va a ejecutar. Su unico trabajo es pasarle el
    // token a la ventana que lo abrio (window.opener) y cerrarse.
    //
    // OJO con el JSON: JSON.stringify NO escapa el "<". Si un dato trae un
    // "</script>" (por ejemplo el nombre de Google de un usuario), el parser
    // HTML cierra aqui el bloque script y lo que venga despues se ejecuta
    // como JavaScript de verdad: eso es un XSS. Escapando el "<" como
    // "<" el string deja de poder cerrar la etiqueta.
    const jsonSeguro = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

    const responderPopup = (datos, mensaje) => `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Acceso con Google</title>
  </head>
  <body>
    <p>${mensaje}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage(${jsonSeguro(datos)}, ${jsonSeguro(frontUrl)});
      }
      window.close();
    </script>
  </body>
</html>`;

    try {
      // 1) canjeamos el codigo de autorizacion por un token de acceso
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // 2) OIDC: quien es este usuario. OJO: People API es la de contactos y
      // pide otro scope; para "yo quien soy" es oauth2Client.userinfo.get()
      const { data } = await oauth2Client.userinfo.get();
      const email = String(data.email ?? "").toLowerCase().trim();

      if (!email) throw new Error("Google no ha devuelto el email del usuario");

      // 3) buscamos el usuario en el MISMO modelo que usa el login normal
      // (/api/auth/login), no en la coleccion "clientes" suelta.
      let usuario = await Usuario.findOne({ email });

      if (!usuario) {
        // 4) usuario nuevo: entra con una contrasena aleatoria que NADIE
        // conoce. Se cumple el required:true del modelo sin crear una
        // contrasena que se pueda adivinar. Mismo patron que Auth0 o Firebase.
        const passwordAleatoria = crypto.randomBytes(32).toString("hex");
        usuario = await Usuario.create({
          nombre: data.name ?? email,
          email,
          password: await bcrypt.hash(passwordAleatoria, 10),
          // Google ya ha verificado ese correo: no le pedimos que lo confirme
          verificado: true,
        });
      } else if (!usuario.verificado) {
        // 5) ya existia pero sin verificar: Google acaba de demostrar que el
        // correo es suyo, asi que lo damos por verificado
        usuario.verificado = true;
        await usuario.save();
      }

      // 6) token de sesion normal, el mismo que emite /api/auth/login
      const token = firmarToken(usuario);

      res.send(
        responderPopup(
          { tipo: "google-login", token, usuario: datosPublicos(usuario) },
          "Sesion iniciada. Puedes cerrar esta ventana.",
        ),
      );
    } catch (error) {
      console.log(`Error al procesar login con Google OAuth 2.0: ${error}`);
      res.send(
        responderPopup(
          { tipo: "google-login-error" },
          "No se ha podido iniciar la sesion con Google. Vuelve a intentarlo.",
        ),
      );
    }
  },
);
