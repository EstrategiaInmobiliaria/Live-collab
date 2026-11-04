import { describe, expect, it } from 'vitest'
import type { Trazo } from '../tipos'
import { debeAgregarPunto, partirTrazo } from './geometria'

const linea = (puntos: Trazo['puntos']): Trazo => ({
  id: 't1',
  color: '#1a2332',
  grosor: 4,
  puntos,
})

describe('borrador vectorial', () => {
  it('parte un segmento largo aunque el borrador no toque los extremos', () => {
    const trazo = linea([
      { x: 0, y: 0, p: 1 },
      { x: 100, y: 0, p: 1 },
    ])
    const partes = partirTrazo(trazo, [{ x: 50, y: 0, p: 1 }], 8, () => 'nuevo')
    expect(partes).toHaveLength(2)
    expect(partes[0].id).toBe('t1')
    expect(partes[1].id).toBe('nuevo')
    expect(partes[0].puntos[partes[0].puntos.length - 1].x).toBeLessThan(50)
    expect(partes[1].puntos[0].x).toBeGreaterThan(50)
  })

  it('deja el trazo intacto si la goma está lejos', () => {
    const trazo = linea([
      { x: 0, y: 0, p: 1 },
      { x: 20, y: 0, p: 1 },
    ])
    const partes = partirTrazo(trazo, [{ x: 80, y: 40, p: 1 }], 6, () => 'nuevo')
    expect(partes).toEqual([trazo])
  })

  it('elimina un punto suelto cubierto por la goma', () => {
    const trazo = linea([{ x: 10, y: 10, p: 0.4 }])
    expect(partirTrazo(trazo, [{ x: 12, y: 11, p: 1 }], 6, () => 'x')).toEqual([])
  })

  it('filtra puntos casi repetidos', () => {
    const ultimo = { x: 0, y: 0, p: 1 }
    expect(debeAgregarPunto(ultimo, { x: 0.2, y: 0, p: 1 })).toBe(false)
    expect(debeAgregarPunto(ultimo, { x: 2, y: 0, p: 1 })).toBe(true)
  })
})
