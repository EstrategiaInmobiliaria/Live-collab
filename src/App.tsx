import { useEffect, useRef, useState } from 'react'
import { BarraHerramientas } from './components/BarraHerramientas'
import { Calculadora } from './components/Calculadora'
import { Encabezado } from './components/Encabezado'
import { EstadoJson } from './components/EstadoJson'
import { Inmobiliaria } from './components/Inmobiliaria'
import { Lienzo, type LienzoHandle } from './components/Lienzo'
import { prepararEnlace } from './lib/enlace'
import { COLORES_PLUMA, type Herramienta } from './tipos'
import { conectarSala } from './sync/conectar'
import { SalaContext, useInstantanea, useSala } from './sync/contexto'
import { SalaStore } from './sync/sala'

export function App() {
  const [sala, setSala] = useState(prepararEnlace)
  return <SalaActiva key={sala} sala={sala} onSala={setSala} />
}

function SalaActiva({ sala, onSala }: { sala: string; onSala: (sala: string) => void }) {
  const [store] = useState(() => new SalaStore(sala))

  useEffect(() => {
    let vivo = true
    let cerrar = () => {}
    void conectarSala(store).then((fin) => {
      if (!vivo) fin()
      else cerrar = fin
    })
    window.liveCollab = {
      obtenerEstado: () => store.obtenerEstado(),
      aplicarEstado: (estado, modo = 'fusionar') => store.aplicar(estado, modo),
      agregarNota: (nota) =>
        store.agregarNota({
          id: nota.id,
          texto: nota.texto,
          x: nota.x ?? 72,
          y: nota.y ?? 72,
          color: nota.color,
        }),
      sala: () => store.sala,
      suscribir: (fn) => store.suscribir(() => fn(store.obtenerEstado())),
    }
    return () => {
      vivo = false
      cerrar()
      if (window.liveCollab?.sala() === store.sala) delete window.liveCollab
    }
  }, [store])

  return (
    <SalaContext.Provider value={store}>
      <Interfaz onSala={onSala} />
    </SalaContext.Provider>
  )
}

function Interfaz({ onSala }: { onSala: (sala: string) => void }) {
  const store = useSala()
  const instantanea = useInstantanea()
  const lienzo = useRef<LienzoHandle>(null)
  const [herramienta, setHerramienta] = useState<Herramienta>('pluma')
  const [color, setColor] = useState<string>(COLORES_PLUMA[0].valor)
  const [grosor, setGrosor] = useState(3.5)
  const [forzarMano, setForzarMano] = useState(false)
  const [panel, setPanel] = useState(false)

  useEffect(() => {
    const escribiendo = (objetivo: EventTarget | null) =>
      objetivo instanceof HTMLElement &&
      (objetivo.tagName === 'INPUT' || objetivo.tagName === 'TEXTAREA' || objetivo.isContentEditable)

    const abajo = (evento: KeyboardEvent) => {
      if (evento.code === 'Space' && !escribiendo(evento.target)) {
        evento.preventDefault()
        setForzarMano(true)
      }
      if (escribiendo(evento.target)) return
      const tecla = evento.key.toLowerCase()
      if ((evento.ctrlKey || evento.metaKey) && tecla === 'z') {
        evento.preventDefault()
        if (evento.shiftKey) store.rehacer()
        else store.deshacer()
        return
      }
      if ((evento.ctrlKey || evento.metaKey) && tecla === 'y') {
        evento.preventDefault()
        store.rehacer()
        return
      }
      if (tecla === 'p') setHerramienta('pluma')
      if (tecla === 'b') setHerramienta('borrador')
      if (tecla === 'n') setHerramienta('nota')
      if (tecla === 'm') setHerramienta('mano')
      if (evento.key === '+' || evento.key === '=') lienzo.current?.zoom(1.15)
      if (evento.key === '-' || evento.key === '_') lienzo.current?.zoom(1 / 1.15)
      if (evento.key === '0') lienzo.current?.encuadrar()
    }
    const arriba = (evento: KeyboardEvent) => {
      if (evento.code === 'Space') setForzarMano(false)
    }
    const soltarMano = () => setForzarMano(false)
    window.addEventListener('keydown', abajo)
    window.addEventListener('keyup', arriba)
    window.addEventListener('blur', soltarMano)
    return () => {
      window.removeEventListener('keydown', abajo)
      window.removeEventListener('keyup', arriba)
      window.removeEventListener('blur', soltarMano)
    }
  }, [store])

  return (
    <div className="app">
      <Encabezado onSala={onSala} />
      <div className="cuerpo">
        <BarraHerramientas
            herramienta={herramienta}
            onHerramienta={setHerramienta}
            color={color}
            onColor={setColor}
            grosor={grosor}
            onGrosor={setGrosor}
            puedeDeshacer={instantanea.puedeDeshacer}
            puedeRehacer={instantanea.puedeRehacer}
            onDeshacer={() => store.deshacer()}
            onRehacer={() => store.rehacer()}
            onAcercar={() => lienzo.current?.zoom(1.15)}
            onAlejar={() => lienzo.current?.zoom(1 / 1.15)}
            onEncuadrar={() => lienzo.current?.encuadrar()}
            onExportar={() => lienzo.current?.exportar()}
            onAbrirCalculadora={() => setPanel(true)}
          />
        <main className="hoja">
          <Lienzo ref={lienzo} herramienta={herramienta} color={color} grosor={grosor} forzarMano={forzarMano} />
        </main>
        <aside className={panel ? 'panel abierto' : 'panel'} aria-label="Calculadora y datos">
          <button type="button" className="cerrar-panel" onClick={() => setPanel(false)}>
            Cerrar
          </button>
          <Calculadora />
          <Inmobiliaria />
          <EstadoJson />
        </aside>
      </div>
      {panel && <button type="button" className="scrim" aria-label="Cerrar calculadora" onClick={() => setPanel(false)} />}
    </div>
  )
}
