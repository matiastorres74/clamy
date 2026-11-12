# Spot Navidad 2026

Pieza vertical (1080x1920, 36 s, 30 fps) para Reels, TikTok e historias. El video terminado es `clamy-navidad-2026.mp4`.

## Guion

| Tiempo | Plano | Qué se muestra |
| --- | --- | --- |
| 0 a 5,7 s | Acercamiento a la cabaña nevada hasta la puerta | Título "Esta Navidad, prendé la casa." Jabalina solar RGB, Arbolito de Navidad LED |
| 5,7 a 6,7 s | Se abre la puerta y la luz del interior llena el cuadro | Paso al interior |
| 6,7 a 12 s | Living | Reloj con engranajes que giran, Lámpara de pie 3 luces, Lámpara de pie blanca LED |
| 12 a 18 s | Comedor | Aplique de pared negro LED, Colgante fibras naturales, Lamparita negra con filamento |
| 18 a 23,6 s | Cocina | Barra LED bajo alacena, Set 2 dispensers con bandeja madera, Barral 4 luces negras AR111 |
| 23,6 a 28,8 s | Sube al dormitorio | Espejo LED con luz recargable USB, Velador honguito |
| 28,8 a 32 s | Zoom out: la casa se cierra y queda en el paisaje | |
| 32 a 36 s | Guirnaldas de luces en el cielo, logo de Clamy y datos | Santa Fe 1527, Rosario. WhatsApp 341 540-0815. Envíos a todo el país, mayorista y minorista |

Los 13 productos con tarjeta salen del catálogo publicado (nombre y foto de portada). El árbol verde, el hogar, los muebles y el resto del decorado son ambientación.

Música: "Noche de paz" (Gruber, 1818, dominio público), sintetizada por `render.js`.

## Archivos

- `spot.html`: la pieza. Abierta en un navegador se reproduce con barra de avance.
- `world.js`: dibujo de la cabaña, el paisaje y los productos.
- `spot.js`: cámara, tiempos, tarjetas y cierre.
- `render.js`: genera el MP4.
- `productos/<id>.jpg`: fotos de las tarjetas; el nombre es el id del producto en el catálogo.

## Cambiar productos o textos

Las tarjetas están en la lista `CARDS` de `spot.js`: categoría, nombre, detalle, foto y el punto del dibujo que señalan. El título, los datos de contacto y el saludo final están en `spot.html`.

## Volver a generar el video

Hace falta Node, Playwright con Chromium y ffmpeg.

```bash
node render.js
```

## Pendientes conocidos

- El logo del cierre está redibujado en vector a partir de `public/assets/clamy-logo.jpg` (225 px). Si existe el original vectorial, conviene reemplazarlo en `spot.js`.
- Los 380 px inferiores y los 250 superiores quedan sin texto porque Instagram y TikTok los tapan con su interfaz.
