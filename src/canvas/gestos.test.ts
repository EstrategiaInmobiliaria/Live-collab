import { describe, expect, it } from 'vitest'
import { GestorPuntero, type EventoPuntero } from './gestos'
import type { Camara } from '../lib/camara'
import type { Herramienta, Trazo } from '../tipos'

function banco(herramienta: Herramienta = 'pluma') {
  let reloj = 1_000
  let camara: Camara = { x: 0, y: 0, escala: 1 }
  const trazos: { modo: 'pluma' | 'borrador'; trazo: Trazo }[] = []
  let activo: Trazo | null = null
  let modo: 'pluma' | 'borrador' = 'pluma'
  const notas: { x: number; y: number }[] = []
  let ids = 0
  const gestor = new GestorPuntero(
    {
      mundo: (x, y) => ({ x: (x - camara.x) / camara.escala, y: (y - camara.y) / camara.escala }),
      camara: () => camara,
      fijarCamara: (siguiente) => {
        camara = siguiente
      },
      herramienta: () => herramienta,
      estilo: () => ({ color: '#1a2332', grosor: 4 }),
      iniciar: (trazo, modoNuevo) => {
        activo = trazo
        modo = modoNuevo
      },
      extender: (punto) => {
        activo?.puntos.push(punto)
      },
      terminar: () => {
        if (activo) trazos.push({ modo, trazo: activo })
        activo = null
      },
      cancelar: () => {
        activo = null
      },
      cursor: () => {},
      nota: (punto) => notas.push(punto),
    },
    () => reloj,
    () => `id-${++ids}`,
  )
  const evento = (parcial: Partial<EventoPuntero> & Pick<EventoPuntero, 'pointerId' | 'pointerType'>): EventoPuntero => ({
    button: 0,
    buttons: 1,
    pressure: 0.5,
    x: 0,
    y: 0,
    ...parcial,
  })
  return {
    gestor,
    trazos,
    notas,
    camara: () => camara,
    avanzar: (ms: number) => {
      reloj += ms
    },
    activo: () => activo,
    evento,
  }
}

describe('gestos del lienzo', () => {
  it('ignora la palma mientras el S Pen dibuja y un momento después', () => {
    const ctx = banco()
    ctx.gestor.abajo(ctx.evento({ pointerId: 1, pointerType: 'pen', pressure: 0.3, x: 10, y: 10 }))
    ctx.gestor.abajo(ctx.evento({ pointerId: 2, pointerType: 'touch', x: 30, y: 40 }))
    ctx.gestor.arriba(ctx.evento({ pointerId: 2, pointerType: 'touch', buttons: 0, x: 30, y: 40 }))
    ctx.gestor.arriba(ctx.evento({ pointerId: 1, pointerType: 'pen', buttons: 0, x: 12, y: 12 }))
    ctx.gestor.abajo(ctx.evento({ pointerId: 3, pointerType: 'touch', x: 20, y: 20 }))
    expect(ctx.trazos).toHaveLength(1)
    expect(ctx.activo()).toBeNull()
    ctx.avanzar(ENFRIAMIENTO())
    ctx.gestor.arriba(ctx.evento({ pointerId: 3, pointerType: 'touch', buttons: 0, x: 20, y: 20 }))
    ctx.gestor.abajo(ctx.evento({ pointerId: 4, pointerType: 'touch', x: 8, y: 8 }))
    ctx.gestor.arriba(ctx.evento({ pointerId: 4, pointerType: 'touch', buttons: 0, x: 8, y: 8 }))
    expect(ctx.trazos).toHaveLength(2)
  })

  it('cancela el trazo del dedo si entra el lápiz', () => {
    const ctx = banco()
    ctx.gestor.abajo(ctx.evento({ pointerId: 1, pointerType: 'touch', x: 5, y: 5 }))
    expect(ctx.activo()).not.toBeNull()
    ctx.gestor.abajo(ctx.evento({ pointerId: 2, pointerType: 'pen', x: 9, y: 9 }))
    expect(ctx.trazos).toHaveLength(0)
    ctx.gestor.arriba(ctx.evento({ pointerId: 2, pointerType: 'pen', buttons: 0, x: 9, y: 9 }))
    expect(ctx.trazos).toHaveLength(1)
    expect(ctx.trazos[0].trazo.puntos[0].p).toBeGreaterThan(0)
  })

  it('hace zoom con dos dedos y no deja un trazo', () => {
    const ctx = banco()
    ctx.gestor.abajo(ctx.evento({ pointerId: 1, pointerType: 'touch', x: 10, y: 10 }))
    ctx.gestor.abajo(ctx.evento({ pointerId: 2, pointerType: 'touch', x: 110, y: 10 }))
    expect(ctx.activo()).toBeNull()
    ctx.gestor.mover(ctx.evento({ pointerId: 2, pointerType: 'touch', x: 210, y: 10 }), [])
    expect(ctx.camara().escala).toBeGreaterThan(1.5)
    expect(ctx.trazos).toHaveLength(0)
  })

  it('trata el botón borrador del lápiz como goma y la herramienta mano deja dibujar a la pluma', () => {
    const goma = banco()
    goma.gestor.abajo(goma.evento({ pointerId: 1, pointerType: 'pen', button: 5, buttons: 32, x: 4, y: 4 }))
    goma.gestor.arriba(goma.evento({ pointerId: 1, pointerType: 'pen', button: 5, buttons: 0, x: 4, y: 4 }))
    expect(goma.trazos[0].modo).toBe('borrador')

    const mano = banco('mano')
    mano.gestor.abajo(mano.evento({ pointerId: 1, pointerType: 'mouse', x: 0, y: 0 }))
    mano.gestor.mover(mano.evento({ pointerId: 1, pointerType: 'mouse', x: 30, y: 12 }), [])
    expect(mano.camara().x).toBe(30)
    expect(mano.trazos).toHaveLength(0)
    mano.gestor.arriba(mano.evento({ pointerId: 1, pointerType: 'mouse', buttons: 0, x: 30, y: 12 }))
    mano.gestor.abajo(mano.evento({ pointerId: 2, pointerType: 'pen', pressure: 0.9, x: 6, y: 6 }))
    mano.gestor.arriba(mano.evento({ pointerId: 2, pointerType: 'pen', buttons: 0, x: 6, y: 6 }))
    expect(mano.trazos).toHaveLength(1)
  })

  it('coloca una nota con un toque y no con un arrastre', () => {
    const ctx = banco('nota')
    ctx.gestor.abajo(ctx.evento({ pointerId: 1, pointerType: 'pen', x: 40, y: 50 }))
    ctx.gestor.arriba(ctx.evento({ pointerId: 1, pointerType: 'pen', buttons: 0, x: 42, y: 51 }))
    expect(ctx.notas.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 40, y: 50 }])
    ctx.gestor.abajo(ctx.evento({ pointerId: 2, pointerType: 'touch', x: 10, y: 10 }))
    ctx.gestor.arriba(ctx.evento({ pointerId: 2, pointerType: 'touch', buttons: 0, x: 40, y: 10 }))
    expect(ctx.notas).toHaveLength(1)
  })
})

function ENFRIAMIENTO(): number {
  return 901
}
