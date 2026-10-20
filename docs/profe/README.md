# Versión del profesor (referencia de clase)

Copia de los archivos tal como los plantea el profesor en clase, para
compararlos con la versión propia del proyecto. **No son el código activo**,
solo referencia.

## Archivos

- `LoginRegistro.jsx` — versión del profe con `useRef` para el popup y
  setters separados en el store.
- `clientes.js` — versión del profe de la ruta del backend.
- `.env.example` — versión del profe del ejemplo de variables de entorno.

## Diferencias principales

### `LoginRegistro.jsx` (login con Google por popup)

| Aspecto | Versión propia | Versión del profe |
| --- | --- | --- |
| Referencia al popup | variable local en el handler | `useRef` (`elPopupRef`) |
| Mensaje de error del popup | `setErrorApi` + render condicional | `useRef` (`divErrores`) + `innerHTML` |
| Contrato del `postMessage` | `{ tipo: "google-login", usuario, token }` | `{ codigo, datos: { cliente, accessToken, refreshToken } }` |
| Cierre del popup | `evento.source?.close()` | `elPopupRef.current?.close()` |
| Guardado de sesión | `login(usuario, token)` | `setDatosCliente` + `setAccessToken` + `setRefreshToken` + `setSesionIniciada` |
| Store necesario | `authStore` con `usuario` + `token` | `authStore` con datosCliente + access/refresh token + sesionIniciada |

> Nota: la versión del profe **no funciona con el `authStore` actual** del
> proyecto (que solo tiene `usuario` + `token`). Requiere ampliar el store con
> esos cuatro campos, y que el popup mande el contrato `{ codigo, datos }`.

> Sobre `divErrores` + `innerHTML`: es un patrón **didáctico** del profe para
> enseñar `useRef` sobre el DOM. En React lo idiomático es estado + render
> condicional (como en la versión propia). `innerHTML` con datos que vengan de
> fuera es además un riesgo de XSS.
