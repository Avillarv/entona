# Aportar a Entona

¡Gracias por querer ayudar! Cualquier aporte es bienvenido: reportar errores, proponer lecciones,
probarla con tu voz o mejorar el código. Es un proyecto personal que se revisa en tiempo libre, así
que las respuestas pueden tardar.

## Preparar tu copia

1. Haz un *fork* del repositorio y clónalo.
2. Para ver la aplicación: `python3 -m http.server 8000 --bind 127.0.0.1` y abre
   `http://localhost:8000`. No hay paso de compilación: editas un archivo y recargas la página.
3. Para correr las pruebas necesitas Node.js 18 o posterior:

   ```
   npm install
   npx playwright install chromium
   npm test
   ```

   `npm run test:sin-red` salta la prueba que necesita conexión a YouTube.

Las pruebas simulan la voz y el micrófono, así que corren en cualquier computadora y en GitHub. Aun
así, si tu cambio toca el micrófono, la detección o el karaoke, pruébalo también cantando de verdad
y cuéntalo en el PR.

## Cómo está organizado el código

Es JavaScript sin dependencias ni compilación. Cada archivo de `js/` es una función autoejecutable
que agrega lo suyo al espacio de nombres global `Entona`. Se cargan en el orden de `index.html`:

```
index.html               Página única
css/entona.css           Estilos y colores (tema claro y oscuro con variables CSS)
js/
├─ nucleo.js             Utilidades, nombres de notas, estado guardado (Entona.S) y racha
├─ audio.js              Sintetizador, metrónomo, micrófono, detección de tono (YIN) y filtro de voz
├─ contenido.js          Ejercicios y canciones de «Practicar»
├─ biblioteca.js         Canciones importadas: guardado en IndexedDB y JSON
├─ melodia.js            Extracción de melodía desde audio
├─ rollo.js              Dibujo del rollo de piano
├─ youtube.js            Reproductor de YouTube y captura del audio de la pestaña
├─ curso.js              Unidades y lecciones de «Aprender» (contenido)
├─ lecciones.js          Camino del curso y reproductor de lecciones
├─ practica.js           Pieza elegida, modos «a tu ritmo» y karaoke, premios, micrófono
├─ interfaz.js           Lectura en vivo, mapa, transporte, avisos y pintado de la práctica
├─ editor.js             Editor de notas
├─ importar.js           Importar desde archivo, .json o YouTube
└─ app.js                Bucle principal, ajustes del micrófono, secciones, galería y arranque
tests/                   Pruebas automáticas (Playwright)
canciones/               Canciones de ejemplo en JSON
FORMATO-CANCION.md       Formato de intercambio de canciones
```

Los módulos de la aplicación (`practica.js` a `app.js`) comparten el objeto `Entona.app`. Cada uno
toma al inicio lo que necesita de los módulos anteriores y, al final, publica sus funciones con
`Object.assign(P, {...})`. Si un módulo necesita algo de uno que se carga después, lo llama como
`P.nombre()` dentro de una función, nunca al cargar.

Convenciones:

- Nombres, comentarios y textos en español, con el mismo estilo del código que rodea tu cambio.
- Sin dependencias ni compilación: si una mejora necesita una biblioteca, discútelo antes en un *issue*.
- Los colores salen de las variables de `:root` en `css/entona.css`, que tienen versión clara y oscura.
- Los textos para el usuario son cortos, concretos y en segunda persona («Canta la nota»).
- Todo debe funcionar en una pantalla de celular (380 px de ancho) sin desplazamiento horizontal.

## Seguridad

`index.html` tiene una política de seguridad (*Content-Security-Policy*) que solo deja cargar código
propio y conectarse con YouTube y Google Fonts: así la voz de nadie sale de su navegador. Si tu
cambio necesita otro sitio, explica por qué en el *pull request*.

## Agregar una lección

Abre `js/curso.js` y añade una entrada a `lecciones` en la unidad que quieras. Cada lección es una
lista de `pasos`; el comentario al inicio del archivo describe cada tipo. Por ejemplo:

```js
{id:'mi-leccion', nombre:'Mi lección', pasos:[
  {tipo:'explica', titulo:'Título', texto:['Primer párrafo.','Segundo párrafo.'],
   demos:[{etiqueta:'Escuchar', notas:[[0,.5],[4,.5],[7,1]]}]},
  {tipo:'oido', clase:'altura', nivel:2, veces:3},
  {tipo:'canta', titulo:'Canta', notas:[[0,1],[4,1],[7,2]]},
]},
```

El `id` debe ser único: con él se guarda el avance.

## Agregar un ejercicio propio

Abre `js/contenido.js` y añade una entrada a `E.PIEZAS`. Cada nota es
`[semitonos sobre el tono de inicio, duración en tiempos]`:

```js
{id:'mi-ejercicio', grupo:'u3', nombre:'Mi ejercicio', desc:'Descripción corta', bpm:80, guia:'each',
 tip:'Consejo que aparece bajo el título.',
 notas:[[0,1],[4,1],[7,2],[4,1],[0,2]]},
```

`grupo` es `u1`, `u2`, `u3` o `canciones`. `guia` puede ser `each` (toca cada nota antes de
cantarla), `first` o `none`.

## Canciones

En el repositorio solo entran canciones de **dominio público**: la melodía de una canción con
derechos de autor está protegida aunque solo se compartan sus notas.

## Licencia

Al enviar un aporte aceptas que se publique bajo la misma licencia del proyecto,
[GPL-3.0-or-later](LICENSE).
