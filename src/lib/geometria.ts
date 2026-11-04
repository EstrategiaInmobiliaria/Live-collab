import type { Punto, Trazo } from '../tipos'

export function distancia(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanciaPuntoSegmento(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const largo2 = abx * abx + aby * aby
  if (largo2 === 0) return distancia(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / largo2))
  return distancia(p, { x: a.x + abx * t, y: a.y + aby * t })
}

export function debeAgregarPunto(ultimo: Punto | undefined, siguiente: Punto, minDist = 0.75): boolean {
  if (!ultimo) return true
  return distancia(ultimo, siguiente) >= minDist
}

function densificar(puntos: Punto[], paso: number): Punto[] {
  if (puntos.length <= 1) return puntos.map((p) => ({ ...p }))
  const salida: Punto[] = []
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]
    const b = puntos[i]
    const n = Math.max(1, Math.ceil(distancia(a, b) / paso))
    const desde = i === 1 ? 0 : 1
    for (let s = desde; s <= n; s++) {
      const t = s / n
      salida.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        p: a.p + (b.p - a.p) * t,
      })
    }
  }
  return salida
}

function puntoEnGoma(p: Punto, goma: Punto[], radio: number): boolean {
  if (goma.length === 0) return false
  if (goma.length === 1) return distancia(p, goma[0]) <= radio
  for (let i = 1; i < goma.length; i++) {
    if (distanciaPuntoSegmento(p, goma[i - 1], goma[i]) <= radio) return true
  }
  return distancia(p, goma[0]) <= radio
}

export function partirTrazo(trazo: Trazo, goma: Punto[], radio: number, nuevoId: () => string): Trazo[] {
  if (goma.length === 0 || radio <= 0 || trazo.puntos.length === 0) return [trazo]
  const paso = Math.max(2, radio / 2)
  const densos = densificar(trazo.puntos, paso)
  const vivo = densos.map((p) => !puntoEnGoma(p, goma, radio))
  if (vivo.every(Boolean)) return [trazo]
  if (vivo.every((v) => !v)) return []

  const grupos: Punto[][] = []
  let actual: Punto[] = []
  vivo.forEach((estaVivo, i) => {
    if (estaVivo) actual.push(densos[i])
    else if (actual.length > 0) {
      grupos.push(actual)
      actual = []
    }
  })
  if (actual.length > 0) grupos.push(actual)

  return grupos.map((puntos, indice) => ({
    id: indice === 0 ? trazo.id : nuevoId(),
    color: trazo.color,
    grosor: trazo.grosor,
    puntos,
  }))
}

export function cajaDe(trazos: Trazo[], notas: { x: number; y: number }[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const tocar = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const trazo of trazos) {
    for (const p of trazo.puntos) tocar(p.x, p.y)
  }
  for (const nota of notas) {
    tocar(nota.x, nota.y)
    tocar(nota.x + 180, nota.y + 90)
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}
