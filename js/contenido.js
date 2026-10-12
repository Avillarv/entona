/* Entona · contenido: unidades de ejercicios y canciones de dominio público.
   Cada nota es [semitonos sobre el tono de inicio, duración en tiempos]. Un silencio es [null, tiempos]. */
(function(){
'use strict';
const E = window.Entona;

const ODA = [[4,1],[4,1],[5,1],[7,1],[7,1],[5,1],[4,1],[2,1],[0,1],[0,1],[2,1],[4,1]];
const FRAY_A = [[0,1],[2,1],[4,1],[0,1]], FRAY_B = [[4,1],[5,1],[7,2]],
      FRAY_C = [[7,.5],[9,.5],[7,.5],[5,.5],[4,1],[0,1]], FRAY_D = [[0,1],[-5,1],[0,2]];
const NOCHE_A = [[7,1.5],[9,.5],[7,1],[4,3]], NOCHE_B = [[9,2],[9,1],[12,1.5],[11,.5],[9,1]];
const AGIL = [[0,.5],[2,.5],[4,.5],[5,.5],[7,.5],[5,.5],[4,.5],[2,.5]];

E.GRUPOS = [
  {id:'explorar', nombre:'Explorar'},
  {id:'u1', nombre:'Unidad 1 · Afinar'},
  {id:'u2', nombre:'Unidad 2 · Saltos'},
  {id:'u3', nombre:'Unidad 3 · Control'},
  {id:'canciones', nombre:'Canciones'},
  {id:'mias', nombre:'Mis canciones'},
];

E.PIEZAS = [
  {id:'libre', grupo:'explorar', etiqueta:'Explorar', nombre:'Canto libre', desc:'Mira qué nota sale', libre:true,
   tip:'Canta lo que quieras. Verás la nota exacta, cuánto te desvías y el rango que alcanzas.'},

  {id:'sostenida', grupo:'u1', nombre:'Nota sostenida', desc:'Estabilidad', bpm:80, guia:'each',
   tip:'Toma aire sin subir los hombros y suéltalo parejo. Usa una vocal abierta, como «aaa», y mantén la línea recta.',
   notas:[[0,4],[2,4],[0,4]]},
  {id:'escalones', grupo:'u1', nombre:'Escalones', desc:'Tres notas vecinas', bpm:80, guia:'each',
   tip:'Sube y baja por notas vecinas. Piensa la nota antes de cantarla en vez de buscarla deslizando la voz.',
   notas:[[0,2],[2,2],[4,2],[2,2],[0,2]]},
  {id:'cinco', grupo:'u1', nombre:'Cinco notas', desc:'Escala de calentamiento', bpm:80, guia:'each',
   tip:'El calentamiento clásico. Mantén el mismo volumen al subir y no empujes la voz en las notas altas.',
   notas:[[0,1],[2,1],[4,1],[5,1],[7,2],[5,1],[4,1],[2,1],[0,2]]},

  {id:'terceras', grupo:'u2', nombre:'Terceras', desc:'Saltos cortos', bpm:80, guia:'each',
   tip:'Cada pareja salta una nota. Canta el salto limpio, sin arrastrar la voz de una nota a la otra.',
   notas:[[0,1],[4,1],[2,1],[5,1],[4,1],[7,1],[5,1],[2,1],[0,2]]},
  {id:'saltos', grupo:'u2', nombre:'Arpegio', desc:'Las notas del acorde', bpm:80, guia:'each',
   tip:'Las notas ya no son vecinas. Escucha la guía, imagina el salto y cae directo en la nota.',
   notas:[[0,2],[4,2],[7,2],[4,2],[0,2]]},
  {id:'octava', grupo:'u2', nombre:'Octava', desc:'Arpegio completo', bpm:80, guia:'each',
   tip:'El salto más grande. Si la nota alta te aprieta la garganta, baja el tono de inicio un par de semitonos.',
   notas:[[0,2],[4,1],[7,1],[12,2],[7,1],[4,1],[0,2]]},

  {id:'escala', grupo:'u3', nombre:'Escala mayor', desc:'Ocho notas, ida y vuelta', bpm:80, guia:'first',
   tip:'La escala completa. Al bajar, la afinación suele caerse: piensa cada nota un poco más alta de lo que te pide el cuerpo.',
   notas:[[0,1],[2,1],[4,1],[5,1],[7,1],[9,1],[11,1],[12,2],[11,1],[9,1],[7,1],[5,1],[4,1],[2,1],[0,2]]},
  {id:'agil', grupo:'u3', nombre:'Notas rápidas', desc:'Agilidad', bpm:72, guia:'first',
   tip:'Notas cortas y ligeras. Si no llegas, baja la velocidad en modo karaoke antes de forzar la voz.',
   notas:[...AGIL, ...AGIL, [0,2]]},
  {id:'larga', grupo:'u3', nombre:'Notas largas', desc:'Resistencia de aire', bpm:80, guia:'each',
   tip:'Tres notas de varios segundos. Reparte el aire: empieza suave y llega al final sin que la nota tiemble ni se caiga.',
   notas:[[0,6],[4,6],[7,6]]},

  {id:'estrellita', grupo:'canciones', nombre:'Estrellita', desc:'Tradicional', bpm:100, guia:'first',
   tip:'«Estrellita, ¿dónde estás?». Tiene un salto grande al principio y luego baja por escalones.',
   notas:[[0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2]]},
  {id:'fray', grupo:'canciones', nombre:'Fray Santiago', desc:'Tradicional', bpm:108, guia:'first',
   tip:'Cada frase se repite dos veces, así que tienes una segunda oportunidad para corregir la afinación.',
   notas:[...FRAY_A,...FRAY_A,...FRAY_B,...FRAY_B,...FRAY_C,...FRAY_C,...FRAY_D,...FRAY_D]},
  {id:'oda', grupo:'canciones', nombre:'Oda a la alegría', desc:'Beethoven', bpm:108, guia:'first',
   tip:'Melodía de Beethoven. Se mueve casi siempre por notas vecinas, ideal para sostener la afinación en frases largas.',
   notas:[...ODA,[4,1.5],[2,.5],[2,2],...ODA,[2,1.5],[0,.5],[0,2]]},
  {id:'cumple', grupo:'canciones', nombre:'Cumpleaños feliz', desc:'Tradicional', bpm:100, compas:3, anacrusa:1, guia:'first',
   tip:'Parece fácil, pero tiene un salto de octava en la tercera frase. Empieza más grave de lo que crees necesitar.',
   notas:[[-5,.75],[-5,.25],[-3,1],[-5,1],[0,1],[-1,2],[-5,.75],[-5,.25],[-3,1],[-5,1],[2,1],[0,2],
          [-5,.75],[-5,.25],[7,1],[4,1],[0,1],[-1,1],[-3,1],[5,.75],[5,.25],[4,1],[0,1],[2,1],[0,2]]},
  {id:'noche', grupo:'canciones', nombre:'Noche de paz', desc:'Gruber · rango amplio', bpm:120, compas:3, guia:'first',
   tip:'La más exigente: recorre casi una octava y media. Ajusta el tono de inicio hasta que la nota más alta salga sin esfuerzo.',
   notas:[...NOCHE_A,...NOCHE_A,[14,2],[14,1],[11,3],[12,2],[12,1],[7,3],
          ...NOCHE_B,...NOCHE_A,...NOCHE_B,...NOCHE_A,
          [14,2],[14,1],[17,1.5],[14,.5],[11,1],[12,3],[16,3],
          [12,1],[7,1],[4,1],[7,1.5],[5,.5],[2,1],[0,3]]},
];

/* Numeración de ejercicios dentro de cada unidad, para la etiqueta sobre el título. */
(function(){
  let n = 0;
  E.PIEZAS.forEach(p => {
    if(p.grupo==='canciones') p.etiqueta = 'Canción';
    else if(!p.libre) p.etiqueta = 'Ejercicio '+(++n);
  });
})();
})();
