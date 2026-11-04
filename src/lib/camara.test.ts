import { describe, expect, it } from 'vitest'
import { camaraTrasPellizco, encuadrar, pantallaAMundo, pasoRejilla, zoomEn } from './camara'

describe('cámara', () => {
  it('conserva el punto bajo el cursor al hacer zoom', () => {
    const cam = { x: 20, y: -10, escala: 1 }
    const siguiente = zoomEn(cam, 100, 80, 2)
    const antes = pantallaAMundo(100, 80, cam)
    const despues = pantallaAMundo(100, 80, siguiente)
    expect(despues.x).toBeCloseTo(antes.x)
    expect(despues.y).toBeCloseTo(antes.y)
    expect(siguiente.escala).toBe(2)
  })

  it('el pellizco ancla el punto medio', () => {
    const inicio = { distancia: 100, escala: 1, mundoMedio: { x: 40, y: 10 } }
    const cam = camaraTrasPellizco(inicio, 200, { x: 150, y: 90 })
    expect(cam.escala).toBe(2)
    expect(cam.x).toBeCloseTo(150 - 40 * 2)
    expect(cam.y).toBeCloseTo(90 - 10 * 2)
  })

  it('encuadra una caja dentro del viewport', () => {
    const cam = encuadrar(400, 300, { minX: 0, minY: 0, maxX: 200, maxY: 100 })
    expect(cam.escala).toBeGreaterThan(1)
    const centro = pantallaAMundo(200, 150, cam)
    expect(centro.x).toBeCloseTo(100)
    expect(centro.y).toBeCloseTo(50)
  })

  it('espacia la rejilla para que no se sature al alejar', () => {
    expect(pasoRejilla(1)).toBeGreaterThan(10)
    expect(pasoRejilla(0.25)).toBeGreaterThan(pasoRejilla(1))
  })
})
