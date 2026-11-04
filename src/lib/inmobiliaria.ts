import type { Escenario } from '../tipos'
import { formatoMXN, formatoNumero } from './numeros'

export type { Escenario }

export type ResultadoInmobiliario = {
  precioM2: number | null
  enganche: number | null
  aFinanciar: number | null
  pagoMensual: number | null
}

export const ESCENARIO_INICIAL: Escenario = {
  precio: 3_250_000,
  metros: 86,
  enganchePct: 20,
  tasaAnual: 11.5,
  plazoAnios: 20,
}

/** Amortización francesa. La tasa anual es nominal, convertible mensualmente. */
export function pagoMensual(principal: number, tasaAnualPct: number, plazoAnios: number): number | null {
  if (!Number.isFinite(principal) || !Number.isFinite(tasaAnualPct) || !Number.isFinite(plazoAnios)) return null
  if (principal < 0 || tasaAnualPct < 0 || plazoAnios <= 0) return null
  const meses = Math.round(plazoAnios * 12)
  if (meses <= 0) return null
  if (principal === 0) return 0
  const r = tasaAnualPct / 100 / 12
  if (r === 0) return principal / meses
  const factor = (1 + r) ** meses
  return (principal * r * factor) / (factor - 1)
}

export function calcularEscenario(escenario: Escenario): ResultadoInmobiliario {
  const precioOk = Number.isFinite(escenario.precio) && escenario.precio >= 0
  const metrosOk = Number.isFinite(escenario.metros) && escenario.metros > 0
  const engancheOk =
    Number.isFinite(escenario.enganchePct) && escenario.enganchePct >= 0 && escenario.enganchePct <= 100
  const precioM2 = precioOk && metrosOk ? escenario.precio / escenario.metros : null
  const enganche = precioOk && engancheOk ? escenario.precio * (escenario.enganchePct / 100) : null
  const aFinanciar = enganche === null || !precioOk ? null : escenario.precio - enganche
  const mensual = aFinanciar === null ? null : pagoMensual(aFinanciar, escenario.tasaAnual, escenario.plazoAnios)
  return { precioM2, enganche, aFinanciar, pagoMensual: mensual }
}

export function resumenEscenario(escenario: Escenario): string {
  const resultado = calcularEscenario(escenario)
  const precioM2 = resultado.precioM2 === null ? '—' : `${formatoMXN(resultado.precioM2)}/m²`
  const enganche = resultado.enganche === null ? '—' : formatoMXN(resultado.enganche)
  const pago = resultado.pagoMensual === null ? '—' : formatoMXN(resultado.pagoMensual)
  return [
    `Precio ${formatoMXN(escenario.precio)}`,
    `${formatoNumero(escenario.metros)} m²`,
    precioM2,
    `enganche ${formatoNumero(escenario.enganchePct)}% (${enganche})`,
    `pago mensual estimado ${pago} a ${formatoNumero(escenario.plazoAnios)} años (${formatoNumero(escenario.tasaAnual)}% anual)`,
  ].join(' · ')
}
