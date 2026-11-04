import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('No se encontró la raíz de la aplicación')
createRoot(raiz).render(<App />)
