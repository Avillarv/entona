/* python -m http.server muestra el enlace http://0.0.0.0:8000, pero en esa dirección el navegador bloquea
   el micrófono y la captura de la pestaña. Se pasa a localhost, que sí es un contexto seguro. */
if(location.hostname==='0.0.0.0') location.replace(location.href.replace('//0.0.0.0', '//localhost'));
