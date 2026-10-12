/* Entona · curso: unidades y lecciones para quien empieza desde cero.
   Cada lección es una lista de pasos. Tipos de paso:
     explica  texto con ejemplos que suenan (demos)
     oido     preguntas de oído con opciones; `clase` = altura | igual | direccion | afinada | paso
     respira  respiración guiada con temporizador
     voz      usar la voz sin nota fija: `modo` sonido (sostener) o rango (sirena)
     calibra  encuentra la nota cómoda y mueve los ejercicios a esa zona
     canta    cantar notas con el micrófono; cada nota es [semitonos sobre el tono de inicio, tiempos]
   En las demos, cada nota es [semitonos sobre el tono de inicio, segundos]; null es silencio. */
(function(){
'use strict';
const E = window.Entona;

const ESTRELLA_A = [[0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2]];
const ESTRELLA_B = [[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2]];
const seg = (ns, s) => ns.map(([n,b]) => [n, b*s]);

E.CURSO = [
  {id:'voz', nombre:'Conoce tu voz', desc:'Qué es una nota, cómo usar el aire y dónde está tu zona cómoda.',
   practica:['libre'],
   lecciones:[
    {id:'agudo-grave', nombre:'Agudo y grave', pasos:[
      {tipo:'explica', titulo:'Cada sonido tiene una altura',
       texto:['Cantar es, sobre todo, controlar la <b>altura</b> del sonido: qué tan agudo o grave suena.',
              'Un sonido <b>agudo</b> es fino y alto, como el canto de un pájaro. Uno <b>grave</b> es grueso y bajo, como un tambor grande.'],
       demos:[{etiqueta:'Una nota grave', notas:[[-7,1.2]]}, {etiqueta:'Una nota aguda', notas:[[12,1.2]]}]},
      {tipo:'explica', titulo:'A cada altura se le llama nota',
       texto:['Las notas tienen nombre: Do, Re, Mi, Fa, Sol, La y Si. Después de Si vuelve a empezar Do, más agudo.',
              'No hace falta memorizarlas. Por ahora basta con saber cuál suena más arriba y cuál más abajo.'],
       demos:[{etiqueta:'Do Re Mi Fa Sol', notas:[[0,.5],[2,.5],[4,.5],[5,.5],[7,1]]}]},
      {tipo:'oido', clase:'altura', nivel:1, veces:3},
      {tipo:'explica', titulo:'Ahora, tu voz',
       texto:['Entona escucha tu voz con el micrófono y te dice qué nota cantas. El sonido se analiza en tu navegador y no sale de tu computadora.',
              'Si tienes audífonos, úsalos: así el micrófono solo te oye a ti.']},
      {tipo:'voz', modo:'sonido', segundos:2, titulo:'Canta una «aaa»',
       texto:'En la nota que quieras, cómoda y sin forzar. Sostenla hasta llenar la barra.'},
      {tipo:'calibra'},
    ]},
    {id:'postura-aire', nombre:'Postura y aire', pasos:[
      {tipo:'explica', titulo:'Tu cuerpo es el instrumento',
       texto:['De pie, con los pies separados al ancho de las caderas y las rodillas sueltas, sin trabarlas.',
              'Hombros relajados y hacia abajo. La cabeza derecha, como si un hilo tirara suave de la coronilla.',
              'Si cantas sentado, apoya los dos pies en el piso y despega la espalda del respaldo.']},
      {tipo:'explica', titulo:'Respira hacia abajo',
       texto:['Pon una mano sobre el abdomen, justo encima del ombligo. Al tomar aire, la mano debe salir hacia afuera.',
              'Si lo que sube son los hombros o el pecho, el aire se queda arriba y la voz sale apretada.',
              'Al cantar, el aire sale despacio y parejo, como al inflar un globo con calma.']},
      {tipo:'respira', ciclos:3, titulo:'Respiración con «sss»',
       texto:'Mano en el abdomen. Sigue el círculo: crece al tomar aire y se encoge al soltarlo.',
       fases:[['Toma aire por la nariz',4,'entra'],['Suelta el aire con una «sss» pareja',8,'sale']]},
      {tipo:'explica', titulo:'El zumbido',
       texto:['Ahora usa ese aire para hacer sonido. Con la boca cerrada, haz «mmm», como cuando algo te gusta.',
              'Deberías sentir cosquillas en los labios y la nariz. Es la forma más suave de despertar la voz.']},
      {tipo:'voz', modo:'sonido', segundos:3, titulo:'Haz un «mmm» largo',
       texto:'Boca cerrada y labios sueltos. Mantén el sonido parejo hasta llenar la barra.'},
      {tipo:'voz', modo:'sonido', segundos:4, titulo:'Abre a «mmmaaa»',
       texto:'Empieza con «mmm» y abre la boca a «aaa» sin cortar el sonido.'},
    ]},
    {id:'igual-distinta', nombre:'¿Igual o distinta?', pasos:[
      {tipo:'explica', titulo:'Afinar es igualar',
       texto:['Cantar <b>afinado</b> significa que la nota que cantas es la misma que la que suena.',
              'El primer paso es oírlo: ¿dos notas son iguales o distintas?'],
       demos:[{etiqueta:'Iguales', notas:[[4,.8],[null,.2],[4,.8]]}, {etiqueta:'Distintas', notas:[[4,.8],[null,.2],[7,.8]]}]},
      {tipo:'oido', clase:'igual', nivel:1, veces:4},
      {tipo:'explica', titulo:'Canta la nota que oyes',
       texto:['Vas a escuchar una nota. Cántala igual, con «aaa» o «uuu».',
              'Cuando aciertes, la nota se va llenando de verde. Sostenla hasta completarla.',
              'Si se te olvida, pulsa «Escuchar otra vez». Si sale una octava más arriba o más abajo, también vale.']},
      {tipo:'canta', titulo:'Canta la nota', notas:[[4,4]]},
      {tipo:'canta', titulo:'Otra nota', notas:[[0,4]]},
      {tipo:'canta', titulo:'Una más', notas:[[2,4]]},
    ]},
  ]},

  {id:'afinar', nombre:'Afinar', desc:'Encontrar la nota y quedarte en ella.',
   practica:['sostenida','escalones','larga'],
   lecciones:[
    {id:'escucha-repite', nombre:'Escucha y repite', pasos:[
      {tipo:'explica', titulo:'Piensa antes de cantar',
       texto:['El error más común es empezar a cantar mientras la nota todavía suena y buscarla deslizando la voz.',
              'Mejor así: escucha, imagina la nota por dentro (puedes tararearla en silencio) y luego cántala de una vez.']},
      {tipo:'canta', titulo:'Escucha, piensa, canta', notas:[[0,3]]},
      {tipo:'canta', titulo:'Escucha, piensa, canta', notas:[[3,3]]},
      {tipo:'oido', clase:'igual', nivel:2, veces:2},
      {tipo:'canta', titulo:'Escucha, piensa, canta', notas:[[-2,3]]},
      {tipo:'canta', titulo:'Escucha, piensa, canta', notas:[[5,3]]},
    ]},
    {id:'un-poco-mas', nombre:'Un poco más arriba', pasos:[
      {tipo:'explica', titulo:'Casi, pero no',
       texto:['A veces la nota es casi la correcta, pero queda un poco por debajo o por encima. Se dice que está <b>baja</b> o <b>alta</b>.',
              'La distancia entre dos notas vecinas se divide en 100 partes llamadas <b>cents</b>. Una diferencia de 20 o 30 cents ya se nota.'],
       demos:[{etiqueta:'Afinadas', notas:[[4,.9],[null,.2],[4,.9]]}, {etiqueta:'La segunda, baja', notas:[[4,.9],[null,.2],[3.6,.9]]}]},
      {tipo:'oido', clase:'afinada', nivel:1, veces:4},
      {tipo:'explica', titulo:'Cómo leer la barra',
       texto:['Mientras cantas verás una barra con una aguja. Si la aguja va a la izquierda, estás baja: sube un poco. Si va a la derecha, baja un poco.',
              'Corrige con cambios pequeños, sin saltos bruscos. La franja verde es la zona afinada.']},
      {tipo:'canta', titulo:'Centra la aguja', notas:[[0,5]]},
      {tipo:'canta', titulo:'Centra la aguja', notas:[[2,5]]},
      {tipo:'canta', titulo:'Centra la aguja', notas:[[4,5]]},
    ]},
    {id:'notas-largas', nombre:'Notas largas', pasos:[
      {tipo:'explica', titulo:'Quedarte en la nota',
       texto:['Llegar a la nota es la mitad del trabajo. La otra mitad es mantenerla mientras dura.',
              'Cuando el aire se acaba, la nota suele caerse. Toma aire antes de empezar y suéltalo despacio, como practicaste con la «sss».']},
      {tipo:'respira', ciclos:2, titulo:'Prepara el aire',
       texto:'Esta vez suelta el aire durante más tiempo.',
       fases:[['Toma aire por la nariz',4,'entra'],['Suelta el aire con una «sss» pareja',10,'sale']]},
      {tipo:'canta', titulo:'Nota larga', notas:[[0,7]]},
      {tipo:'canta', titulo:'Nota larga', notas:[[4,7]]},
      {tipo:'canta', titulo:'Nota larga', notas:[[2,7]]},
    ]},
  ]},

  {id:'mover', nombre:'Moverse entre notas', desc:'Subir, bajar y saltar sin perder la afinación.',
   practica:['cinco','terceras','saltos'],
   lecciones:[
    {id:'sube-baja', nombre:'Sube o baja', pasos:[
      {tipo:'explica', titulo:'Las melodías se mueven',
       texto:['Una melodía es una serie de notas. Cada nota puede subir, bajar o repetirse respecto de la anterior.',
              'Saber hacia dónde va la melodía te ayuda a cantarla sin buscar.'],
       demos:[{etiqueta:'Sube', notas:[[0,.5],[2,.5],[4,.8]]}, {etiqueta:'Baja', notas:[[4,.5],[2,.5],[0,.8]]}]},
      {tipo:'oido', clase:'direccion', nivel:1, veces:4},
      {tipo:'canta', titulo:'Tres notas hacia arriba', notas:[[0,1],[2,1],[4,2]]},
      {tipo:'canta', titulo:'Tres notas hacia abajo', notas:[[4,1],[2,1],[0,2]]},
    ]},
    {id:'escalera', nombre:'La escalera', pasos:[
      {tipo:'explica', titulo:'Paso a paso',
       texto:['Cuando las notas son vecinas, la melodía avanza por <b>pasos</b>, como en una escalera.',
              'Do Re Mi Fa Sol es una escalera de cinco escalones. Es el calentamiento que usan casi todos los cantantes.'],
       demos:[{etiqueta:'Escuchar la escalera', notas:[[0,.5],[2,.5],[4,.5],[5,.5],[7,1]]}]},
      {tipo:'canta', titulo:'Subir la escalera', notas:[[0,1],[2,1],[4,1],[5,1],[7,2]]},
      {tipo:'canta', titulo:'Bajar la escalera', notas:[[7,1],[5,1],[4,1],[2,1],[0,2]]},
      {tipo:'explica', titulo:'Al bajar, no te caigas',
       texto:['Al bajar, la voz tiende a quedarse corta y desafinar hacia abajo.',
              'Piensa cada nota un poquito más arriba de lo que te pide el cuerpo.']},
      {tipo:'canta', titulo:'Ida y vuelta', notas:[[0,1],[2,1],[4,1],[5,1],[7,1],[5,1],[4,1],[2,1],[0,2]]},
    ]},
    {id:'saltos', nombre:'Saltos', pasos:[
      {tipo:'explica', titulo:'Pasos y saltos',
       texto:['Cuando la melodía se salta notas, hace un <b>salto</b>. Los saltos cuestan más porque no puedes llegar deslizando.',
              'El truco: imagina la nota de llegada antes de saltar y cae directo en ella.'],
       demos:[{etiqueta:'Un paso', notas:[[0,.7],[2,.9]]}, {etiqueta:'Un salto', notas:[[0,.7],[7,.9]]}]},
      {tipo:'oido', clase:'paso', nivel:1, veces:4},
      {tipo:'canta', titulo:'Un salto corto', notas:[[0,2],[4,2]]},
      {tipo:'canta', titulo:'Un salto grande', notas:[[0,2],[7,2]]},
      {tipo:'canta', titulo:'Las notas del acorde', notas:[[0,1],[4,1],[7,1],[4,1],[0,2]]},
    ]},
  ]},

  {id:'cancion', nombre:'Tu primera canción', desc:'Calentar bien y cantar una melodía completa.',
   practica:['estrellita','fray','oda'],
   lecciones:[
    {id:'calentamiento', nombre:'Calentamiento', pasos:[
      {tipo:'explica', titulo:'Por qué calentar',
       texto:['La voz depende de músculos pequeños. Unos minutos de calentamiento hacen que las notas salgan con menos esfuerzo y cuidan la garganta.',
              'Si algo duele o raspa, para. Cantar no debe doler.']},
      {tipo:'explica', titulo:'Vibración de labios',
       texto:['Junta los labios sueltos y sopla para que vibren, como un motorcito: «brrr». Si no sale, empuja con suavidad las mejillas con los dedos.',
              'Es uno de los ejercicios favoritos de los profesores de canto: relaja y une el aire con la voz.']},
      {tipo:'voz', modo:'sonido', segundos:4, titulo:'Haz «brrr» con voz',
       texto:'Agrega voz a la vibración de labios y sostenla hasta llenar la barra.'},
      {tipo:'explica', titulo:'La sirena',
       texto:['Ahora desliza la voz de grave a agudo y de vuelta, como una sirena, con «uuu» o con «brrr».',
              'No fuerces los extremos: sube solo hasta donde la voz salga fácil.']},
      {tipo:'voz', modo:'rango', semitonos:7, titulo:'Haz una sirena',
       texto:'Desliza la voz hacia arriba y hacia abajo. La barra se llena según cuántas notas recorras.'},
    ]},
    {id:'estrellita-1', nombre:'Estrellita, parte 1', pasos:[
      {tipo:'explica', titulo:'Una canción conocida',
       texto:['Vas a cantar «Estrellita, ¿dónde estás?» por partes. Primero la escuchas y después la cantas nota por nota.',
              'Puedes cantarla con la letra o con «la».'],
       demos:[{etiqueta:'Escuchar la frase', notas:seg(ESTRELLA_A, .5)}]},
      {tipo:'canta', titulo:'«Es-tre-lli-ta»', notas:ESTRELLA_A.slice(0,4)},
      {tipo:'canta', titulo:'«dón-de es-tás»', notas:ESTRELLA_A.slice(4)},
      {tipo:'oido', clase:'direccion', nivel:1, veces:2},
      {tipo:'canta', titulo:'La frase completa', notas:ESTRELLA_A},
    ]},
    {id:'estrellita-2', nombre:'Estrellita, parte 2', pasos:[
      {tipo:'explica', titulo:'La bajada',
       texto:['La segunda frase baja por escalones hasta la nota del principio.',
              'Cuida que la afinación no se caiga al bajar.'],
       demos:[{etiqueta:'Escuchar la frase', notas:seg(ESTRELLA_B, .5)}]},
      {tipo:'canta', titulo:'«me pre-gun-to»', notas:ESTRELLA_B.slice(0,4)},
      {tipo:'canta', titulo:'«qué se-rás»', notas:ESTRELLA_B.slice(4)},
      {tipo:'canta', titulo:'Las dos frases', notas:[...ESTRELLA_A, ...ESTRELLA_B]},
      {tipo:'explica', titulo:'¡Cantaste una canción!',
       texto:['Acabas de cantar tu primera melodía completa, nota por nota.',
              'En <b>Practicar</b> puedes cantarla en modo karaoke, a tempo y con puntuación. Ahí también están los ejercicios de cada unidad para repasar.']},
    ]},
  ]},
];

/* Lista plana en orden, con su unidad. */
E.LECCIONES = [];
E.CURSO.forEach(u => u.lecciones.forEach(l => { l.unidad = u; E.LECCIONES.push(l); }));
})();
