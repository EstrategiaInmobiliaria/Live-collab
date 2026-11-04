/** Tiempo tras el último evento del lápiz en el que un toque se trata como palma. */
export const ENFRIAMIENTO_PLUMA_MS = 900

/**
 * El borrador del lápiz es el botón 5 del Pointer Events spec (bit 32 de `buttons`).
 * Sirve para el extremo de borrar del S Pen. No usa APIs de Apple Pencil.
 */
export function esBorradorHardware(button: number, buttons: number): boolean {
  return button === 5 || (buttons & 32) !== 0
}

export function presionDeTrazo(pointerType: string, pressure: number, buttons: number): number {
  if (pointerType === 'mouse') return 0.72
  if (pointerType !== 'pen') return 0.62
  if (!Number.isFinite(pressure) || pressure <= 0) {
    return buttons !== 0 ? 0.55 : 0.55
  }
  return Math.min(1, pressure)
}

/** 0 = lápiz paralelo a la pantalla, π/2 = perpendicular. El campo es el estándar Pointer Events. */
export function factorInclinacion(altitudeAngle: number | undefined): number {
  if (altitudeAngle === undefined || !Number.isFinite(altitudeAngle)) return 1
  const vertical = Math.PI / 2
  const t = 1 - Math.min(vertical, Math.max(0, altitudeAngle)) / vertical
  return 1 + t * 0.35
}

export function grosorPunto(
  pointerType: string,
  pressure: number,
  buttons: number,
  altitudeAngle?: number,
): number {
  const base = presionDeTrazo(pointerType, pressure, buttons)
  const factor = pointerType === 'pen' ? factorInclinacion(altitudeAngle) : 1
  return Math.min(1.6, Math.max(0.08, base * factor))
}

export function ignorarToque(opts: {
  pointerType: string
  contactoPluma: boolean
  msDesdeUltimaPluma: number
  enfriamientoMs?: number
}): boolean {
  if (opts.pointerType !== 'touch') return false
  if (opts.contactoPluma) return true
  const limite = opts.enfriamientoMs ?? ENFRIAMIENTO_PLUMA_MS
  return opts.msDesdeUltimaPluma >= 0 && opts.msDesdeUltimaPluma < limite
}
