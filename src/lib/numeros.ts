export function parseNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (limpio === '' || limpio === '-' || limpio === '.' || limpio === '-.') return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

export function formatoMXN(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatoNumero(valor: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(valor)
}
