# Formato de canción de Entona

Una canción es un archivo `.json` con la melodía como lista de notas. Se importa desde
**+ Importar canción** y se genera con **Exportar .json** en el editor.

```json
{
  "formato": "entona-cancion",
  "version": 1,
  "nombre": "Sublime gracia",
  "duracion": 36.56,
  "afinacion": 0,
  "youtube": "dQw4w9WgXcQ",
  "notas": [
    {"t": 1.0,  "d": 0.68, "m": 62},
    {"t": 1.72, "d": 1.40, "m": 67}
  ]
}
```

| Campo | Significado |
|---|---|
| `formato` | Siempre `"entona-cancion"` |
| `version` | `1` |
| `nombre` | Título que aparece en la lista |
| `duracion` | Duración total en segundos. Opcional: si falta, se calcula con la última nota |
| `afinacion` | Desviación de la grabación en cents respecto a La = 440 Hz, entre −50 y 50. Normalmente `0` |
| `youtube` | Opcional. Identificador del video de YouTube (11 caracteres) al que van ligadas las notas. Con él, el karaoke suena con el video |
| `notas` | Lista de notas, en cualquier orden |

Cada nota:

| Campo | Significado |
|---|---|
| `t` | Inicio en segundos desde el comienzo |
| `d` | Duración en segundos |
| `m` | Número de nota MIDI, entero, entre 24 y 96 |

Entre dos notas seguidas conviene dejar un hueco pequeño (0,03 a 0,05 s) para que se oigan separadas.

## Números MIDI

Do central es 60 y cada semitono suma 1. La4 (440 Hz) es 69.

| Octava | Do | Do♯ | Re | Re♯ | Mi | Fa | Fa♯ | Sol | Sol♯ | La | La♯ | Si |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 |
| 3 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 |
| 4 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 |
| 5 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 |

## Pasar de una partitura a segundos

Si la canción va a un tempo fijo, un tiempo dura `60 / bpm` segundos. A 100 bpm, una negra dura
0,6 s, una blanca 1,2 s y una corchea 0,3 s. Suma las duraciones para obtener el `t` de cada nota.

Si el archivo trae `youtube`, los tiempos de las notas se cuentan desde el inicio de ese video y el
karaoke lo reproduce. Así se puede compartir la melodía de una canción sin compartir el audio.

Una canción importada desde `.json` sin `youtube` no tiene audio: en karaoke suena con la guía sintetizada y se
puede subir o bajar por semitonos desde «Tono de la canción».
