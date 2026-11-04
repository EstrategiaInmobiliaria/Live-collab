import { COLORES_PLUMA, type Herramienta } from '../tipos'
import { Icono } from './iconos'

type Props = {
  herramienta: Herramienta
  onHerramienta: (herramienta: Herramienta) => void
  color: string
  onColor: (color: string) => void
  grosor: number
  onGrosor: (grosor: number) => void
  puedeDeshacer: boolean
  puedeRehacer: boolean
  onDeshacer: () => void
  onRehacer: () => void
  onAcercar: () => void
  onAlejar: () => void
  onEncuadrar: () => void
  onExportar: () => void
  onAbrirCalculadora: () => void
}

const herramientas: { id: Herramienta; nombre: string; icono: 'pluma' | 'borrador' | 'nota' | 'mano' }[] = [
  { id: 'pluma', nombre: 'Pluma', icono: 'pluma' },
  { id: 'borrador', nombre: 'Borrador', icono: 'borrador' },
  { id: 'nota', nombre: 'Nota', icono: 'nota' },
  { id: 'mano', nombre: 'Mover', icono: 'mano' },
]

export function BarraHerramientas(props: Props) {
  return (
    <div className="barra" role="toolbar" aria-label="Herramientas del lienzo">
      <div className="barra-scroll">
      <div className="grupo">
        {herramientas.map((item) => (
          <button
            key={item.id}
            type="button"
            className="icono"
            aria-pressed={props.herramienta === item.id}
            aria-label={item.nombre}
            title={item.nombre}
            onClick={() => props.onHerramienta(item.id)}
          >
            <Icono nombre={item.icono} />
          </button>
        ))}
      </div>
      <div className="grupo">
        <button type="button" className="icono" aria-label="Deshacer" title="Deshacer" disabled={!props.puedeDeshacer} onClick={props.onDeshacer}>
          <Icono nombre="deshacer" />
        </button>
        <button type="button" className="icono" aria-label="Rehacer" title="Rehacer" disabled={!props.puedeRehacer} onClick={props.onRehacer}>
          <Icono nombre="rehacer" />
        </button>
        <button type="button" className="icono" aria-label="Acercar" title="Acercar" onClick={props.onAcercar}>
          <Icono nombre="acercar" />
        </button>
        <button type="button" className="icono" aria-label="Alejar" title="Alejar" onClick={props.onAlejar}>
          <Icono nombre="alejar" />
        </button>
        <button type="button" className="icono" aria-label="Ajustar" title="Ajustar" onClick={props.onEncuadrar}>
          <Icono nombre="encuadrar" />
        </button>
        <button type="button" className="icono" aria-label="Exportar PNG" title="Exportar PNG" onClick={props.onExportar}>
          <Icono nombre="png" />
        </button>
      </div>
      <div className="grupo colores">
        {COLORES_PLUMA.map((item) => (
          <button
            key={item.valor}
            type="button"
            className="muestra"
            style={{ background: item.valor }}
            aria-label={item.nombre}
            aria-pressed={props.color === item.valor}
            title={item.nombre}
            onClick={() => props.onColor(item.valor)}
          />
        ))}
        <label className="muestra personalizado" title="Otro color">
          <span className="sr">Otro color</span>
          <input type="color" value={props.color} onChange={(evento) => props.onColor(evento.target.value)} />
        </label>
      </div>
      <label className="grosor">
        <span>Grosor</span>
        <input
          type="range"
          min={1.5}
          max={16}
          step={0.5}
          value={props.grosor}
          onChange={(evento) => props.onGrosor(Number(evento.target.value))}
        />
      </label>
      </div>
      <button type="button" className="boton-calculadora" onClick={props.onAbrirCalculadora}>
        <Icono nombre="calculadora" />
        Calculadora
      </button>
    </div>
  )
}
