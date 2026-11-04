import { useEffect, useState } from 'react'
import { calcularEscenario, resumenEscenario } from '../lib/inmobiliaria'
import { formatoMXN, parseNumero } from '../lib/numeros'
import type { Escenario } from '../tipos'
import { useInstantanea, useSala } from '../sync/contexto'

const CAMPOS: { clave: keyof Escenario; etiqueta: string; sufijo: string; paso: string }[] = [
  { clave: 'precio', etiqueta: 'Precio del inmueble', sufijo: 'MXN', paso: '1000' },
  { clave: 'metros', etiqueta: 'Superficie', sufijo: 'm²', paso: '0.01' },
  { clave: 'enganchePct', etiqueta: 'Enganche', sufijo: '%', paso: '0.1' },
  { clave: 'tasaAnual', etiqueta: 'Tasa anual', sufijo: '%', paso: '0.01' },
  { clave: 'plazoAnios', etiqueta: 'Plazo', sufijo: 'años', paso: '1' },
]

export function Inmobiliaria() {
  const store = useSala()
  const { escenario } = useInstantanea()
  const resultado = calcularEscenario(escenario)
  const [aviso, setAviso] = useState<string | null>(null)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumenEscenario(escenario))
      setAviso('Resumen copiado')
    } catch {
      setAviso('No se pudo copiar')
    }
  }

  return (
    <section className="bloque" aria-label="Ayuda inmobiliaria">
      <header className="bloque-titulo">
        <h2>Inmobiliaria</h2>
        <p>Precio por m², enganche y mensualidad.</p>
      </header>
      <div className="pago">
        <span>Pago mensual</span>
        <strong>{resultado.pagoMensual === null ? '—' : formatoMXN(resultado.pagoMensual)}</strong>
        <small>Amortización francesa. No es una oferta de crédito.</small>
      </div>
      <dl className="desglose">
        <div>
          <dt>Precio por m²</dt>
          <dd>{resultado.precioM2 === null ? '—' : formatoMXN(resultado.precioM2)}</dd>
        </div>
        <div>
          <dt>Enganche</dt>
          <dd>{resultado.enganche === null ? '—' : formatoMXN(resultado.enganche)}</dd>
        </div>
        <div>
          <dt>A financiar</dt>
          <dd>{resultado.aFinanciar === null ? '—' : formatoMXN(resultado.aFinanciar)}</dd>
        </div>
      </dl>
      <div className="campos">
        {CAMPOS.map((campo) => (
          <Campo
            key={campo.clave}
            etiqueta={campo.etiqueta}
            sufijo={campo.sufijo}
            paso={campo.paso}
            valor={escenario[campo.clave]}
            onChange={(valor) => store.actualizarEscenario({ [campo.clave]: valor })}
          />
        ))}
      </div>
      <button type="button" className="secundario" onClick={() => void copiar()}>
        Copiar resumen
      </button>
      {aviso && <p className="mensaje">{aviso}</p>}
    </section>
  )
}

function Campo({
  etiqueta,
  sufijo,
  paso,
  valor,
  onChange,
}: {
  etiqueta: string
  sufijo: string
  paso: string
  valor: number
  onChange: (valor: number) => void
}) {
  const [texto, setTexto] = useState(String(valor))
  const [foco, setFoco] = useState(false)

  useEffect(() => {
    if (!foco) setTexto(String(valor))
  }, [valor, foco])

  return (
    <label className="campo">
      <span>
        {etiqueta}
        <em>{sufijo}</em>
      </span>
      <input
        inputMode="decimal"
        step={paso}
        value={texto}
        onFocus={() => setFoco(true)}
        onBlur={() => {
          setFoco(false)
          const numero = parseNumero(texto)
          if (numero === null) setTexto(String(valor))
        }}
        onChange={(evento) => {
          const siguiente = evento.target.value
          setTexto(siguiente)
          const numero = parseNumero(siguiente)
          if (numero !== null) onChange(numero)
        }}
      />
    </label>
  )
}
