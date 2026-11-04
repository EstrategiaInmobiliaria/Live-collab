/// <reference types="vite/client" />

import type { EstadoLienzo } from './tipos'

type NotaEntrada = {
  texto: string
  x?: number
  y?: number
  color?: string
  id?: string
}

interface LiveCollabApi {
  obtenerEstado: () => EstadoLienzo
  aplicarEstado: (estado: unknown, modo?: 'fusionar' | 'reemplazar') => void
  agregarNota: (nota: NotaEntrada) => string
  sala: () => string
  suscribir: (fn: (estado: EstadoLienzo) => void) => () => void
}

declare global {
  interface Window {
    liveCollab?: LiveCollabApi
  }
}

export {}
