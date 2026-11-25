# Maquetas definitivas (las que llevamos al jurado)

Archivos listos para imprimir tal y como se han impreso para la final. Están pensados para una
**Anycubic Kobra X** (boquilla de 0,4, cama de 260 × 260 mm, hasta 4 filamentos) con el laminador
AnycubicSlicerNext. Los 3MF ya traen el perfil de 0,20 mm Standard y el filamento asignado a cada pieza.

No los genera `npm run print`: los generadores de `print/` siguen sacando en `print/out/` la versión
anterior, la que no tiene rosca.

## Botes (`botes/`)

| Archivo | Filamentos (hueco 1 / 2 / 3) | Tiempo aprox. |
|---|---|---|
| `bote-fuerza.3mf` | Blanco / Rojo | 2 h |
| `bote-ritmo.3mf` | Blanco / Celeste | 2 h |
| `bote-impulso.3mf` | Amarillo / Blanco / Oro | 2 h |
| `bote-pausa.3mf` | Azul marino / Blanco | 1 h 20 min |
| `prueba-rosca.3mf` | Blanco | 15 min |

Qué cambia respecto a `print/out/`:

- **Rosca de verdad.** Antes el tapón entraba a presión en un cuello liso. Ahora el cuello tiene rosca
  macho y el tapón rosca hembra.
  - Medidas: paso de 3 mm, 1 mm de profundidad, flancos a 45° y 0,3 mm de holgura por lado.
  - Es a derechas y llega al tope en unas 2 vueltas.
  - Ya está probada impresa: `prueba-rosca.3mf` es solo el cuello y un tapón, para comprobarla en 15 minutos.
- **Fin del líquido.** El envase va partido a 84 mm: el cuerpo es «el líquido» y el hombro y el cuello
  salen en Blanco. Impulso y Pausa llevan el cuerpo de color (Amarillo y Azul marino), y Fuerza y Ritmo,
  en Blanco.
- **Colores ajustados a los filamentos que hay.** Impulso es naranja en la web, pero no hay filamento
  naranja: va el cuerpo en Amarillo y el tapón en Oro. Ritmo lleva el tapón Celeste para no confundirse
  con Pausa.

Truco para ir más rápido: si el tapón es de otro color, el laminador cambia de filamento en cada capa
de los primeros 12 mm. Imprimir los envases juntos y los tapones aparte ahorra unos 40 minutos por bote.

## Fuerza + Ritmo funcional (`fuerza-ritmo-funcional/`)

El tapón dosificador funciona de verdad: al pulsarlo, el polvo cae dentro del bote. Las piezas,
el montaje y qué hacer si algo falla están en [`LEEME.txt`](fuerza-ritmo-funcional/LEEME.txt), y el
corte en reposo y pulsado, en `como-funciona.png`. Hueco 1 = Blanco, hueco 2 = Menta.

## Etiquetas

`etiquetas-5-impulso-y-1-de-cada.pdf` trae 5 etiquetas de Impulso y una de cada uno de los otros.
Imprímelo al 100 % (sin «ajustar a página») en papel adhesivo o normal.

- Cada etiqueta mide 140,3 × 73,1 mm.
- Ponla con el borde inferior a 7,6 mm de la base y el diseño al frente.
- La franja lisa de 15 mm de la izquierda va debajo y el otro extremo la tapa.

## Cajas de cartulina

- `caja-cartulina-pack-cronos.pdf`: Pack Cronos, un shot de cada momento.
- `caja-cartulina-pack-impulso.pdf`: Pack ×4 de Impulso.

Son dos hojas A4 al 100 % en cartulina de 200–250 g, con las instrucciones de montaje en la hoja 2.
La diferencia con las de `print/out/` es la trasera: mide 145 mm en vez de 105. Así el logo de
Tempo queda por encima de los tapones y se ve con los botes puestos. Además, las caras que se ven
no llevan rótulos de montaje.
