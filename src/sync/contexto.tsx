import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Instantanea, SalaStore } from './sala'

export const SalaContext = createContext<SalaStore | null>(null)

export function useSala(): SalaStore {
  const store = useContext(SalaContext)
  if (!store) throw new Error('La sala todavía no está lista')
  return store
}

export function useInstantanea(): Instantanea {
  const store = useSala()
  return useSyncExternalStore(store.suscribir, store.obtener, store.obtener)
}
