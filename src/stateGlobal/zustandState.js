//modelo de cofigo para definir las variables globales para todos los componentes
//del proyecto react
//Se crea una Store (almacen) con la funcion 'create' de zustand,
// la cual te devuelve un Hook que vas a usar en los componentes
//para acceder a las variables globales de STORE
import { create } from "zustand";

/*
 * Store global con el estado que comparten varios componentes: los datos del
 * cliente conectado, los tokens de la API y el pedido que se esta construyendo.
 *
 * A diferencia de authStore.js (que guarda la sesion y por eso persiste en
 * localStorage), aqui vive el estado "en curso": cosas que tienen sentido
 * mientras el usuario esta usando la aplicacion.
 */
const useGlobalStore = create((set) => ({
  // datos del cliente que esta conectado
  datosCliente: {
    nombre: "",
    apellidos: "",
    cuenta: {},
    direcciones: [],
    pedidos: [],
    opiniones: [],
  },

  // token de acceso a la API y token para renovar la sesion
  accessToken: "",
  refreshToken: "",

  // pedido que se esta montando en el carrito
  pedidoActual: {
    itemsPedido: [],
    total: 0,
    subtotal: 0,
    iva: 0.12,
  },

  // --- acciones: la unica forma de cambiar el estado ---
  setDatosCliente: (datosCliente) => set({ datosCliente }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),
  setPedidoActual: (pedidoActual) => set({ pedidoActual }),
}));

export default useGlobalStore;