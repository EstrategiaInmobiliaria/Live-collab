import { describe, expect, it } from 'vitest'
import { leerParche } from './estado'

describe('estado JSON', () => {
  it('acepta una lista de notas o un documento con versión', () => {
    const lista = leerParche([{ texto: 'Revisar fachada', x: 10, y: 20 }])
    expect(lista.notas).toHaveLength(1)
    expect(lista.notas?.[0].texto).toBe('Revisar fachada')

    const doc = leerParche({
      version: 1,
      sala: 'ei-demo',
      notas: [{ id: 'n1', texto: 'Hola', x: 1, y: 2, color: '#1e4d3d' }],
      trazos: [],
      escenario: { metros: 90 },
    })
    expect(doc.sala).toBe('ei-demo')
    expect(doc.escenario).toEqual({ metros: 90 })
  })

  it('rechaza otra versión y el JSON roto', () => {
    expect(() => leerParche({ version: 2 })).toThrow(/versión/i)
    expect(() => leerParche('{')).toThrow(/JSON/i)
  })

  it('descarta puntos inválidos y conserva el trazo útil', () => {
    const parche = leerParche({
      trazos: [{ id: 'a', color: 'no-es-color', grosor: 4, puntos: [{ x: 1, y: 2, p: 0.4 }, { x: 'no' }] }],
    })
    expect(parche.trazos?.[0].puntos).toEqual([{ x: 1, y: 2, p: 0.4 }])
    expect(parche.trazos?.[0].color).toBe('#1a2332')
  })
})
