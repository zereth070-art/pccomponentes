// ============================================================================
// VERSION DEL PROFESOR (referencia de clase) - NO es el codigo activo.
// Se guarda en docs/profe/ para compararla con la version propia.
//
// Enfoque del profe para el callback de Google:
//  - Usa Google People API (people/me) en vez de OIDC userinfo.
//  - Genera el popup HTML con window.opener.postMessage(...).
//  - Contrato que manda al front: { codigo, mensaje, datos:{ cliente, token } }
// ============================================================================
webServer.get(
  "/api/Cliente/LoginGoogleCallBack",
  async function (req, res, next) {
    try {
      console.log("paramatros pasados en la url desde google....", req.query);
      const { code } = req.query; // codigo de autorizacion que nos pasa google en el querystring

      // --- cambiamos el codigo de autorizacion por un token de acceso a la API de Google
      const objetoGetTokenResponse = await oauth2Client.getToken(code);
      const { tokens } = objetoGetTokenResponse;

      // configuro el cliente de oauth2.0 con dichos tokens
      oauth2Client.setCredentials(tokens);

      // People-API para recuperar info del usuario segun los scopes
      const peopleApi = google.people({ version: "v1", auth: oauth2Client });

      const userInfo = await peopleApi.people.get({
        resourceName: "people/me",
        personFields: "names,emailAddresses,phoneNumbers",
      });
      console.log(
        "=============== userInfo : ==================== ",
        JSON.stringify(userInfo.data),
      );
      const datosUsuario = {
        nombre: userInfo.data.names[0].displayName,
        apellidos: userInfo.data.names[0].familyName,
        cuenta: {
          email: userInfo.data.emailAddresses[0].value,
          password: "",
          activada: true,
          telefono: userInfo.data.phoneNumbers
            ? userInfo.data.phoneNumbers[0].value
            : "",
          imagenAvatar: userInfo.data.photos ? userInfo.data.photos[0].url : "",
        },
        direcciones: [],
        favoritos: [],
        pedidos: [],
        opiniones: [],
      };

      console.log(
        "Datos del usuario recuperados de la API de Google People-API: ",
        datosUsuario,
      );
      // 1º almacenar estos datos de google en mongodb, coleccion clientes

      // 2º generar un JWT de sesion para el usuario y devolverselo al cliente
      const _token = jsonwebtoken.sign(
        {
          email: datosUsuario.cuenta.email,
          nombre: datosUsuario.nombre,
          _id: datosUsuario._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      console.log("JWT generado para el usuario: ", _token);

      // 3º responder con ese token y datos del usuario para zustand.
      //    En vez de un JSON puro (que el popup mostraria tal cual),
      //    manda el JSON a la ventana padre (LoginRegistro.jsx).
      res.status(200).send(`
        <html>
          <script>
            window.opener.postMessage(
              { 
                codigo:0, 
                mensaje:'login con Google correcto', 
                datos:{ 
                  cliente: ${JSON.stringify(datosUsuario)}, 
                  token: ${JSON.stringify(_token)} 
                }                                
            )
          </script>
        </html>`);
    } catch (error) {
      console.log(
        `Error al procesar callback de login con Google OAuth2.0: ${error}`,
      );
      res.status(200).send(`
        <html>
          <script>
            window.opener.postMessage(
              { 
                codigo:1, 
                mensaje:'login FALLIDO con Google: ${error}',
                datos: null
              }
            )
          </script>
        </html>`);
    }
  },
);
