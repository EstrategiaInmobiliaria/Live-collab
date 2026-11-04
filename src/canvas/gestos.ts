import { camaraTrasPellizco, type Camara } from '../lib/camara'
import { distancia } from '../lib/geometria'
import { crearId } from '../lib/id'
import { ENFRIAMIENTO_PLUMA_MS, esBorradorHardware, grosorPunto, ignorarToque } from '../lib/puntero'
import type { Herramienta, Punto, Trazo } from '../tipos'

export type EventoPuntero = {
  pointerId: number
  pointerType: string
  button: number
  buttons: number
  pressure: number
  altitudeAngle?: number
  x: number
  y: number
}

export type MuestraPuntero = {
  x: number
  y: number
  pressure: number
  altitudeAngle?: number
}

export type CallbacksGestos = {
  mundo: (x: number, y: number) => { x: number; y: number }
  camara: () => Camara
  fijarCamara: (camara: Camara) => void
  herramienta: () => Herramienta
  estilo: () => { color: string; grosor: number }
  iniciar: (trazo: Trazo, modo: 'pluma' | 'borrador') => void
  extender: (punto: Punto) => void
  terminar: () => void
  cancelar: () => void
  cursor: (punto: Punto | null) => void
  nota: (punto: Punto) => void
}

type Activo = { tipo: string; x: number; y: number; ignorado: boolean }

export class GestorPuntero {
  private posiciones = new Map<number, Activo>()
  private contactosPluma = new Set<number>()
  private ultimaPluma = Number.NEGATIVE_INFINITY
  private trazoPuntero: number | null = null
  private trazoEsToque = false
  private pan: { id: number; x: number; y: number } | null = null
  private pellizco: { distancia: number; escala: number; mundoMedio: { x: number; y: number } } | null = null
  private notaPendiente: { id: number; x: number; y: number } | null = null

  constructor(
    public callbacks: CallbacksGestos,
    private readonly ahora: () => number = () => Date.now(),
    private readonly identificador: () => string = crearId,
  ) {}

  private bloqueaToque(tipo: string): boolean {
    return ignorarToque({
      pointerType: tipo,
      contactoPluma: this.contactosPluma.size > 0,
      msDesdeUltimaPluma: this.ultimaPluma === Number.NEGATIVE_INFINITY ? Number.POSITIVE_INFINITY : this.ahora() - this.ultimaPluma,
      enfriamientoMs: ENFRIAMIENTO_PLUMA_MS,
    })
  }

  private toquesActivos(): Activo[] {
    return [...this.posiciones.values()].filter((p) => p.tipo === 'touch' && !p.ignorado)
  }

  private puntoDe(tipo: string, x: number, y: number, pressure: number, buttons: number, altitudeAngle?: number): Punto {
    const mundo = this.callbacks.mundo(x, y)
    return { x: mundo.x, y: mundo.y, p: grosorPunto(tipo, pressure, buttons, altitudeAngle) }
  }

  private marcarPluma(evento: EventoPuntero): void {
    if (evento.pointerType !== 'pen') return
    this.ultimaPluma = this.ahora()
  }

  private cancelarTrazoActivo(): void {
    if (this.trazoPuntero === null) return
    this.trazoPuntero = null
    this.trazoEsToque = false
    this.callbacks.cancelar()
  }

  private comenzarPellizco(): void {
    const toques = this.toquesActivos()
    if (toques.length < 2) {
      this.pellizco = null
      return
    }
    const [a, b] = toques
    const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    this.pellizco = {
      distancia: Math.max(distancia(a, b), 1),
      escala: this.callbacks.camara().escala,
      mundoMedio: this.callbacks.mundo(medio.x, medio.y),
    }
  }

  abajo(evento: EventoPuntero): void {
    this.marcarPluma(evento)
    const ignorado = this.bloqueaToque(evento.pointerType)
    this.posiciones.set(evento.pointerId, {
      tipo: evento.pointerType,
      x: evento.x,
      y: evento.y,
      ignorado,
    })

    if (evento.pointerType === 'pen') {
      this.contactosPluma.add(evento.pointerId)
      if (this.trazoEsToque) this.cancelarTrazoActivo()
    }

    if (ignorado) return
    if (evento.pointerType === 'mouse' && evento.button === 2) return

    if (this.toquesActivos().length >= 2) {
      if (this.trazoEsToque) this.cancelarTrazoActivo()
      this.pan = null
      this.notaPendiente = null
      this.comenzarPellizco()
      return
    }

    const herramienta = this.callbacks.herramienta()
    if (herramienta === 'nota') {
      this.notaPendiente = { id: evento.pointerId, x: evento.x, y: evento.y }
      return
    }

    const panConPuntero = (herramienta === 'mano' && evento.pointerType !== 'pen') || (evento.pointerType === 'mouse' && evento.button === 1)
    if (panConPuntero) {
      this.pan = { id: evento.pointerId, x: evento.x, y: evento.y }
      return
    }

    const modo = herramienta === 'borrador' || esBorradorHardware(evento.button, evento.buttons) ? 'borrador' : 'pluma'
    const estilo = this.callbacks.estilo()
    const punto = this.puntoDe(evento.pointerType, evento.x, evento.y, evento.pressure, evento.buttons, evento.altitudeAngle)
    this.trazoPuntero = evento.pointerId
    this.trazoEsToque = evento.pointerType === 'touch'
    this.callbacks.iniciar(
      { id: this.identificador(), color: estilo.color, grosor: estilo.grosor, puntos: [punto] },
      modo,
    )
  }

  mover(evento: EventoPuntero, muestras: MuestraPuntero[]): void {
    this.marcarPluma(evento)
    const activo = this.posiciones.get(evento.pointerId)
    if (!activo) return
    const prevX = activo.x
    const prevY = activo.y
    activo.x = evento.x
    activo.y = evento.y
    if (activo.ignorado) return

    if (this.pellizco) {
      const toques = this.toquesActivos()
      if (toques.length < 2) return
      const [a, b] = toques
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      this.callbacks.fijarCamara(
        camaraTrasPellizco(this.pellizco, Math.max(distancia(a, b), 1), medio),
      )
      return
    }

    if (this.pan && this.pan.id === evento.pointerId) {
      const cam = this.callbacks.camara()
      this.callbacks.fijarCamara({
        ...cam,
        x: cam.x + (evento.x - prevX),
        y: cam.y + (evento.y - prevY),
      })
      this.pan.x = evento.x
      this.pan.y = evento.y
      return
    }

    if (this.trazoPuntero === evento.pointerId) {
      const lista = muestras.length > 0 ? muestras : [evento]
      for (const muestra of lista) {
        this.callbacks.extender(
          this.puntoDe(evento.pointerType, muestra.x, muestra.y, muestra.pressure, evento.buttons, muestra.altitudeAngle),
        )
      }
      return
    }

    if (evento.buttons === 0) {
      const mundo = this.callbacks.mundo(evento.x, evento.y)
      this.callbacks.cursor({ x: mundo.x, y: mundo.y, p: 0 })
    }
  }

  arriba(evento: EventoPuntero): void {
    this.cerrar(evento, true)
  }

  cancelarPuntero(evento: EventoPuntero): void {
    this.cerrar(evento, false)
  }

  private cerrar(evento: EventoPuntero, confirmar: boolean): void {
    this.marcarPluma(evento)
    const activo = this.posiciones.get(evento.pointerId)
    this.posiciones.delete(evento.pointerId)
    if (evento.pointerType === 'pen') this.contactosPluma.delete(evento.pointerId)

    if (this.pan?.id === evento.pointerId) this.pan = null

    if (this.trazoPuntero === evento.pointerId) {
      this.trazoPuntero = null
      this.trazoEsToque = false
      if (confirmar && !activo?.ignorado) this.callbacks.terminar()
      else this.callbacks.cancelar()
    }

    if (this.notaPendiente?.id === evento.pointerId) {
      const origen = this.notaPendiente
      this.notaPendiente = null
      if (confirmar && activo && distancia(origen, activo) < 8) {
        const mundo = this.callbacks.mundo(origen.x, origen.y)
        this.callbacks.nota({ x: mundo.x, y: mundo.y, p: 1 })
      }
    }

    if (this.toquesActivos().length >= 2) this.comenzarPellizco()
    else this.pellizco = null

    if (this.posiciones.size === 0) this.callbacks.cursor(null)
  }
}
