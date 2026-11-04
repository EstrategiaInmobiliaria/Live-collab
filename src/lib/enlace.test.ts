import { describe, expect, it } from 'vitest'
import { codificarJson, decodificarJson, leerHash, normalizarSala } from './enlace'

describe('enlace de sala', () => {
  it('normaliza el nombre de la sala', () => {
    expect(normalizarSala('Visita Roma Norte')).toBe('visita-roma-norte')
    expect(normalizarSala('ab')).toBeNull()
    expect(normalizarSala('sala/privada')).toBe('salaprivada')
  })

  it('lee la sala y las notas del fragmento', () => {
    expect(leerHash('#sala=ei-demo&notas=abc')).toEqual({ sala: 'ei-demo', notas: 'abc' })
  })

  it('viaja en base64url sin perder acentos', () => {
    const codigo = codificarJson({ notas: [{ texto: 'Enganche y orientación' }] })
    expect(codigo).not.toMatch(/[+/=]/)
    expect(decodificarJson(codigo)).toEqual({ notas: [{ texto: 'Enganche y orientación' }] })
  })
})
