import { ESCENARIO_INICIAL } from './inmobiliaria'
import type { EstadoLienzo, NotaJson, Trazo } from '../tipos'

function rectangulo(x: number, y: number, ancho: number, alto: number, presion: number) {
  return [
    { x, y, p: presion },
    { x: x + ancho, y, p: presion },
    { x: x + ancho, y: y + alto, p: presion },
    { x, y: y + alto, p: presion },
    { x, y, p: presion },
  ]
}

export function trazosDeEjemplo(): Trazo[] {
  return [
    {
      id: 'ejemplo-contorno',
      color: '#1a2332',
      grosor: 3.4,
      puntos: rectangulo(88, 78, 300, 188, 0.78),
    },
    {
      id: 'ejemplo-division',
      color: '#1e4d3d',
      grosor: 2.2,
      puntos: [
        { x: 88, y: 168, p: 0.55 },
        { x: 388, y: 168, p: 0.55 },
      ],
    },
    {
      id: 'ejemplo-vanos',
      color: '#c56a3a',
      grosor: 2.4,
      puntos: [
        { x: 210, y: 78, p: 0.5 },
        { x: 250, y: 78, p: 0.5 },
      ],
    },
  ]
}

export function notasDeEjemplo(): NotaJson[] {
  return [
    {
      id: 'ejemplo-nota',
      texto: 'Croquis de muestra. Anota acuerdos, medidas y pendientes de la visita.',
      x: 112,
      y: 292,
      color: '#8c3a4b',
    },
  ]
}

export function estadoDeEjemplo(sala: string): EstadoLienzo {
  return {
    version: 1,
    sala,
    notas: notasDeEjemplo(),
    trazos: trazosDeEjemplo(),
    escenario: { ...ESCENARIO_INICIAL },
  }
}
