import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { aplicarEntrada, exportarEstado, ORIGEN_LOCAL } from './documento'

describe('documento colaborativo', () => {
  it('fusiona notas por id y no duplica trazos', () => {
    const doc = new Y.Doc()
    aplicarEntrada(
      doc,
      { notas: [{ id: 'n1', texto: 'Visita', x: 10, y: 12, color: '#1e4d3d' }], trazos: [{ id: 't1', color: '#1a2332', grosor: 3, puntos: [{ x: 0, y: 0, p: 1 }, { x: 8, y: 2, p: 1 }] }] },
      'fusionar',
      ORIGEN_LOCAL,
    )
    aplicarEntrada(doc, { notas: [{ id: 'n1', texto: 'Visita actualizada', x: 14, y: 12 }] }, 'fusionar', ORIGEN_LOCAL)
    const estado = exportarEstado(doc, 'ei-demo')
    expect(estado.notas).toHaveLength(1)
    expect(estado.notas[0].texto).toBe('Visita actualizada')
    expect(estado.notas[0].x).toBe(14)
    expect(estado.trazos).toHaveLength(1)
  })

  it('reemplaza el lienzo y deja deshacer el cambio local', () => {
    const doc = new Y.Doc()
    const deshacer = new Y.UndoManager([doc.getArray('trazos'), doc.getArray('notas')], {
      trackedOrigins: new Set([ORIGEN_LOCAL]),
      captureTimeout: 0,
    })
    aplicarEntrada(doc, { notas: [{ id: 'a', texto: 'Uno', x: 1, y: 1 }] }, 'fusionar', ORIGEN_LOCAL)
    aplicarEntrada(doc, { notas: [{ id: 'b', texto: 'Dos', x: 2, y: 2 }], trazos: [] }, 'reemplazar', ORIGEN_LOCAL)
    expect(exportarEstado(doc, 'sala').notas.map((n) => n.id)).toEqual(['b'])
    deshacer.undo()
    expect(exportarEstado(doc, 'sala').notas.map((n) => n.id)).toEqual(['a'])
  })

  it('replica un trazo entre dos documentos', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    a.on('update', (update: Uint8Array) => Y.applyUpdate(b, update))
    aplicarEntrada(
      a,
      { trazos: [{ id: 'croquis', color: '#1e4d3d', grosor: 2, puntos: [{ x: 1, y: 1, p: 0.4 }, { x: 5, y: 9, p: 0.8 }] }] },
      'fusionar',
      ORIGEN_LOCAL,
    )
    expect(exportarEstado(b, 'sala').trazos[0].id).toBe('croquis')
    expect(exportarEstado(b, 'sala').trazos[0].puntos).toHaveLength(2)
  })
})
