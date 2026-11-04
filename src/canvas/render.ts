import { pantallaAMundo, pasoRejilla, type Camara } from '../lib/camara'
import type { NotaJson, Trazo } from '../tipos'

export type Goma = { x: number; y: number; radio: number }
export type CursorRemoto = { x: number; y: number; color: string; nombre: string }

function dibujarTrazo(ctx: CanvasRenderingContext2D, trazo: Trazo): void {
  const puntos = trazo.puntos
  if (puntos.length === 0) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = trazo.color
  ctx.fillStyle = trazo.color
  if (puntos.length === 1) {
    const radio = Math.max(0.8, (trazo.grosor * puntos[0].p) / 2)
    ctx.beginPath()
    ctx.arc(puntos[0].x, puntos[0].y, radio, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]
    const b = puntos[i]
    ctx.beginPath()
    ctx.lineWidth = Math.max(0.8, trazo.grosor * ((a.p + b.p) / 2))
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function dibujarRejilla(ctx: CanvasRenderingContext2D, ancho: number, alto: number, camara: Camara, dpr: number): void {
  const paso = pasoRejilla(camara.escala)
  const a = pantallaAMundo(0, 0, camara)
  const b = pantallaAMundo(ancho, alto, camara)
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  ctx.setTransform(dpr * camara.escala, 0, 0, dpr * camara.escala, dpr * camara.x, dpr * camara.y)
  const desdeX = Math.floor(minX / paso) * paso
  const desdeY = Math.floor(minY / paso) * paso
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(90, 68, 42, 0.09)'
  ctx.lineWidth = 1 / camara.escala
  for (let x = desdeX; x <= maxX; x += paso) {
    ctx.moveTo(x, minY)
    ctx.lineTo(x, maxY)
  }
  for (let y = desdeY; y <= maxY; y += paso) {
    ctx.moveTo(minX, y)
    ctx.lineTo(maxX, y)
  }
  ctx.stroke()
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(90, 68, 42, 0.16)'
  for (let x = desdeX; x <= maxX; x += paso) {
    if (Math.round(x / paso) % 4 !== 0) continue
    ctx.moveTo(x, minY)
    ctx.lineTo(x, maxY)
  }
  for (let y = desdeY; y <= maxY; y += paso) {
    if (Math.round(y / paso) % 4 !== 0) continue
    ctx.moveTo(minX, y)
    ctx.lineTo(maxX, y)
  }
  ctx.stroke()
}

export function pintarLienzo(
  ctx: CanvasRenderingContext2D,
  opts: {
    ancho: number
    alto: number
    dpr: number
    camara: Camara
    trazos: Trazo[]
    borradores: Trazo[]
    goma: Goma | null
    cursores: CursorRemoto[]
  },
): void {
  const { ancho, alto, dpr, camara } = opts
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#fbf7f0'
  ctx.fillRect(0, 0, ancho, alto)
  dibujarRejilla(ctx, ancho, alto, camara, dpr)
  ctx.setTransform(dpr * camara.escala, 0, 0, dpr * camara.escala, dpr * camara.x, dpr * camara.y)
  for (const trazo of opts.trazos) dibujarTrazo(ctx, trazo)
  ctx.save()
  ctx.globalAlpha = 0.8
  for (const trazo of opts.borradores) dibujarTrazo(ctx, trazo)
  ctx.restore()
  if (opts.goma) {
    ctx.beginPath()
    ctx.arc(opts.goma.x, opts.goma.y, opts.goma.radio, 0, Math.PI * 2)
    ctx.strokeStyle = '#8c3a4b'
    ctx.lineWidth = 1.25 / camara.escala
    ctx.stroke()
  }
  ctx.font = `${12 / camara.escala}px Outfit, sans-serif`
  ctx.textBaseline = 'top'
  for (const cursor of opts.cursores) {
    ctx.beginPath()
    ctx.fillStyle = cursor.color
    ctx.arc(cursor.x, cursor.y, 4 / camara.escala, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = cursor.color
    ctx.fillText(cursor.nombre, cursor.x + 8 / camara.escala, cursor.y + 6 / camara.escala)
  }
}

function partirTexto(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let actual = ''
  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(candidato).width > ancho && actual) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = candidato
    }
  }
  if (actual) lineas.push(actual)
  return lineas.slice(0, 8)
}

export async function exportarPng(opts: {
  ancho: number
  alto: number
  camara: Camara
  trazos: Trazo[]
  notas: NotaJson[]
  sala: string
}): Promise<void> {
  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(opts.ancho * dpr))
  canvas.height = Math.max(1, Math.round(opts.alto * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear la imagen')
  pintarLienzo(ctx, {
    ancho: opts.ancho,
    alto: opts.alto,
    dpr,
    camara: opts.camara,
    trazos: opts.trazos,
    borradores: [],
    goma: null,
    cursores: [],
  })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.font = '14px Outfit, sans-serif'
  ctx.textBaseline = 'top'
  for (const nota of opts.notas) {
    const x = nota.x * opts.camara.escala + opts.camara.x
    const y = nota.y * opts.camara.escala + opts.camara.y
    const lineas = partirTexto(ctx, nota.texto || 'Nota', 164)
    const altoNota = 16 + lineas.length * 18
    ctx.fillStyle = '#fff8e8'
    ctx.strokeStyle = nota.color
    ctx.lineWidth = 1
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, 180, altoNota, 8)
    else ctx.rect(x, y, 180, altoNota)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1a2332'
    lineas.forEach((linea, indice) => ctx.fillText(linea, x + 8, y + 8 + indice * 18))
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo exportar el PNG')
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `estrategia-inmobiliaria-${opts.sala}.png`
  enlace.click()
  URL.revokeObjectURL(url)
}
