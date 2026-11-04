import { useEffect, useState } from 'react'
import { escribirHash, leerHash, normalizarSala } from '../lib/enlace'
import { Icono } from './iconos'
import { useInstantanea, useSala } from '../sync/contexto'

export function Encabezado({ onSala }: { onSala: (sala: string) => void }) {
  const store = useSala()
  const instantanea = useInstantanea()
  const [salaTexto, setSalaTexto] = useState(store.sala)
  const [nombre, setNombre] = useState(store.nombre)
  const [aviso, setAviso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => setSalaTexto(store.sala), [store.sala])

  useEffect(() => {
    const alVolver = () => {
      const leido = leerHash(location.hash)
      const sala = leido.sala ? normalizarSala(leido.sala) : null
      if (sala) onSala(sala)
    }
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [onSala])

  function unirse() {
    const sala = normalizarSala(salaTexto)
    if (!sala) {
      setAviso('Usa entre 3 y 48 letras o números.')
      return
    }
    setAviso(null)
    if (sala === store.sala) return
    const url = `${location.pathname}${location.search}${escribirHash(sala)}`
    history.pushState(null, '', url)
    onSala(sala)
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1600)
    } catch {
      setAviso('Copia el enlace desde la barra del navegador.')
    }
  }

  const personas = instantanea.pares.length + 1
  const estado = !instantanea.listo
    ? 'Abriendo sala…'
    : personas > 1
      ? `${personas} en la sala`
      : instantanea.buscando
        ? 'Solo tú en la sala'
        : 'Guardado en este dispositivo'

  return (
    <header className="encabezado">
      <div className="marca">
        <div className="monograma" aria-hidden="true">
          EI
        </div>
        <div>
          <p className="producto">Live-collab</p>
          <h1>Estrategia Inmobiliaria</h1>
        </div>
      </div>
      <form
        className="sala"
        onSubmit={(evento) => {
          evento.preventDefault()
          unirse()
        }}
      >
        <label htmlFor="sala">Sala</label>
        <input
          id="sala"
          value={salaTexto}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(evento) => setSalaTexto(evento.target.value)}
        />
        <button type="submit">Unirse</button>
      </form>
      <label className="nombre-usuario">
        <span>Nombre</span>
        <input
          value={nombre}
          maxLength={40}
          onChange={(evento) => setNombre(evento.target.value)}
          onBlur={() => store.fijarNombre(nombre)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.currentTarget.blur()
            }
          }}
        />
      </label>
      <p className="conexion" role="status">
        <span className={personas > 1 ? 'punto en-linea' : 'punto'} />
        {estado}
      </p>
      <button type="button" className="copiar" onClick={() => void copiarEnlace()}>
        <Icono nombre="enlace" />
        {copiado ? 'Enlace copiado' : 'Copiar enlace'}
      </button>
      {(aviso || instantanea.aviso) && <p className="aviso">{aviso || instantanea.aviso}</p>}
    </header>
  )
}
