import { describe, expect, it } from 'vitest'
import { ESCENARIO_INICIAL, calcularEscenario, pagoMensual } from './inmobiliaria'

describe('cálculo inmobiliario', () => {
  it('calcula una hipoteca conocida de amortización francesa', () => {
    const pago = pagoMensual(200_000, 6, 30)
    expect(pago).not.toBeNull()
    expect(pago!).toBeCloseTo(1199.1, 0)
  })

  it('reparte el principal cuando la tasa es cero', () => {
    expect(pagoMensual(1200, 0, 1)).toBeCloseTo(100)
  })

  it('rechaza plazos y montos que no se pueden calcular', () => {
    expect(pagoMensual(-1, 10, 10)).toBeNull()
    expect(pagoMensual(1000, 10, 0)).toBeNull()
  })

  it('desglosa precio por m², enganche y saldo', () => {
    const r = calcularEscenario(ESCENARIO_INICIAL)
    expect(r.precioM2).toBeCloseTo(3_250_000 / 86)
    expect(r.enganche).toBe(650_000)
    expect(r.aFinanciar).toBe(2_600_000)
    expect(r.pagoMensual).toBeGreaterThan(0)
  })

  it('no calcula enganche si el porcentaje sale del 0 al 100', () => {
    const r = calcularEscenario({ ...ESCENARIO_INICIAL, enganchePct: 120 })
    expect(r.enganche).toBeNull()
    expect(r.pagoMensual).toBeNull()
    expect(r.precioM2).not.toBeNull()
  })
})
