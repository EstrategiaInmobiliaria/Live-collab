import * as Y from 'yjs'
import { leerParche } from '../lib/estado'
import { ESCENARIO_INICIAL } from '../lib/inmobiliaria'
import type { Escenario, EstadoLienzo, NotaJson, ParcheEstado, Trazo } from '../tipos'
import { VERSION_ESTADO } from '../tipos'

export const ORIGEN_LOCAL = 'local'
export const ORIGEN_SEMILLA = 'semilla'

const CLAVES_ESCENARIO: (keyof Escenario)[] = ['precio', 'metros', 'enganchePct', 'tasaAnual', 'plazoAnios']

export function arrayTrazos(doc: Y.Doc): Y.Array<Trazo> {
  return doc.getArray<Trazo>('trazos')
}

export function arrayNotas(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>('notas')
}

export function mapaEscenario(doc: Y.Doc): Y.Map<number> {
  return doc.getMap<number>('escenario')
}

function clonarTrazo(trazo: Trazo): Trazo {
  return {
    id: trazo.id,
    color: trazo.color,
    grosor: trazo.grosor,
    puntos: trazo.puntos.map((punto) => ({ x: punto.x, y: punto.y, p: punto.p })),
  }
}

function mapaNota(nota: NotaJson): Y.Map<unknown> {
  const mapa = new Y.Map<unknown>()
  const texto = new Y.Text()
  if (nota.texto) texto.insert(0, nota.texto)
  mapa.set('id', nota.id)
  mapa.set('x', nota.x)
  mapa.set('y', nota.y)
  mapa.set('color', nota.color)
  mapa.set('texto', texto)
  return mapa
}

export function leerNotas(doc: Y.Doc): NotaJson[] {
  const notas: NotaJson[] = []
  const arreglo = arrayNotas(doc)
  for (let i = 0; i < arreglo.length; i++) {
    const mapa = arreglo.get(i)
    const id = mapa.get('id')
    if (typeof id !== 'string') continue
    const texto = mapa.get('texto')
    notas.push({
      id,
      texto: texto instanceof Y.Text ? texto.toString() : '',
      x: typeof mapa.get('x') === 'number' ? (mapa.get('x') as number) : 0,
      y: typeof mapa.get('y') === 'number' ? (mapa.get('y') as number) : 0,
      color: typeof mapa.get('color') === 'string' ? (mapa.get('color') as string) : '#1e4d3d',
    })
  }
  return notas
}

export function leerTrazos(doc: Y.Doc): Trazo[] {
  return arrayTrazos(doc).toArray().map(clonarTrazo)
}

export function leerEscenario(doc: Y.Doc): Escenario {
  const mapa = mapaEscenario(doc)
  const escenario = { ...ESCENARIO_INICIAL }
  for (const clave of CLAVES_ESCENARIO) {
    const valor = mapa.get(clave)
    if (typeof valor === 'number' && Number.isFinite(valor)) escenario[clave] = valor
  }
  return escenario
}

export function exportarEstado(doc: Y.Doc, sala: string): EstadoLienzo {
  return {
    version: VERSION_ESTADO,
    sala,
    notas: leerNotas(doc),
    trazos: leerTrazos(doc),
    escenario: leerEscenario(doc),
  }
}

function indiceNota(doc: Y.Doc, id: string): number {
  const arreglo = arrayNotas(doc)
  for (let i = 0; i < arreglo.length; i++) {
    if (arreglo.get(i).get('id') === id) return i
  }
  return -1
}

function escribirNota(doc: Y.Doc, nota: NotaJson): void {
  const indice = indiceNota(doc, nota.id)
  if (indice === -1) {
    arrayNotas(doc).push([mapaNota(nota)])
    return
  }
  const mapa = arrayNotas(doc).get(indice)
  mapa.set('x', nota.x)
  mapa.set('y', nota.y)
  mapa.set('color', nota.color)
  const texto = mapa.get('texto')
  if (texto instanceof Y.Text) {
    if (texto.toString() !== nota.texto) {
      texto.delete(0, texto.length)
      if (nota.texto) texto.insert(0, nota.texto)
    }
  } else {
    const nuevo = new Y.Text()
    if (nota.texto) nuevo.insert(0, nota.texto)
    mapa.set('texto', nuevo)
  }
}

export function fusionarParche(doc: Y.Doc, parche: ParcheEstado, origen: unknown): void {
  doc.transact(() => {
    if (parche.trazos) {
      const existentes = new Set(leerTrazos(doc).map((trazo) => trazo.id))
      const nuevos = parche.trazos.filter((trazo) => !existentes.has(trazo.id)).map(clonarTrazo)
      if (nuevos.length) arrayTrazos(doc).push(nuevos)
    }
    if (parche.notas) {
      for (const nota of parche.notas) escribirNota(doc, nota)
    }
    if (parche.escenario) {
      const mapa = mapaEscenario(doc)
      for (const clave of CLAVES_ESCENARIO) {
        const valor = parche.escenario[clave]
        if (typeof valor === 'number' && Number.isFinite(valor)) mapa.set(clave, valor)
      }
    }
  }, origen)
}

export function reemplazarParche(doc: Y.Doc, parche: ParcheEstado, origen: unknown): void {
  doc.transact(() => {
    const trazos = arrayTrazos(doc)
    if (trazos.length) trazos.delete(0, trazos.length)
    if (parche.trazos?.length) trazos.insert(0, parche.trazos.map(clonarTrazo))
    const notas = arrayNotas(doc)
    if (notas.length) notas.delete(0, notas.length)
    if (parche.notas?.length) notas.insert(0, parche.notas.map(mapaNota))
    const mapa = mapaEscenario(doc)
    const escenario = { ...ESCENARIO_INICIAL, ...parche.escenario }
    for (const clave of CLAVES_ESCENARIO) mapa.set(clave, escenario[clave])
  }, origen)
}

export function aplicarEntrada(doc: Y.Doc, entrada: unknown, modo: 'fusionar' | 'reemplazar', origen: unknown): void {
  const parche = leerParche(entrada)
  if (modo === 'reemplazar') reemplazarParche(doc, parche, origen)
  else fusionarParche(doc, parche, origen)
}

export function asegurarEscenario(doc: Y.Doc, origen: unknown): void {
  doc.transact(() => {
    const mapa = mapaEscenario(doc)
    for (const clave of CLAVES_ESCENARIO) {
      if (!mapa.has(clave)) mapa.set(clave, ESCENARIO_INICIAL[clave])
    }
  }, origen)
}
