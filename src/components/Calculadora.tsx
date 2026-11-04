import { useRef, useState } from 'react'
import { alternarSigno, borrarUltimo, evaluar, formatearResultado } from '../lib/expr'

type Modo = 'basica' | 'cientifica'

const CIENTIFICA = [
  ['sin(', 'cos(', 'tan(', 'sqrt('],
  ['ln(', 'log(', '^', 'π'],
  ['(', ')', '%', '!'],
]

const TECLAS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '⌫', '+'],
]

const ETIQUETA: Record<string, string> = {
  '/': '÷',
  '*': '×',
  '-': '−',
  'sin(': 'sin',
  'cos(': 'cos',
  'tan(': 'tan',
  'sqrt(': '√',
  'ln(': 'ln',
  'log(': 'log',
  '^': 'xʸ',
  '⌫': '←',
}

export function Calculadora() {
  const [modo, setModo] = useState<Modo>('basica')
  const [expresion, setExpresion] = useState('')
  const [resultado, setResultado] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const expresionRef = useRef('')

  function fijarExpresion(valor: string | ((actual: string) => string)) {
    const siguiente = typeof valor === 'function' ? valor(expresionRef.current) : valor
    expresionRef.current = siguiente
    setExpresion(siguiente)
  }

  function calcular(texto = expresionRef.current) {
    const evaluado = evaluar(texto)
    if (!evaluado.ok) {
      setError(evaluado.error)
      return
    }
    const bonito = formatearResultado(evaluado.valor)
    setResultado(bonito)
    fijarExpresion(bonito)
    setError(null)
  }

  function pulsar(tecla: string) {
    if (tecla === '⌫') {
      fijarExpresion((actual) => borrarUltimo(actual))
      setError(null)
      return
    }
    if (tecla === 'C') {
      fijarExpresion('')
      setResultado('0')
      setError(null)
      return
    }
    if (tecla === '±') {
      fijarExpresion((actual) => alternarSigno(actual))
      setError(null)
      return
    }
    if (tecla === '=') {
      calcular()
      return
    }
    fijarExpresion((actual) => `${actual}${tecla}`)
    setError(null)
  }

  return (
    <section className="bloque" aria-label="Calculadora">
      <div className="segmento" role="tablist" aria-label="Modo de calculadora">
        <button type="button" aria-pressed={modo === 'basica'} onClick={() => setModo('basica')}>
          Básica
        </button>
        <button type="button" aria-pressed={modo === 'cientifica'} onClick={() => setModo('cientifica')}>
          Científica
        </button>
      </div>
      <div className="visor" aria-live="polite">
        <label className="sr" htmlFor="expresion">
          Expresión
        </label>
        <input
          id="expresion"
          value={expresion}
          placeholder="0"
          inputMode="text"
          autoComplete="off"
          onChange={(evento) => {
            fijarExpresion(evento.target.value)
            setError(null)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              calcular(evento.currentTarget.value)
            }
          }}
        />
        <strong>{error ?? resultado}</strong>
        {modo === 'cientifica' && <span className="grados">Grados</span>}
      </div>
      {modo === 'cientifica' && (
        <div className="teclas cientifica">
          {CIENTIFICA.flat().map((tecla) => (
            <button key={tecla} type="button" onClick={() => pulsar(tecla)}>
              {ETIQUETA[tecla] ?? tecla}
            </button>
          ))}
        </div>
      )}
      <div className="teclas">
        {TECLAS.flat().map((tecla) => (
          <button key={tecla} type="button" onClick={() => pulsar(tecla)}>
            {ETIQUETA[tecla] ?? tecla}
          </button>
        ))}
        <button type="button" onClick={() => pulsar('±')}>
          ±
        </button>
        <button type="button" onClick={() => pulsar('C')}>
          C
        </button>
        <button type="button" className="igual" onClick={() => pulsar('=')}>
          =
        </button>
      </div>
    </section>
  )
}
