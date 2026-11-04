export function leerHash(hash: string): { sala: string | null; notas: string | null } {
  const limpio = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(limpio)
  return { sala: params.get('sala'), notas: params.get('notas') }
}

export function escribirHash(sala: string): string {
  return `#${new URLSearchParams({ sala }).toString()}`
}

export function normalizarSala(valor: string): string | null {
  const sala = valor
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (sala.length < 3 || sala.length > 48) return null
  return sala
}

export function codificarJson(dato: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(dato))
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodificarJson(codigo: string): unknown {
  const base64 = codigo.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64.length % 4 === 0 ? base64 : base64 + '='.repeat(4 - (base64.length % 4))
  const binario = atob(relleno)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

let notasPendientes: string | null = null

export function guardarNotasPendientes(notas: string | null): void {
  if (notas) notasPendientes = notas
}

export function consumirNotasPendientes(): string | null {
  const notas = notasPendientes
  notasPendientes = null
  return notas
}

/** Lee #sala y #notas. Si no hay sala, crea una y la deja en el enlace. */
export function prepararEnlace(): string {
  if (typeof location === 'undefined') return 'ei-local'
  const leido = leerHash(location.hash)
  if (leido.notas) guardarNotasPendientes(leido.notas)
  const sala = leido.sala ? normalizarSala(leido.sala) : null
  if (sala) {
    if (leido.notas) {
      history.replaceState(null, '', `${location.pathname}${location.search}${escribirHash(sala)}`)
    }
    return sala
  }
  const nueva = `ei-${Math.random().toString(36).slice(2, 8)}`
  history.replaceState(null, '', `${location.pathname}${location.search}${escribirHash(nueva)}`)
  return nueva
}
