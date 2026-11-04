import { ESCENARIO_INICIAL } from './inmobiliaria'
import type { Escenario, EstadoLienzo, NotaJson, ParcheEstado, Punto, Trazo } from '../tipos'
import { VERSION_ESTADO } from '../tipos'

const MAX_NOTAS = 200
const MAX_TRAZOS = 2000
const MAX_PUNTOS = 20_000
const MAX_TEXTO = 4_000

function esObjeto(dato: unknown): dato is Record<string, unknown> {
  return typeof dato === 'object' && dato !== null && !Array.isArray(dato)
}

function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string') throw new Error(`«${campo}» tiene que ser texto`)
  const limpio = valor.replace(/\u0000/g, '').slice(0, MAX_TEXTO)
  return limpio
}

function numero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new Error(`«${campo}» tiene que ser un número`)
  }
  return valor
}

function colorDe(valor: unknown, respaldo: string): string {
  if (typeof valor !== 'string') return respaldo
  const limpio = valor.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(limpio)) return limpio.toLowerCase()
  return respaldo
}

function idDe(valor: unknown, crear: boolean): string {
  if (typeof valor === 'string') {
    const limpio = valor.trim().slice(0, 80)
    if (limpio) return limpio
  }
  if (!crear) throw new Error('Falta el id')
  return `id-${Math.random().toString(36).slice(2, 10)}`
}

function leerPunto(valor: unknown): Punto | null {
  if (!esObjeto(valor)) return null
  const x = valor.x
  const y = valor.y
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const p = typeof valor.p === 'number' && Number.isFinite(valor.p) ? Math.min(1.6, Math.max(0.05, valor.p)) : 0.6
  return { x, y, p }
}

function leerNota(valor: unknown, indice: number): NotaJson {
  if (!esObjeto(valor)) throw new Error(`La nota ${indice + 1} no es un objeto`)
  return {
    id: idDe(valor.id, true),
    texto: typeof valor.texto === 'string' ? texto(valor.texto, 'texto') : '',
    x: typeof valor.x === 'number' && Number.isFinite(valor.x) ? valor.x : 48 + indice * 16,
    y: typeof valor.y === 'number' && Number.isFinite(valor.y) ? valor.y : 48 + indice * 16,
    color: colorDe(valor.color, '#1e4d3d'),
  }
}

function leerTrazo(valor: unknown, indice: number): Trazo {
  if (!esObjeto(valor)) throw new Error(`El trazo ${indice + 1} no es un objeto`)
  if (!Array.isArray(valor.puntos)) throw new Error(`El trazo ${indice + 1} no trae puntos`)
  const puntos = valor.puntos.map(leerPunto).filter((p): p is Punto => p !== null)
  if (puntos.length > MAX_PUNTOS) throw new Error('Un trazo trae demasiados puntos')
  const grosorBruto = typeof valor.grosor === 'number' ? valor.grosor : 3
  return {
    id: idDe(valor.id, true),
    color: colorDe(valor.color, '#1a2332'),
    grosor: Math.min(64, Math.max(0.5, grosorBruto)),
    puntos,
  }
}

function leerEscenario(valor: unknown): Partial<Escenario> {
  if (!esObjeto(valor)) throw new Error('El escenario tiene que ser un objeto')
  const salida: Partial<Escenario> = {}
  const claves: (keyof Escenario)[] = ['precio', 'metros', 'enganchePct', 'tasaAnual', 'plazoAnios']
  for (const clave of claves) {
    if (clave in valor) salida[clave] = numero(valor[clave], clave)
  }
  return salida
}

export function leerParche(dato: unknown): ParcheEstado {
  if (Array.isArray(dato)) {
    if (dato.length > MAX_NOTAS) throw new Error('Hay demasiadas notas')
    return { notas: dato.map(leerNota) }
  }
  if (typeof dato === 'string') {
    try {
      return leerParche(JSON.parse(dato) as unknown)
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('El JSON no se pudo leer')
      throw error
    }
  }
  if (!esObjeto(dato)) throw new Error('El estado tiene que ser un objeto JSON')
  if ('version' in dato && dato.version !== VERSION_ESTADO) {
    throw new Error('La versión del estado no es compatible')
  }
  const parche: ParcheEstado = {}
  if ('sala' in dato && dato.sala !== undefined) parche.sala = texto(dato.sala, 'sala')
  if ('notas' in dato) {
    if (!Array.isArray(dato.notas)) throw new Error('«notas» tiene que ser una lista')
    if (dato.notas.length > MAX_NOTAS) throw new Error('Hay demasiadas notas')
    parche.notas = dato.notas.map(leerNota)
  }
  if ('trazos' in dato) {
    if (!Array.isArray(dato.trazos)) throw new Error('«trazos» tiene que ser una lista')
    if (dato.trazos.length > MAX_TRAZOS) throw new Error('Hay demasiados trazos')
    parche.trazos = dato.trazos.map(leerTrazo).filter((trazo) => trazo.puntos.length > 0)
  }
  if ('escenario' in dato && dato.escenario !== undefined) parche.escenario = leerEscenario(dato.escenario)
  return parche
}

export function estadoDesdeParche(parche: ParcheEstado, sala: string): EstadoLienzo {
  return {
    version: VERSION_ESTADO,
    sala: parche.sala || sala,
    notas: parche.notas ?? [],
    trazos: parche.trazos ?? [],
    escenario: { ...ESCENARIO_INICIAL, ...parche.escenario },
  }
}

export function serializarEstado(estado: EstadoLienzo): string {
  return JSON.stringify(estado, null, 2)
}
