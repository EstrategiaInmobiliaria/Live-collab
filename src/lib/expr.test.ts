import { describe, expect, it } from 'vitest'
import { alternarSigno, borrarUltimo, evaluar, formatearResultado } from './expr'

describe('calculadora', () => {
  it('resuelve aritmética y porcentajes', () => {
    expect(evaluar('2+2').ok && evaluar('2+2')).toMatchObject({ ok: true, valor: 4 })
    expect(evaluar('100*15%')).toMatchObject({ ok: true, valor: 15 })
    expect(evaluar('(2+3)*4')).toMatchObject({ ok: true, valor: 20 })
  })

  it('usa grados en la trigonometría', () => {
    const seno = evaluar('sin(30)')
    expect(seno.ok).toBe(true)
    if (seno.ok) expect(seno.valor).toBeCloseTo(0.5)
    expect(evaluar('sqrt(9)')).toMatchObject({ ok: true, valor: 3 })
    expect(evaluar('2^10')).toMatchObject({ ok: true, valor: 1024 })
    expect(evaluar('5!')).toMatchObject({ ok: true, valor: 120 })
  })

  it('explica divisiones entre cero y factoriales inválidos', () => {
    expect(evaluar('1/0')).toMatchObject({ ok: false })
    expect(evaluar('2.5!')).toMatchObject({ ok: false })
  })

  it('edita la expresión desde el teclado en pantalla', () => {
    expect(borrarUltimo('sin(30)')).toBe('sin(30')
    expect(borrarUltimo('12+sin')).toBe('12+')
    expect(alternarSigno('8')).toBe('-(8)')
    expect(alternarSigno('-(8)')).toBe('8')
    expect(formatearResultado(0.1 + 0.2)).toBe('0.3')
  })
})
