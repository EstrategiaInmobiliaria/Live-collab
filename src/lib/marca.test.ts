import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const prohibido = /\$\s*4\.3\s*m\b|4\.3\s*m\b|4[,.]300[,.]000|4300000/i

function archivos(directorio: string, salida: string[]) {
  for (const nombre of readdirSync(directorio)) {
    if (nombre === 'node_modules' || nombre === 'dist' || nombre === '.git') continue
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) archivos(ruta, salida)
    else if (/\.(ts|tsx|js|json|md|css|html|svg|toml|yml)$/.test(nombre) && !ruta.endsWith('marca.test.ts')) {
      salida.push(ruta)
    }
  }
}

describe('marca', () => {
  it('no menciona el precio excluido', () => {
    const lista: string[] = []
    for (const raiz of ['src', 'public', 'README.md', 'index.html', 'netlify.toml']) {
      const ruta = join(process.cwd(), raiz)
      if (statSync(ruta).isDirectory()) archivos(ruta, lista)
      else lista.push(ruta)
    }
    const fallos = lista.filter((ruta) => prohibido.test(readFileSync(ruta, 'utf8')))
    expect(fallos).toEqual([])
  })
})
