export type Camara = { x: number; y: number; escala: number }

export const ESCALA_MIN = 0.25
export const ESCALA_MAX = 8

export type Caja = { minX: number; minY: number; maxX: number; maxY: number }

export function limitarEscala(escala: number): number {
  if (!Number.isFinite(escala)) return 1
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala))
}

export function pantallaAMundo(sx: number, sy: number, cam: Camara): { x: number; y: number } {
  return { x: (sx - cam.x) / cam.escala, y: (sy - cam.y) / cam.escala }
}

export function mundoAPantalla(wx: number, wy: number, cam: Camara): { x: number; y: number } {
  return { x: wx * cam.escala + cam.x, y: wy * cam.escala + cam.y }
}

/** Mantiene fijo el punto de mundo que está bajo (sx, sy). */
export function zoomEn(cam: Camara, sx: number, sy: number, factor: number): Camara {
  const escala = limitarEscala(cam.escala * factor)
  const mundo = pantallaAMundo(sx, sy, cam)
  return {
    escala,
    x: sx - mundo.x * escala,
    y: sy - mundo.y * escala,
  }
}

export function camaraTrasPellizco(
  inicio: { distancia: number; escala: number; mundoMedio: { x: number; y: number } },
  distancia: number,
  medioPantalla: { x: number; y: number },
): Camara {
  const factor = inicio.distancia > 0 ? distancia / inicio.distancia : 1
  const escala = limitarEscala(inicio.escala * factor)
  return {
    escala,
    x: medioPantalla.x - inicio.mundoMedio.x * escala,
    y: medioPantalla.y - inicio.mundoMedio.y * escala,
  }
}

export function encuadrar(
  ancho: number,
  alto: number,
  caja: Caja | null,
  padding = 48,
): Camara {
  if (!caja) return { x: 0, y: 0, escala: 1 }
  const w = Math.max(caja.maxX - caja.minX, 1)
  const h = Math.max(caja.maxY - caja.minY, 1)
  const usableW = Math.max(ancho - padding * 2, 40)
  const usableH = Math.max(alto - padding * 2, 40)
  const escala = limitarEscala(Math.min(usableW / w, usableH / h))
  const cx = (caja.minX + caja.maxX) / 2
  const cy = (caja.minY + caja.maxY) / 2
  return {
    escala,
    x: ancho / 2 - cx * escala,
    y: alto / 2 - cy * escala,
  }
}

export function pasoRejilla(escala: number): number {
  const segura = limitarEscala(escala)
  const crudo = 28 / segura
  const potencia = 10 ** Math.floor(Math.log10(crudo))
  const n = crudo / potencia
  const bonito = n < 2 ? 1 : n < 5 ? 2 : 5
  return bonito * potencia
}
