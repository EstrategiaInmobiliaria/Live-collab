export type Punto = {
  x: number
  y: number
  /** Grosor relativo del punto. 1 es presión plena; puede subir un poco con la inclinación del S Pen. */
  p: number
}

export type Trazo = {
  id: string
  color: string
  grosor: number
  puntos: Punto[]
}

export type NotaJson = {
  id: string
  texto: string
  x: number
  y: number
  color: string
}

export type Escenario = {
  precio: number
  metros: number
  enganchePct: number
  tasaAnual: number
  plazoAnios: number
}

/** Documento que un asistente puede leer o escribir. */
export type EstadoLienzo = {
  version: 1
  sala: string
  notas: NotaJson[]
  trazos: Trazo[]
  escenario: Escenario
}

export type ParcheEstado = {
  sala?: string
  notas?: NotaJson[]
  trazos?: Trazo[]
  escenario?: Partial<Escenario>
}

export type Herramienta = 'pluma' | 'borrador' | 'nota' | 'mano'

export type ModoEstado = 'fusionar' | 'reemplazar'

export const VERSION_ESTADO = 1 as const

export const COLORES_PLUMA = [
  { nombre: 'Tinta', valor: '#1a2332' },
  { nombre: 'Bosque', valor: '#1e4d3d' },
  { nombre: 'Cobre', valor: '#c56a3a' },
  { nombre: 'Vino', valor: '#8c3a4b' },
  { nombre: 'Azul', valor: '#245c86' },
  { nombre: 'Oro', valor: '#8d6b2f' },
] as const
