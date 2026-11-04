export type ResultadoExpr = { ok: true; valor: number } | { ok: false; error: string }

const FUNCIONES: Record<string, (x: number) => number> = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  raiz: (x) => Math.sqrt(x),
}

type Token =
  | { tipo: 'num'; valor: number }
  | { tipo: 'id'; valor: string }
  | { tipo: 'op'; valor: string }

function tokenizar(entrada: string): { ok: true; tokens: Token[] } | { ok: false; error: string } {
  const tokens: Token[] = []
  const s = entrada.trim()
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\n' || c === '\t') {
      i++
      continue
    }
    if ((c >= '0' && c <= '9') || (c === '.' && s[i + 1] >= '0' && s[i + 1] <= '9')) {
      const inicio = i
      i++
      while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.' || s[i] === ',')) i++
      const n = Number(s.slice(inicio, i).replace(',', '.'))
      if (!Number.isFinite(n)) return { ok: false, error: 'Número inválido' }
      tokens.push({ tipo: 'num', valor: n })
      continue
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === 'π') {
      const inicio = i
      i++
      while (i < s.length && s[i] >= 'a' && s[i] <= 'z') i++
      tokens.push({ tipo: 'id', valor: s.slice(inicio, i).toLowerCase() })
      continue
    }
    if ('+-*/^%!()'.includes(c) || c === '×' || c === '÷' || c === '−') {
      const mapa: Record<string, string> = { '×': '*', '÷': '/', '−': '-' }
      tokens.push({ tipo: 'op', valor: mapa[c] ?? c })
      i++
      continue
    }
    return { ok: false, error: `No entiendo «${c}»` }
  }
  return { ok: true, tokens }
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('El factorial solo aplica a enteros ≥ 0')
  if (n > 170) throw new Error('Factorial demasiado grande')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

class Parser {
  private i = 0
  constructor(private readonly tokens: Token[]) {}

  fin(): boolean {
    return this.i >= this.tokens.length
  }

  private mira(): Token | undefined {
    return this.tokens[this.i]
  }

  private come(tipo: Token['tipo'], valor?: string): boolean {
    const t = this.mira()
    if (!t || t.tipo !== tipo) return false
    if (valor !== undefined && t.valor !== valor) return false
    this.i++
    return true
  }

  expr(): number {
    let v = this.termino()
    for (;;) {
      if (this.come('op', '+')) v += this.termino()
      else if (this.come('op', '-')) v -= this.termino()
      else break
    }
    return v
  }

  private termino(): number {
    let v = this.potencia()
    for (;;) {
      if (this.come('op', '*')) v *= this.potencia()
      else if (this.come('op', '/')) {
        const d = this.potencia()
        if (d === 0) throw new Error('División entre cero')
        v /= d
      } else break
    }
    return v
  }

  private potencia(): number {
    const base = this.unario()
    if (this.come('op', '^')) return base ** this.potencia()
    return base
  }

  private unario(): number {
    if (this.come('op', '-')) return -this.unario()
    if (this.come('op', '+')) return this.unario()
    return this.posfijo()
  }

  private posfijo(): number {
    let v = this.primario()
    for (;;) {
      if (this.come('op', '%')) v /= 100
      else if (this.come('op', '!')) v = factorial(v)
      else break
    }
    return v
  }

  private primario(): number {
    if (this.come('op', '(')) {
      const v = this.expr()
      if (!this.come('op', ')')) throw new Error('Falta un paréntesis')
      return v
    }
    const t = this.mira()
    if (!t) throw new Error('Expresión incompleta')
    if (t.tipo === 'num') {
      this.i++
      return t.valor
    }
    if (t.tipo === 'id') {
      this.i++
      if (t.valor === 'pi' || t.valor === 'π') return Math.PI
      if (t.valor === 'e') return Math.E
      if (!this.come('op', '(')) throw new Error(`Símbolo desconocido: ${t.valor}`)
      const fn = FUNCIONES[t.valor]
      if (!fn) throw new Error(`Función desconocida: ${t.valor}`)
      const arg = this.expr()
      if (!this.come('op', ')')) throw new Error('Falta un paréntesis')
      const r = fn(arg)
      if (!Number.isFinite(r)) throw new Error('Resultado no numérico')
      return r
    }
    throw new Error('Expresión incompleta')
  }
}

export function evaluar(entrada: string): ResultadoExpr {
  const tokens = tokenizar(entrada)
  if (!tokens.ok) return tokens
  if (tokens.tokens.length === 0) return { ok: false, error: 'Escribe una expresión' }
  try {
    const parser = new Parser(tokens.tokens)
    const valor = parser.expr()
    if (!parser.fin()) return { ok: false, error: 'Expresión incompleta' }
    if (!Number.isFinite(valor)) return { ok: false, error: 'Resultado no numérico' }
    return { ok: true, valor }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo calcular' }
  }
}

export function formatearResultado(n: number): string {
  if (!Number.isFinite(n)) return ''
  const redondo = Math.round(n * 1e10) / 1e10
  if (Object.is(redondo, -0)) return '0'
  return String(redondo)
}

export function borrarUltimo(expr: string): string {
  const s = expr.trimEnd()
  const coincidencia = /(?:[a-zπ]+|\d+(?:[.,]\d*)?|[.,]\d+|\S)\s*$/i.exec(s)
  if (!coincidencia) return ''
  return s.slice(0, s.length - coincidencia[0].length).trimEnd()
}

export function alternarSigno(expr: string): string {
  const s = expr.trim()
  if (!s) return '-'
  if (s.startsWith('-(') && s.endsWith(')')) return s.slice(2, -1)
  if (s.startsWith('-')) return s.slice(1)
  return `-(${s})`
}
