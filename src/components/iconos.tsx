type Nombre =
  | 'pluma'
  | 'borrador'
  | 'nota'
  | 'mano'
  | 'deshacer'
  | 'rehacer'
  | 'acercar'
  | 'alejar'
  | 'encuadrar'
  | 'png'
  | 'calculadora'
  | 'enlace'

const comun = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function Icono({ nombre }: { nombre: Nombre }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {nombre === 'pluma' && <path {...comun} d="M14.5 5.5l4 4M4 20l3.2-.8L19.2 7.2a1.8 1.8 0 0 0-2.5-2.5L4.8 16.8 4 20z" />}
      {nombre === 'borrador' && <path {...comun} d="M4 15.5 10.2 9.3a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L9.5 21H4.8L4 15.5zM14 21h6" />}
      {nombre === 'nota' && <path {...comun} d="M7 3.5h7.5L19 8v12.5H7zM14.5 3.5V8H19M9.5 12h6M9.5 15.5h4" />}
      {nombre === 'mano' && <path {...comun} d="M12 4v16M4 12h16M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5" />}
      {nombre === 'deshacer' && <path {...comun} d="M8 8H4v4M5 12a7 7 0 1 0 2-5" />}
      {nombre === 'rehacer' && <path {...comun} d="M16 8h4v4M19 12a7 7 0 1 1-2-5" />}
      {nombre === 'acercar' && <path {...comun} d="M10.5 7.5v6M7.5 10.5h6M4.5 10.5a6 6 0 1 0 12 0 6 6 0 0 0-12 0zM15.5 15.5 19 19" />}
      {nombre === 'alejar' && <path {...comun} d="M7.5 10.5h6M4.5 10.5a6 6 0 1 0 12 0 6 6 0 0 0-12 0zM15.5 15.5 19 19" />}
      {nombre === 'encuadrar' && <path {...comun} d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />}
      {nombre === 'png' && <path {...comun} d="M6 3.5h8l4 4V20.5H6zM14 3.5V8h4M8.5 16.5l2.2-2.2 2.3 2.2 1.8-1.8 1.7 1.6" />}
      {nombre === 'calculadora' && <path {...comun} d="M7 3h10v18H7zM9.5 7h5M9.5 11h.01M12 11h.01M14.5 11h.01M9.5 14.5h.01M12 14.5h.01M14.5 14.5h.01M9.5 17.5h.01M12 17.5h.01M14.5 17.5h.01" />}
      {nombre === 'enlace' && <path {...comun} d="M10 13.2a3.8 3.8 0 0 0 5.4.4l1.8-1.8a3.8 3.8 0 0 0-5.4-5.4L10.6 7.6M14 10.8a3.8 3.8 0 0 0-5.4-.4l-1.8 1.8a3.8 3.8 0 0 0 5.4 5.4l1.2-1.2" />}
    </svg>
  )
}
