import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { exportarPng, pintarLienzo, type Goma } from '../canvas/render'
import { GestorPuntero, type CallbacksGestos, type EventoPuntero } from '../canvas/gestos'
import { encuadrar, mundoAPantalla, zoomEn, type Camara } from '../lib/camara'
import { estadoDeEjemplo } from '../lib/ejemplo'
import { cajaDe, debeAgregarPunto } from '../lib/geometria'
import type { Herramienta, NotaJson, Trazo } from '../tipos'
import { useInstantanea, useSala } from '../sync/contexto'

export type LienzoHandle = {
  zoom: (factor: number) => void
  encuadrar: () => void
  exportar: () => void
}

type Props = {
  herramienta: Herramienta
  color: string
  grosor: number
  forzarMano: boolean
}

type Borrador = { trazo: Trazo; modo: 'pluma' | 'borrador' }

export const Lienzo = forwardRef<LienzoHandle, Props>(function Lienzo(props, ref) {
  const store = useSala()
  const instantanea = useInstantanea()
  const marco = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const camara = useRef<Camara>({ x: 0, y: 0, escala: 1 })
  const [vista, setVista] = useState<Camara>(camara.current)
  const draft = useRef<Borrador | null>(null)
  const hover = useRef<{ x: number; y: number } | null>(null)
  const estilo = useRef(props)
  const storeRef = useRef(store)
  const frame = useRef(0)
  const vistaFrame = useRef(0)
  const ultimoEnvio = useRef(0)
  const envioPendiente = useRef(0)
  const [notaFoco, setNotaFoco] = useState<string | null>(null)
  const areas = useRef(new Map<string, HTMLTextAreaElement>())
  estilo.current = props
  storeRef.current = store

  const pedirDibujo = useRef(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const canvas = canvasRef.current
      const el = marco.current
      if (!canvas || !el) return
      const ctx = canvas.getContext('2d')
      if (!ctx || el.clientWidth === 0) return
      const dpr = canvas.width / el.clientWidth
      const estado = storeRef.current.obtenerEstado()
      const actual = draft.current
      const presencia = storeRef.current.leerPresencia()
      const borradores = presencia.flatMap((persona) => (persona.borrador ? [persona.borrador] : []))
      if (actual?.modo === 'pluma') borradores.push(actual.trazo)
      pintarLienzo(ctx, {
        ancho: el.clientWidth,
        alto: el.clientHeight,
        dpr,
        camara: camara.current,
        trazos: estado.trazos,
        borradores,
        goma: gomaVisible(),
        cursores: presencia.flatMap((persona) => {
          if (!persona.cursor) return []
          return [{ x: persona.cursor.x, y: persona.cursor.y, color: persona.color, nombre: persona.nombre }]
        }),
      })
    })
  }).current

  function radioMundo(): number {
    return (12 + estilo.current.grosor) / camara.current.escala
  }

  function gomaVisible(): Goma | null {
    const radio = radioMundo()
    const actual = draft.current
    const ultimo = actual?.trazo.puntos.at(-1)
    if (actual?.modo === 'borrador' && ultimo) return { x: ultimo.x, y: ultimo.y, radio }
    if (estilo.current.herramienta === 'borrador' && hover.current) return { ...hover.current, radio }
    return null
  }

  function publicar(forzar = false): void {
    const enviar = () => {
      ultimoEnvio.current = performance.now()
      const actual = draft.current
      const ultimo = actual?.trazo.puntos.at(-1)
      const goma = gomaVisible()
      storeRef.current.publicarPresencia({
        cursor: ultimo ? { x: ultimo.x, y: ultimo.y } : hover.current,
        borrador: actual?.modo === 'pluma' ? actual.trazo : null,
        goma: actual?.modo === 'borrador' ? goma : null,
      })
    }
    const ahora = performance.now()
    if (forzar || ahora - ultimoEnvio.current > 70) {
      if (envioPendiente.current) {
        window.clearTimeout(envioPendiente.current)
        envioPendiente.current = 0
      }
      enviar()
      return
    }
    if (!envioPendiente.current) {
      envioPendiente.current = window.setTimeout(() => {
        envioPendiente.current = 0
        enviar()
      }, 70)
    }
  }

  function fijarCamara(siguiente: Camara): void {
    camara.current = siguiente
    pedirDibujo()
    if (!vistaFrame.current) {
      vistaFrame.current = requestAnimationFrame(() => {
        vistaFrame.current = 0
        setVista({ ...camara.current })
      })
    }
  }

  const api = useRef({
    zoom: (factor: number) => {
      const el = marco.current
      if (!el) return
      fijarCamara(zoomEn(camara.current, el.clientWidth / 2, el.clientHeight / 2, factor))
    },
    encuadrar: () => {
      const el = marco.current
      if (!el) return
      const estado = storeRef.current.obtenerEstado()
      fijarCamara(encuadrar(el.clientWidth, el.clientHeight, cajaDe(estado.trazos, estado.notas)))
    },
    exportar: () => {
      const el = marco.current
      if (!el) return
      const estado = storeRef.current.obtenerEstado()
      void exportarPng({
        ancho: el.clientWidth,
        alto: el.clientHeight,
        camara: camara.current,
        trazos: estado.trazos,
        notas: estado.notas,
        sala: storeRef.current.sala,
      }).catch((error: unknown) => {
        storeRef.current.avisar(error instanceof Error ? error.message : 'No se pudo exportar')
      })
    },
  })

  useImperativeHandle(ref, () => ({
    zoom: (factor) => api.current.zoom(factor),
    encuadrar: () => api.current.encuadrar(),
    exportar: () => api.current.exportar(),
  }))

  const puente = useRef<CallbacksGestos>(null!)
  puente.current = {
    mundo: (x, y) => ({
      x: (x - camara.current.x) / camara.current.escala,
      y: (y - camara.current.y) / camara.current.escala,
    }),
    camara: () => camara.current,
    fijarCamara,
    herramienta: () => (props.forzarMano ? 'mano' : props.herramienta),
    estilo: () => ({ color: props.color, grosor: props.grosor }),
    iniciar: (trazo, modo) => {
      draft.current = { trazo, modo }
      hover.current = { x: trazo.puntos[0].x, y: trazo.puntos[0].y }
      pedirDibujo()
      publicar(true)
    },
    extender: (punto) => {
      const actual = draft.current
      if (!actual) return
      const ultimo = actual.trazo.puntos.at(-1)
      if (!debeAgregarPunto(ultimo, punto)) return
      actual.trazo.puntos.push(punto)
      hover.current = { x: punto.x, y: punto.y }
      pedirDibujo()
      publicar()
    },
    terminar: () => {
      const actual = draft.current
      draft.current = null
      if (actual?.modo === 'borrador') storeRef.current.borrarConCamino(actual.trazo.puntos, radioMundo())
      else if (actual && actual.trazo.puntos.length > 0) storeRef.current.agregarTrazo(actual.trazo)
      pedirDibujo()
      publicar(true)
    },
    cancelar: () => {
      draft.current = null
      pedirDibujo()
      publicar(true)
    },
    cursor: (punto) => {
      hover.current = punto ? { x: punto.x, y: punto.y } : null
      pedirDibujo()
      publicar()
    },
    nota: (punto) => {
      const id = storeRef.current.agregarNota({ texto: '', x: punto.x, y: punto.y, color: props.color })
      setNotaFoco(id)
    },
  }

  const gestor = useMemo(
    () =>
      new GestorPuntero({
        mundo: (x, y) => puente.current.mundo(x, y),
        camara: () => puente.current.camara(),
        fijarCamara: (siguiente) => puente.current.fijarCamara(siguiente),
        herramienta: () => puente.current.herramienta(),
        estilo: () => puente.current.estilo(),
        iniciar: (trazo, modo) => puente.current.iniciar(trazo, modo),
        extender: (punto) => puente.current.extender(punto),
        terminar: () => puente.current.terminar(),
        cancelar: () => puente.current.cancelar(),
        cursor: (punto) => puente.current.cursor(punto),
        nota: (punto) => puente.current.nota(punto),
      }),
    [],
  )

  useEffect(() => {
    store.fijarOyentePresencia(pedirDibujo)
    return () => store.fijarOyentePresencia(null)
  }, [store, pedirDibujo])

  useEffect(() => {
    pedirDibujo()
  })

  useEffect(() => {
    const el = marco.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(el.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(el.clientHeight * dpr))
      pedirDibujo()
    }
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(el)
    return () => observador.disconnect()
  }, [pedirDibujo])

  useEffect(() => {
    if (!notaFoco) return
    areas.current.get(notaFoco)?.focus()
  }, [notaFoco])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const traducir = (evento: PointerEvent): EventoPuntero => {
      const rect = canvas.getBoundingClientRect()
      return {
        pointerId: evento.pointerId,
        pointerType: evento.pointerType,
        button: evento.button,
        buttons: evento.buttons,
        pressure: evento.pressure,
        altitudeAngle: evento.altitudeAngle,
        x: evento.clientX - rect.left,
        y: evento.clientY - rect.top,
      }
    }

    const abajo = (evento: PointerEvent) => {
      if (evento.cancelable) evento.preventDefault()
      try {
        canvas.setPointerCapture(evento.pointerId)
      } catch {
        /* el puntero ya no está activo */
      }
      gestor.abajo(traducir(evento))
    }
    const mover = (evento: PointerEvent) => {
      if (draft.current && evento.cancelable) evento.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const muestras = evento.getCoalescedEvents?.() ?? []
      gestor.mover(
        traducir(evento),
        muestras.map((muestra) => ({
          x: muestra.clientX - rect.left,
          y: muestra.clientY - rect.top,
          pressure: muestra.pressure,
          altitudeAngle: muestra.altitudeAngle,
        })),
      )
    }
    const arriba = (evento: PointerEvent) => gestor.arriba(traducir(evento))
    const cancelar = (evento: PointerEvent) => gestor.cancelarPuntero(traducir(evento))
    const rueda = (evento: WheelEvent) => {
      if (!evento.cancelable) return
      evento.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const factor = evento.deltaY < 0 ? 1.08 : 1 / 1.08
      fijarCamara(zoomEn(camara.current, evento.clientX - rect.left, evento.clientY - rect.top, factor))
    }
    const menu = (evento: Event) => evento.preventDefault()

    canvas.addEventListener('pointerdown', abajo)
    canvas.addEventListener('pointermove', mover)
    canvas.addEventListener('pointerup', arriba)
    canvas.addEventListener('pointercancel', cancelar)
    canvas.addEventListener('lostpointercapture', arriba)
    canvas.addEventListener('wheel', rueda, { passive: false })
    canvas.addEventListener('contextmenu', menu)
    return () => {
      canvas.removeEventListener('pointerdown', abajo)
      canvas.removeEventListener('pointermove', mover)
      canvas.removeEventListener('pointerup', arriba)
      canvas.removeEventListener('pointercancel', cancelar)
      canvas.removeEventListener('lostpointercapture', arriba)
      canvas.removeEventListener('wheel', rueda)
      canvas.removeEventListener('contextmenu', menu)
    }
  }, [gestor, pedirDibujo])

  function arrastrarNota(nota: NotaJson, evento: React.PointerEvent<HTMLElement>) {
    if (evento.button !== 0) return
    evento.preventDefault()
    const inicio = { x: evento.clientX, y: evento.clientY, nx: nota.x, ny: nota.y }
    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - inicio.x) / camara.current.escala
      const dy = (ev.clientY - inicio.y) / camara.current.escala
      store.moverNota(nota.id, inicio.nx + dx, inicio.ny + dy)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const vacio = instantanea.trazos.length === 0 && instantanea.notas.length === 0

  return (
    <div className="lienzo" ref={marco} data-herramienta={props.forzarMano ? 'mano' : props.herramienta}>
      <canvas ref={canvasRef} aria-label="Lienzo colaborativo" />
      <div className="notas">
        {instantanea.notas.map((nota) => {
          const pantalla = mundoAPantalla(nota.x, nota.y, vista)
          return (
            <article key={nota.id} className="nota" style={{ left: pantalla.x, top: pantalla.y }}>
              <header style={{ borderColor: nota.color }} onPointerDown={(evento) => arrastrarNota(nota, evento)}>
                <span>Nota</span>
                <button type="button" aria-label="Eliminar nota" onClick={() => store.eliminarNota(nota.id)}>
                  ×
                </button>
              </header>
              <textarea
                ref={(nodo) => {
                  if (nodo) areas.current.set(nota.id, nodo)
                  else areas.current.delete(nota.id)
                }}
                value={nota.texto}
                placeholder="Escribe una nota…"
                aria-label="Texto de la nota"
                onChange={(evento) => store.editarNota(nota.id, evento.target.value)}
                onFocus={() => setNotaFoco(nota.id)}
              />
            </article>
          )
        })}
      </div>
      {vacio && (
        <div className="vacio">
          <p>S Pen o dedo para dibujar. Dos dedos para zoom. La palma se ignora mientras el lápiz está cerca.</p>
          <button type="button" onClick={() => store.aplicar(estadoDeEjemplo(store.sala), 'fusionar')}>
            Insertar ejemplo
          </button>
        </div>
      )}
    </div>
  )
})

