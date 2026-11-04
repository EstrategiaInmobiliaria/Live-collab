import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { consumirNotasPendientes, decodificarJson } from '../lib/enlace'
import { aplicarEntrada, ORIGEN_LOCAL } from './documento'
import type { SalaStore } from './sala'

/**
 * Sincronización sin servidor de dibujos.
 * Yjs guarda trazos, notas y el escenario. y-webrtc los reparte de navegador a
 * navegador. El servidor de señalización solo presenta a los pares (SDP);
 * el contenido va por un canal WebRTC. Las pestañas del mismo navegador
 * también se ven por BroadcastChannel, aunque la señalización falle.
 * y-indexeddb conserva la sala al recargar.
 */
export const SERVIDOR_SENAL = 'wss://y-webrtc-eu.fly.dev'
export const PREFIJO_SALA = 'ei-live-collab:'

export async function conectarSala(store: SalaStore): Promise<() => void> {
  const clave = `${PREFIJO_SALA}${store.sala}`
  let persistencia: IndexeddbPersistence | null = null
  try {
    persistencia = new IndexeddbPersistence(clave, store.doc)
    await Promise.race([
      persistencia.whenSynced,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  } catch (error) {
    console.warn('IndexedDB no disponible', error)
  }

  try {
    store.sembrarEscenario()
    const notas = consumirNotasPendientes()
    if (notas) {
      const marca = `ei-notas-aplicadas:${store.sala}:${notas.slice(0, 24)}`
      let ya = false
      try {
        ya = sessionStorage.getItem(marca) === '1'
      } catch {
        ya = false
      }
      if (!ya) {
        aplicarEntrada(store.doc, decodificarJson(notas), 'fusionar', ORIGEN_LOCAL)
        try {
          sessionStorage.setItem(marca, '1')
        } catch {
          /* el enlace ya se quitó del hash */
        }
      }
    }
  } catch (error) {
    store.avisar(error instanceof Error ? error.message : 'No se pudo leer el enlace')
  }

  let provider: WebrtcProvider | null = null
  try {
    provider = new WebrtcProvider(clave, store.doc, {
      signaling: [SERVIDOR_SENAL],
      maxConns: 24,
      filterBcConns: true,
    })
    store.vincularAwareness(provider.awareness)
    provider.on('status', (evento) => {
      store.marcarBuscando(evento.connected)
    })
  } catch (error) {
    console.warn('WebRTC no disponible', error)
    store.avisar('La sincronización en vivo no está disponible en este navegador. El lienzo sigue en este dispositivo.')
  }

  store.marcarListo()

  return () => {
    provider?.disconnect()
    provider?.destroy()
    void persistencia?.destroy()
    store.destruir()
  }
}
