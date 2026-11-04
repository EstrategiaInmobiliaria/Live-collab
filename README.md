# Live-collab · Estrategia Inmobiliaria

Lienzo colaborativo para visitas, croquis y números de un inmueble. Se abre con una URL, también dentro de un iframe, y se puede usar desde una sesión de ChatGPT, Claude o Grok que tenga navegador. La interfaz está en español.

No hay servidor de dibujos. El estado viaja de navegador a navegador y queda guardado en este dispositivo.

## Qué incluye

- Lienzo con lápiz, borrador, notas, deshacer, rehacer, zoom, desplazamiento y exportación PNG.
- Puntero estándar (`Pointer Events`): presión, inclinación y borrador del S Pen. No usa APIs de Apple Pencil.
- Rechazo de palma: mientras el lápiz está en contacto, o hasta unos 900 ms después del último evento del lápiz, los toques no dibujan.
- Calculadora básica y científica (trigonometría en grados) y una ayuda inmobiliaria: precio por m², enganche y mensualidad de amortización francesa.
- Sala en vivo para quien abra el mismo enlace.
- Documento JSON para que un asistente lea o escriba notas, trazos y el escenario.

## S Pen en Galaxy Z Fold

Probado para Chrome y Samsung Internet, con la pantalla plegada y desplegada.

1. Abre el enlace en Chrome o Samsung Internet. No hace falta instalar una app.
2. Dibuja con la punta del S Pen. La presión cambia el grosor. Si el navegador informa la inclinación (`altitudeAngle`), un trazo más tumbado sale un poco más ancho.
3. Apoya la palma: esos toques se ignoran mientras el lápiz está cerca o acaba de usarse. Para hacer zoom con dos dedos, aleja el S Pen un momento.
4. Sin el lápiz, un dedo dibuja y dos dedos hacen zoom y paneo.
5. El extremo de borrar del lápiz (botón 5 del estándar Pointer Events) activa la goma. La goma quita tramos del trazo, no píxeles sueltos.
6. Pantalla cubierta (estrecha): la barra de herramientas queda abajo y la calculadora se abre en una hoja. Pantalla abierta, a partir de unos 680 px de ancho: la calculadora queda al lado del lienzo.
7. Rueda del ratón o pellizco para el zoom. La tecla Espacio deja mover el papel sin cambiar de herramienta. El lápiz sigue dibujando aunque la herramienta activa sea Mover.

Atajos con el foco fuera de un campo de texto: `P` pluma, `B` borrador, `N` nota, `M` mover, `Ctrl+Z` deshacer, `Ctrl+Y` rehacer, `+` y `-` zoom, `0` ajustar.

## Abrir la misma sala desde ChatGPT, Claude y Grok

1. Despliega el sitio (GitHub Pages o Netlify) o ejecútalo en local.
2. Entra y pulsa **Copiar enlace**. La sala va en el fragmento, por ejemplo `https://tu-dominio/#sala=ei-visita-roma`. Quien tenga ese enlace entra a la misma sala. El nombre de la sala es el secreto: no lo publiques si el croquis es privado.
3. Pega el enlace en el chat.
   - **ChatGPT:** si la sesión puede navegar (modo agente, Atlas o la herramienta de navegador), pide que abra esa URL. Varias sesiones pueden abrir el mismo enlace y verse.
   - **Claude:** pega el enlace y, si usas Claude con navegador o computer use, pide que lo abra. El iframe de más abajo también sirve para incrustarlo en una página vuestra.
   - **Grok:** pide que abra la URL con el navegador, o ábrela tú y comparte la sala.
4. Para escribir notas sin dibujar a mano, el asistente que pueda ejecutar JavaScript en la página usa `window.liveCollab`. Si solo puede usar la página, abre **Estado JSON**, pega el documento y pulsa **Fusionar**.

Un `fetch` al HTML estático no devuelve el lienzo en vivo. El dibujo no está en el servidor: está en los navegadores unidos a la sala.

```js
liveCollab.agregarNota({ texto: 'Revisar fachada norte', x: 120, y: 90 })
const estado = liveCollab.obtenerEstado()
liveCollab.aplicarEstado({ notas: [{ id: 'fachada', texto: 'Medir 12 m', x: 40, y: 40 }] }, 'fusionar')
const dejarDeEscuchar = liveCollab.suscribir((siguiente) => console.log(siguiente.notas.length))
```

También se puede sembrar notas en el enlace, una sola vez por sesión:

`#sala=ei-visita-roma&notas=` + base64url del JSON `{ "notas": [ { "texto": "…", "x": 40, "y": 40 } ] }`

La página fusiona esas notas y luego quita el parámetro para no duplicarlas al recargar.

Para incrustar:

```html
<iframe
  src="https://TU-DOMINIO/#sala=ei-visita-roma"
  title="Live-collab"
  style="width: 100%; height: 100%; min-height: 640px; border: 0"
  allow="clipboard-write"
></iframe>
```

## Sincronización

| Pieza | Para qué |
| --- | --- |
| [Yjs](https://docs.yjs.dev/) | Documento compartido: trazos, notas (`Y.Text`) y escenario inmobiliario. |
| [y-webrtc](https://github.com/yjs/y-webrtc) | Transporte entre navegadores. Señalización pública en `wss://y-webrtc-eu.fly.dev`. Ese servidor solo ayuda a encontrarse (SDP). El contenido va por un canal WebRTC cifrado en tránsito. |
| BroadcastChannel | Otras pestañas del mismo navegador, aunque la señalización no conteste. Viene con y-webrtc. |
| [y-indexeddb](https://github.com/yjs/y-indexeddb) | La sala sobrevive a recargar en este dispositivo. |
| STUN | Lo usa el transporte WebRTC para atravesar la red. Hace falta HTTPS (Pages o Netlify lo dan; `localhost` también es un contexto seguro). |

La sala de señalización se llama `ei-live-collab:` más el nombre del enlace, para no chocar con otras apps que usen el mismo servidor público.

La calculadora básica y científica es local. El escenario inmobiliario (precio, metros, enganche, tasa y plazo) sí se comparte, para que todos vean la misma cuenta. Deshacer y rehacer cubren trazos y notas de este navegador, no el escenario.

Si la señalización pública no responde, el lienzo sigue en este dispositivo y entre pestañas del mismo navegador. El JSON se puede copiar a mano a otra sesión.

## Formato JSON

Esquema publicado junto al sitio: [`/esquema-estado.json`](public/esquema-estado.json). Ejemplo: [`/ejemplo-estado.json`](public/ejemplo-estado.json).

```json
{
  "version": 1,
  "sala": "ei-visita-roma",
  "notas": [
    { "id": "n1", "texto": "Revisar orientación", "x": 80, "y": 64, "color": "#1e4d3d" }
  ],
  "trazos": [
    {
      "id": "t1",
      "color": "#1a2332",
      "grosor": 3,
      "puntos": [{ "x": 10, "y": 10, "p": 0.4 }, { "x": 40, "y": 18, "p": 0.9 }]
    }
  ],
  "escenario": {
    "precio": 3250000,
    "metros": 86,
    "enganchePct": 20,
    "tasaAnual": 11.5,
    "plazoAnios": 20
  }
}
```

`x` e `y` son píxeles del papel, con el origen arriba a la izquierda. `p` es el grosor relativo del punto (la presión del S Pen, con un pequeño extra si el lápiz va inclinado). Una lista suelta de notas también es válida.

En el panel, **Fusionar** actualiza notas con el mismo id y agrega trazos nuevos. **Reemplazar** sustituye trazos, notas y escenario.

La mensualidad es una amortización francesa con tasa nominal convertible cada mes. Con tasa 0 se reparte el saldo en partes iguales. Es una estimación, no una oferta de crédito.

## Desarrollo

```bash
npm install
npm test
npm run dev
```

Abre la URL que imprime Vite. Para probar dos personas en la misma máquina, abre el enlace en dos pestañas: se ven por BroadcastChannel sin salir a la red.

```bash
npm run build
npm run preview
```

`base` de Vite es `./`, así que `dist/` funciona en la raíz de Netlify y en un sitio de proyecto de GitHub Pages.

## Despliegue

**Netlify:** repositorio conectado, comando `npm test && npm run build`, carpeta `dist`. `netlify.toml` ya lo deja así y permite incrustar la página en un iframe.

**GitHub Pages:** el workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publica `main` con el artefacto de Pages. En el repositorio: Settings → Pages → Source: GitHub Actions. La URL de un sitio de proyecto queda como `https://<usuario>.github.io/Live-collab/`. Los enlaces de sala usan el fragmento `#sala=`, así que no hace falta reescribir rutas.

## Privacidad

No operamos un backend con los croquis. El nombre de la sala viaja al servidor de señalización público para poder emparejar navegadores. No pongas datos sensibles en el nombre de la sala. El dibujo y las notas van entre los pares. Cualquiera con el enlace puede entrar y editar.
