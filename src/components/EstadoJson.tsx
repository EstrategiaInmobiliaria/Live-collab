import { useState } from 'react'
import { serializarEstado } from '../lib/estado'
import { estadoDeEjemplo } from '../lib/ejemplo'
import type { ModoEstado } from '../tipos'
import { useSala } from '../sync/contexto'

export function EstadoJson() {
  const store = useSala()
  const [texto, setTexto] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  function cargar() {
    setTexto(serializarEstado(store.obtenerEstado()))
    setMensaje('Estado cargado en el recuadro.')
    setConfirmar(false)
  }

  async function copiar() {
    const json = texto.trim() || serializarEstado(store.obtenerEstado())
    try {
      await navigator.clipboard.writeText(json)
      setMensaje('JSON copiado.')
    } catch {
      setMensaje('Selecciona el texto y cópialo a mano.')
    }
  }

  function aplicar(modo: ModoEstado) {
    if (!texto.trim()) {
      setMensaje('Pega o carga un JSON primero.')
      return
    }
    if (modo === 'reemplazar' && !confirmar) {
      setConfirmar(true)
      setMensaje('Reemplazar borra el lienzo actual. Pulsa otra vez para confirmar.')
      return
    }
    try {
      store.aplicar(texto, modo)
      setConfirmar(false)
      setMensaje(modo === 'fusionar' ? 'Notas y trazos fusionados.' : 'Lienzo reemplazado.')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo aplicar')
    }
  }

  return (
    <details className="bloque estado">
      <summary>Estado JSON</summary>
      <p className="ayuda">
        Los asistentes pueden leer y escribir este documento, o llamar <code>liveCollab</code> en la página. Fusionar
        actualiza notas con el mismo id y agrega trazos nuevos. Reemplazar sustituye el lienzo.
      </p>
      <textarea
        value={texto}
        spellCheck={false}
        aria-label="Estado JSON del lienzo"
        placeholder='{"version":1,"notas":[{"texto":"Revisar fachada","x":80,"y":60}]}'
        onChange={(evento) => {
          setTexto(evento.target.value)
          setConfirmar(false)
        }}
      />
      <div className="acciones">
        <button type="button" onClick={cargar}>
          Cargar estado
        </button>
        <button type="button" onClick={() => void copiar()}>
          Copiar JSON
        </button>
        <button type="button" onClick={() => aplicar('fusionar')}>
          Fusionar
        </button>
        <button type="button" className={confirmar ? 'peligro' : ''} onClick={() => aplicar('reemplazar')}>
          {confirmar ? 'Confirmar reemplazo' : 'Reemplazar'}
        </button>
        <button type="button" onClick={() => store.aplicar(estadoDeEjemplo(store.sala), 'fusionar')}>
          Insertar ejemplo
        </button>
      </div>
      {mensaje && <p className="mensaje">{mensaje}</p>}
    </details>
  )
}
