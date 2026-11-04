import { describe, expect, it } from 'vitest'
import {
  ENFRIAMIENTO_PLUMA_MS,
  esBorradorHardware,
  factorInclinacion,
  grosorPunto,
  ignorarToque,
  presionDeTrazo,
} from './puntero'

describe('S Pen y palma', () => {
  it('reconoce el botón borrador del lápiz', () => {
    expect(esBorradorHardware(5, 0)).toBe(true)
    expect(esBorradorHardware(0, 32)).toBe(true)
    expect(esBorradorHardware(0, 1)).toBe(false)
  })

  it('usa la presión del lápiz y un respaldo si el navegador manda 0', () => {
    expect(presionDeTrazo('pen', 0.25, 1)).toBeCloseTo(0.25)
    expect(presionDeTrazo('pen', 0, 1)).toBeCloseTo(0.55)
    expect(presionDeTrazo('mouse', 0.1, 1)).toBeCloseTo(0.72)
    expect(presionDeTrazo('touch', 1, 1)).toBeCloseTo(0.62)
  })

  it('engrosa un poco el trazo cuando el lápiz va inclinado', () => {
    expect(factorInclinacion(undefined)).toBe(1)
    expect(factorInclinacion(Math.PI / 2)).toBeCloseTo(1)
    expect(factorInclinacion(0)).toBeCloseTo(1.35)
    const fino = grosorPunto('pen', 0.4, 1, Math.PI / 2)
    const inclinado = grosorPunto('pen', 0.4, 1, 0)
    expect(inclinado).toBeGreaterThan(fino)
  })

  it('ignora el dedo mientras la pluma está en contacto o acaba de usarse', () => {
    expect(
      ignorarToque({ pointerType: 'touch', contactoPluma: true, msDesdeUltimaPluma: 5_000 }),
    ).toBe(true)
    expect(
      ignorarToque({
        pointerType: 'touch',
        contactoPluma: false,
        msDesdeUltimaPluma: ENFRIAMIENTO_PLUMA_MS - 1,
      }),
    ).toBe(true)
    expect(
      ignorarToque({
        pointerType: 'touch',
        contactoPluma: false,
        msDesdeUltimaPluma: ENFRIAMIENTO_PLUMA_MS + 1,
      }),
    ).toBe(false)
    expect(
      ignorarToque({ pointerType: 'pen', contactoPluma: true, msDesdeUltimaPluma: 0 }),
    ).toBe(false)
  })
})
