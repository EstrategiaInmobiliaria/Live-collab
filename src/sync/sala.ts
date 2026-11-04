import type { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import { partirTrazo } from '../lib/geometria'
import { crearId } from '../lib/id'
import type { Escenario, EstadoLienzo, ModoEstado, NotaJson, Punto, Trazo } from '../tipos'
import {
  aplicarEntrada,
  arrayNotas,
  arrayTrazos,
  asegurarEscenario,
  exportarEstado,
  fusionarParche,
  mapaEscenario,
  ORIGEN_LOCAL,
  ORIGEN_SEMILLA,
} from './documento'

const PALETA = ['#1e4d3d', '#c56a3a', '#245c86', '#8c3a4b', '#6a4c93', '#8d6b2f']

export type Par = { id: number; nombre: string; color: string }

export type Presencia = {
  id: number
  nombre: string
  color: string
  cursor: { x: number; y: number } | null
  borrador: Trazo | null
  goma: { x: number; y: number; radio: number } | null
}

export type Instantanea = {
  sala: string
  trazos: Trazo[]
  notas: NotaJson[]
  escenario: Escenario
  puedeDeshacer: boolean
  puedeRehacer: boolean
  pares: Par[]
  listo: boolean
  buscando: boolean
  aviso: string | null
  nombre: string
}

type Perfil = { nombre: string; color: string }

function perfilLocal(): Perfil {
  try {
    const crudo = localStorage.getItem('ei-live-collab-perfil')
    if (crudo) {
      const perfil = JSON.parse(crudo) as Partial<Perfil>
      if (typeof perfil.nombre === 'string' && typeof perfil.color === 'string' && perfil.nombre.trim()) {
        return { nombre: perfil.nombre.trim().slice(0, 40), color: perfil.color }
      }
    }
  } catch {
    /* modo privado o JSON viejo */
  }
  const perfil = {
    nombre: `Participante ${Math.floor(100 + Math.random() * 900)}`,
    color: PALETA[Math.floor(Math.random() * PALETA.length)],
  }
  try {
    localStorage.setItem('ei-live-collab-perfil', JSON.stringify(perfil))
  } catch {
    /* sin almacenamiento */
  }
  return perfil
}

function puntoDe(valor: unknown): { x: number; y: number } | null {
  if (!valor || typeof valor !== 'object') return null
  const punto = valor as { x?: unknown; y?: unknown }
  if (typeof punto.x !== 'number' || typeof punto.y !== 'number') return null
  if (!Number.isFinite(punto.x) || !Number.isFinite(punto.y)) return null
  return { x: punto.x, y: punto.y }
}

function trazoDe(valor: unknown): Trazo | null {
  if (!valor || typeof valor !== 'object') return null
  const trazo = valor as Partial<Trazo>
  if (typeof trazo.id !== 'string' || typeof trazo.color !== 'string' || typeof trazo.grosor !== 'number') return null
  if (!Array.isArray(trazo.puntos)) return null
  const puntos = trazo.puntos.filter(
    (punto): punto is Punto =>
      !!punto && typeof punto.x === 'number' && typeof punto.y === 'number' && typeof punto.p === 'number',
  )
  if (puntos.length === 0) return null
  return { id: trazo.id, color: trazo.color, grosor: trazo.grosor, puntos }
}

function gomaDe(valor: unknown): Presencia['goma'] {
  if (!valor || typeof valor !== 'object') return null
  const goma = valor as { x?: unknown; y?: unknown; radio?: unknown }
  if (typeof goma.x !== 'number' || typeof goma.y !== 'number' || typeof goma.radio !== 'number') return null
  return { x: goma.x, y: goma.y, radio: goma.radio }
}

export class SalaStore {
  readonly doc: Y.Doc
  readonly historial: Y.UndoManager
  nombre: string
  readonly color: string
  private instantanea: Instantanea
  private oyentes = new Set<() => void>()
  private awareness: Awareness | null = null
  private quitarAwareness: (() => void) | null = null
  private oyentePresencia: (() => void) | null = null
  private firmaPares = ''
  private listo = false
  private buscando = false
  private aviso: string | null = null

  constructor(
    readonly sala: string,
    doc = new Y.Doc(),
  ) {
    const perfil = perfilLocal()
    this.nombre = perfil.nombre
    this.color = perfil.color
    this.doc = doc
    this.historial = new Y.UndoManager([arrayTrazos(doc), arrayNotas(doc)], {
      trackedOrigins: new Set([ORIGEN_LOCAL]),
      captureTimeout: 500,
    })
    this.instantanea = this.capturar()
    this.doc.on('update', this.refrescar)
    this.historial.on('stack-item-added', this.refrescar)
    this.historial.on('stack-item-popped', this.refrescar)
    this.historial.on('stack-cleared', this.refrescar)
  }

  suscribir = (fn: () => void) => {
    this.oyentes.add(fn)
    return () => {
      this.oyentes.delete(fn)
    }
  }

  obtener = () => this.instantanea

  private refrescar = () => {
    this.instantanea = this.capturar()
    for (const fn of this.oyentes) fn()
  }

  private capturar(): Instantanea {
    const estado = exportarEstado(this.doc, this.sala)
    return {
      sala: this.sala,
      trazos: estado.trazos,
      notas: estado.notas,
      escenario: estado.escenario,
      puedeDeshacer: this.historial.canUndo(),
      puedeRehacer: this.historial.canRedo(),
      pares: this.leerPares(),
      listo: this.listo,
      buscando: this.buscando,
      aviso: this.aviso,
      nombre: this.nombre,
    }
  }

  private leerPares(): Par[] {
    if (!this.awareness) return []
    const pares: Par[] = []
    this.awareness.getStates().forEach((estado, id) => {
      if (id === this.awareness?.clientID) return
      const usuario = estado.usuario as { nombre?: unknown; color?: unknown } | undefined
      pares.push({
        id,
        nombre: typeof usuario?.nombre === 'string' && usuario.nombre.trim() ? usuario.nombre : 'Invitado',
        color: typeof usuario?.color === 'string' ? usuario.color : '#245c86',
      })
    })
    pares.sort((a, b) => a.id - b.id)
    return pares
  }

  obtenerEstado(): EstadoLienzo {
    return exportarEstado(this.doc, this.sala)
  }

  fijarOyentePresencia(fn: (() => void) | null): void {
    this.oyentePresencia = fn
  }

  leerPresencia(): Presencia[] {
    if (!this.awareness) return []
    const presencia: Presencia[] = []
    this.awareness.getStates().forEach((estado, id) => {
      if (id === this.awareness?.clientID) return
      const usuario = estado.usuario as { nombre?: unknown; color?: unknown } | undefined
      presencia.push({
        id,
        nombre: typeof usuario?.nombre === 'string' ? usuario.nombre : 'Invitado',
        color: typeof usuario?.color === 'string' ? usuario.color : '#245c86',
        cursor: puntoDe(estado.cursor),
        borrador: trazoDe(estado.borrador),
        goma: gomaDe(estado.goma),
      })
    })
    return presencia
  }

  vincularAwareness(awareness: Awareness): void {
    this.quitarAwareness?.()
    this.awareness = awareness
    awareness.setLocalState({
      ...(awareness.getLocalState() ?? {}),
      usuario: { nombre: this.nombre, color: this.color },
      cursor: null,
      borrador: null,
      goma: null,
    })
    const cambio = () => {
      const firma = this.leerPares()
        .map((par) => `${par.id}:${par.nombre}:${par.color}`)
        .join('|')
      if (firma !== this.firmaPares) {
        this.firmaPares = firma
        this.refrescar()
      }
      this.oyentePresencia?.()
    }
    awareness.on('change', cambio)
    this.quitarAwareness = () => awareness.off('change', cambio)
    cambio()
  }

  publicarPresencia(parcial: { cursor: { x: number; y: number } | null; borrador: Trazo | null; goma: Presencia['goma'] }): void {
    if (!this.awareness) return
    const actual = this.awareness.getLocalState() ?? {}
    this.awareness.setLocalState({
      ...actual,
      usuario: { nombre: this.nombre, color: this.color },
      cursor: parcial.cursor,
      borrador: parcial.borrador,
      goma: parcial.goma,
    })
  }

  fijarNombre(nombre: string): void {
    const limpio = nombre.trim().slice(0, 40)
    if (!limpio || limpio === this.nombre) return
    this.nombre = limpio
    try {
      localStorage.setItem('ei-live-collab-perfil', JSON.stringify({ nombre: limpio, color: this.color }))
    } catch {
      /* sin almacenamiento */
    }
    if (this.awareness) {
      const actual = this.awareness.getLocalState() ?? {}
      this.awareness.setLocalState({ ...actual, usuario: { nombre: limpio, color: this.color } })
    }
    this.refrescar()
  }

  marcarListo(): void {
    this.listo = true
    this.refrescar()
  }

  marcarBuscando(buscando: boolean): void {
    if (this.buscando === buscando) return
    this.buscando = buscando
    this.refrescar()
  }

  avisar(aviso: string | null): void {
    this.aviso = aviso
    this.refrescar()
  }

  agregarTrazo(trazo: Trazo): void {
    if (trazo.puntos.length === 0) return
    fusionarParche(this.doc, { trazos: [trazo] }, ORIGEN_LOCAL)
    this.historial.stopCapturing()
  }

  borrarConCamino(puntos: Punto[], radio: number): void {
    if (puntos.length === 0 || radio <= 0) return
    this.doc.transact(() => {
      const arreglo = arrayTrazos(this.doc)
      for (let i = arreglo.length - 1; i >= 0; i--) {
        const trazo = arreglo.get(i)
        const partes = partirTrazo(trazo, puntos, radio, crearId)
        if (partes.length === 1 && partes[0] === trazo) continue
        arreglo.delete(i, 1)
        if (partes.length > 0) arreglo.insert(i, partes)
      }
    }, ORIGEN_LOCAL)
    this.historial.stopCapturing()
  }

  agregarNota(nota: { id?: string; texto: string; x: number; y: number; color?: string }): string {
    const id = nota.id?.trim() || crearId()
    fusionarParche(
      this.doc,
      { notas: [{ id, texto: nota.texto, x: nota.x, y: nota.y, color: nota.color ?? '#1e4d3d' }] },
      ORIGEN_LOCAL,
    )
    this.historial.stopCapturing()
    return id
  }

  private mapaDeNota(id: string): Y.Map<unknown> | null {
    const arreglo = arrayNotas(this.doc)
    for (let i = 0; i < arreglo.length; i++) {
      const mapa = arreglo.get(i)
      if (mapa.get('id') === id) return mapa
    }
    return null
  }

  moverNota(id: string, x: number, y: number): void {
    this.doc.transact(() => {
      const mapa = this.mapaDeNota(id)
      if (!mapa) return
      mapa.set('x', x)
      mapa.set('y', y)
    }, ORIGEN_LOCAL)
  }

  editarNota(id: string, texto: string): void {
    this.doc.transact(() => {
      const mapa = this.mapaDeNota(id)
      if (!mapa) return
      const actual = mapa.get('texto')
      if (actual instanceof Y.Text) {
        if (actual.toString() === texto) return
        actual.delete(0, actual.length)
        if (texto) actual.insert(0, texto)
      }
    }, ORIGEN_LOCAL)
  }

  eliminarNota(id: string): void {
    this.doc.transact(() => {
      const arreglo = arrayNotas(this.doc)
      for (let i = arreglo.length - 1; i >= 0; i--) {
        if (arreglo.get(i).get('id') === id) arreglo.delete(i, 1)
      }
    }, ORIGEN_LOCAL)
    this.historial.stopCapturing()
  }

  actualizarEscenario(parcial: Partial<Escenario>): void {
    this.doc.transact(() => {
      const mapa = mapaEscenario(this.doc)
      for (const [clave, valor] of Object.entries(parcial) as [keyof Escenario, number | undefined][]) {
        if (typeof valor === 'number' && Number.isFinite(valor)) mapa.set(clave, valor)
      }
    }, 'escenario')
  }

  aplicar(entrada: unknown, modo: ModoEstado): void {
    try {
      aplicarEntrada(this.doc, entrada, modo, ORIGEN_LOCAL)
      this.historial.stopCapturing()
      this.avisar(null)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo aplicar el estado'
      this.avisar(mensaje)
      throw new Error(mensaje)
    }
  }

  deshacer(): void {
    this.historial.undo()
  }

  rehacer(): void {
    this.historial.redo()
  }

  sembrarEscenario(): void {
    asegurarEscenario(this.doc, ORIGEN_SEMILLA)
  }

  destruir(): void {
    this.quitarAwareness?.()
    this.doc.off('update', this.refrescar)
    this.historial.destroy()
    this.doc.destroy()
  }
}
