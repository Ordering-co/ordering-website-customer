# Tabla de px a niveles del tema

La tabla que convierte un px escrito en el nivel del tema que lo sustituye. La aprobó Sergio en la decisión D1 (2026-11-19, **C** para el espacio y **L1** para los tamaños (L1 la sustituyó la maquetación fluida el 2026-11-20), con los empates de control hacia arriba). Quien la aplica no decide nada: busca la propiedad, busca el valor y escribe el helper. En el plan o en el sobre se anota `No design decision: px-map`.

Se aplicó primero en las carpetas del piloto de implementation notes, con antes y después para que Sergio la juzgue antes de que la usen las sesiones S, R y M de la Ola 4.

## Cómo se usa

1. **Mira la propiedad**, no el valor: elige la tabla por la fila de [Qué tabla según la propiedad](#qué-tabla-según-la-propiedad).
2. **Mira el valor absoluto** (sin signo) en esa tabla y toma el nivel de la columna que toque. Un valor negativo conserva su signo: `calc(-1 * ${themeSpace(theme, 'sm')})`. «Hacia arriba» y «hacia abajo» se refieren siempre al valor absoluto: un `margin: -10px` en empate pasa a `-md` (−12), y un `padding` de −10 no existe.
3. **Escribe el helper** de THEMING.md §3 (o la variable `var(--ot-*)` del mismo token en CSS de composición). Nunca el número.
4. Si el valor cae en **fuera de la tabla**, aplica [Lo que la tabla no cubre](#lo-que-la-tabla-no-cubre): no busques el nivel más parecido por tu cuenta.
5. Comprueba a nivel N1 (estilo calculado en 2 temas a 390 y 1440 px). Si el nivel de la tabla rompe la maquetación de forma visible, deja de ser N1: es `TOKEN-GAP(<issue>)` y se lista.

Un literal que ya es un nivel (8 px de `padding`) es el mismo caso con la respuesta trivial: el token de ese valor.

## Qué tabla según la propiedad

| Propiedad | Tabla | En empate |
|---|---|---|
| `padding`, `padding-*`, `padding-inline*`, `padding-block*`, `scroll-padding*` | [Espacio](#espacio) | **hacia abajo** (es el interior de un control o de una caja) |
| `margin`, `margin-*`, `margin-inline*`, `margin-block*`, `gap`, `row-gap`, `column-gap` | [Espacio](#espacio) | **hacia arriba** (separa bloques) |
| `top`, `right`, `bottom`, `left`, `inset*`, el desplazamiento de `translate()` / `transform` | [Espacio](#espacio) | **hacia arriba** (ver [nota de posición](#nota-sobre-la-posición)) |
| `width`, `height`, `min-*`, `max-*`, `flex-basis`, `inline-size`, `block-size` de 14 a 60 px, sea de un icono, de un control o de cualquier otra caja (avatar, miniatura, punto) | [Tamaño](#tamaño-de-14-a-60-px) | **hacia arriba** |
| `width`, `height`, `min-*`, `max-*` de la caja de un logo, miniatura, retrato, ilustración, mapa o banner (la caja que reserva una imagen antes de cargar) | [Medios](#medios-logo-miniatura-retrato-ilustración-mapa-banner) | el nivel más cercano (≤ 6 px) o fluido |
| `width`, `height`, `min-*`, `max-*` de más de 60 px que no es un control ni un medio (contenedor, columna, modal) | [Maquetación fluida](#maquetación-fluida-más-de-60-px) | recetas por tipo de caja |
| `border-width`, `border-*-width`, `outline-width`, y el grosor de un filete o separador | [Borde](#borde) | — |
| `font-size`, `line-height`, `letter-spacing` | no es esta tabla: `themeText` y `typography.*` | — |
| `border-radius` | no es esta tabla: `themeRadius` (solo el nivel exacto; otro valor es `TOKEN-GAP`) | — |
| `box-shadow` | no es esta tabla: `themeShadow` | — |

`font-size` de un `svg` o de un icono es su tamaño: usa la tabla de [Tamaño](#tamaño-de-14-a-60-px).

## Espacio

Niveles (`tokens.space`, valores por defecto): `none` 0 · `xxs` 2 · `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32 · `xxxl` 48. Helper: `themeSpace(theme, '<nivel>')`; en CSS, `var(--ot-space-<nivel>)`.

| px escrito | Situación | `padding` | `margin`, `gap` y posición |
|---|---|---|---|
| 0 | exacto | `none` (o `0`, que no es un valor de diseño) | `none` (o `0`) |
| 1 | fuera | ver [Lo que la tabla no cubre](#lo-que-la-tabla-no-cubre) | ídem |
| 2 | exacto | `xxs` | `xxs` |
| 3 | empate 2 / 4 | `xxs` | `xs` |
| 4, 5 | exacto / más cercano | `xs` | `xs` |
| 6 | empate 4 / 8 | `xs` | `sm` |
| 7, 8, 9 | más cercano / exacto | `sm` | `sm` |
| 10 | empate 8 / 12 | `sm` | `md` |
| 11, 12, 13 | más cercano / exacto | `md` | `md` |
| 14 | empate 12 / 16 | `md` | `lg` |
| 15 a 19 | más cercano / exacto (16) | `lg` | `lg` |
| 20 | empate 16 / 24 | `lg` | `xl` |
| 21 a 27 | más cercano / exacto (24) | `xl` | `xl` |
| 28 | empate 24 / 32 | `xl` | `xxl` |
| 29 a 39 | más cercano / exacto (32) | `xxl` | `xxl` |
| 40 | empate 32 / 48 | `xxl` | `xxxl` |
| 41 a 55 | más cercano / exacto (48) | `xxxl` | `xxxl` |
| 56 o más | fuera | ver [Lo que la tabla no cubre](#lo-que-la-tabla-no-cubre) | ídem |

El corte de 55 px: por encima de 48 no hay otro nivel, así que «el más cercano» sería siempre 48. Se toma como límite el punto medio hasta el siguiente paso que tendría la escala (64): de 49 a 55 queda más cerca de 48; 56 o más ya no es un espacio de la escala. Coincide con los valores que D1 dejó fuera (60, 62, 70, 80, 100, 115).

Valores con decimales: se redondean al entero más cercano antes de buscar (12,5 se busca como 13).

### Nota sobre la posición

D1 dice que la tabla de espacio sirve para la posición, pero no fija el sentido de sus empates. Esta tabla la trata como una separación (hacia arriba): `top: 10px` aleja un elemento del borde de su caja, como un margen. Si Sergio prefiere otro sentido para la posición, se cambia esta fila antes de la Ola 4.

## Tamaño (de 14 a 60 px)

Escala única de iconos y controles: `icon.sm` 16 · `icon.md` 20 · `icon.lg` 24 · `size.sm` 32 · `size.md` 40 · `size.lg` 48 · `size.xl` 56. Helpers: `themeIconSize(theme, 'sm' | 'md' | 'lg')` para los tres primeros y `themeSize(theme, 'sm' | 'md' | 'lg' | 'xl')` para los cuatro últimos; en CSS, `var(--ot-icon-<nivel>)` y `var(--ot-size-<nivel>)`.

Antes de la tabla, la regla del componente: si el control tiene su propio tamaño en el tema (`themeControlHeight(theme, component, size)`, el `icon_size` de su componente), ese manda y esta tabla no se usa.

| px escrito | Situación | Nivel |
|---|---|---|
| 14 a 17 | más cercano / exacto (16) | `icon.sm` |
| 18 | empate 16 / 20 | `icon.md` |
| 19 a 21 | más cercano / exacto (20) | `icon.md` |
| 22 | empate 20 / 24 | `icon.lg` |
| 23 a 27 | más cercano / exacto (24) | `icon.lg` |
| 28 | empate 24 / 32 | `size.sm` |
| 29 a 35 | más cercano / exacto (32) | `size.sm` |
| 36 | empate 32 / 40 | `size.md` |
| 37 a 43 | más cercano / exacto (40) | `size.md` |
| 44 | empate 40 / 48 | `size.lg` (salvo el suelo táctil: ver abajo) |
| 45 a 51 | más cercano / exacto (48) | `size.lg` |
| 52 | empate 48 / 56 | `size.xl` |
| 53 a 60 | más cercano / exacto (56) | `size.xl` |

Menos de 14 px: [Lo que la tabla no cubre](#lo-que-la-tabla-no-cubre), punto 3 (salvo el grosor de un filete, que es [Borde](#borde)). Más de 60 px: [Maquetación fluida](#maquetación-fluida-más-de-60-px).

Los 44 px de un área táctil mínima no son un tamaño de diseño: son el suelo de accesibilidad y se quedan como están, con su excepción registrada o su comentario (`scripts/design/exceptions.json`). Solo cuenta como suelo un `min-width` / `min-height` de 44 px (o el pseudoelemento que agranda el área) en un teléfono o con `pointer: coarse`. Un `width` o `height` de 44 px que da el tamaño visible de la caja es un tamaño normal: empate, `size.lg`.

## Medios (logo, miniatura, retrato, ilustración, mapa, banner)

La caja que una imagen reserva antes de cargar. No es la de un control (`themeSize`) ni la de un icono. Dos casos, y se decide por la caja, no por el valor:

1. **Caja fija de verdad** (el cuadrado de un logo, una miniatura, un retrato, una ilustración): un nivel de `components.media.base` (esquema 1.4.0, aún sin publicar). Helper `themeMedia(theme, '<nivel>')` (px, p. ej. `'70px'`); no hay variable CSS. Una tienda cambia el nivel en su tema y todas las cajas de ese nivel lo siguen.
2. **Caja fluida** (banner, mapa, foto 16:9, galería): no es un nivel. Se escribe `width: 100%` con `aspect-ratio` (y, si hace falta un tope, `max-height` en `dvh` o el nivel `5xl`), ver [Maquetación fluida](#maquetación-fluida-más-de-60-px). Un mapa lleva además un suelo `min-height` de un nivel (lista `4xl`, formulario de dirección `2xl`, información de la tienda `lg`): sin él, un `max-height` en `dvh` lo encoge en una ventana baja (390×650); la página, el formulario o el diálogo se desplaza (implementation notes M4).

Niveles: `3xs` 70 · `2xs` 86 · `xs` 100 · `sm` 110 · `md` 124 · `lg` 140 · `xl` 150 · `2xl` 165 · `3xl` 180 · `4xl` 200 · `5xl` 300. El nivel es el más cercano con un cambio de como mucho 6 px; si no cabe, la caja es fluida.

| px escrito | Nivel | Cambio (px) |
|---|---|---|
| 65 | `3xs` | +5 |
| 69 | `3xs` | +1 |
| 70 | `3xs` | 0 |
| 75 | `3xs` | −5 |
| 80 | `2xs` | +6 |
| 84, 86, 88, 90 | `2xs` | +2, 0, −2, −4 |
| 95 | `xs` | +5 |
| 100 | `xs` | 0 |
| 110 | `sm` | 0 |
| 120 | `md` | +4 |
| 124 | `md` | 0 |
| 140 | `lg` | 0 |
| 150 | `xl` | 0 |
| 160 | `2xl` | +5 |
| 165 | `2xl` | 0 |
| 170 (una caja fija, p. ej. la ilustración de checkout) | `2xl` | −5 |
| 175 | `3xl` | +5 |
| 180 | `3xl` | 0 |
| 200 | `4xl` | 0 |
| 300 | `5xl` | 0 |

Fluidas (sin nivel): los mapas de 135, 170, 175, 200, 250 y 500 px de alto, los banners de 180, las fotos 16:9 de 320×180, 288×162 y 300×168, la galería de 215 de ancho (el ancho sale del alto `lg` con `aspect-ratio: 3 / 2`, 210 px: −5), el logo de 266×150 de arranque (alto `xl` con `aspect-ratio: 266 / 150`) y la región de 350 de alto de una ilustración vacía. El cambio de una caja fluida es el de su contenedor: con el contenedor del defecto, hasta 6 px respecto del valor escrito, y se anota en el sobre.

- Solo la **caja del medio**: un ancho, un alto o un `min-*` que reserva el espacio de la imagen o de su marcador. Un contenedor, una columna, el ancho de un diálogo o una tarjeta de carrusel son [Maquetación fluida](#maquetación-fluida-más-de-60-px), aunque lleven una imagen (70, 100, 140, 200, 250, 300 y 350 aparecen también así).
- Una ilustración a color (la mano con una tarjeta, los monederos) es un archivo de imagen con `<img>` y un nivel de esta escala, no un `<svg>` en el código.

## Maquetación fluida (más de 60 px)

Decisión de Sergio (2026-11-20, sustituye a la L1 de `decisiones-p1.md`): un ancho, alto o desplazamiento de más de 60 px que **no es un control ni un medio** (una columna, el ancho de un diálogo, una tarjeta de carrusel, un tope de lectura, un offset) **no se queda en px**: se escribe con una unidad relativa (`%`, `ch`, `fr`, `vw`, `dvh`/`svh`, `em`/`lh`) o con `min()`, `max()`, `clamp()`, `calc()` de tokens del tema. Ya no se pone `/* layout dimension */` en un valor nuevo; el comentario que exista lo retira quien migra esa caja.

La guarda `literal` acepta esas unidades y esas funciones y sigue rechazando un `px` o un `rem` fijo, también dentro de un `min()` o un `calc()`: `min(100%, 480px)` es un hallazgo, `min(100%, 60ch)` no. Un tope que parece pedir un número fijo se escribe con `ch` (la medida del texto) o con un múltiplo de un token (`calc(8 * ${themeSize(theme, 'xl')})`).

### Recetas por tipo de caja

| Caja | Receta | Antes → después |
|---|---|---|
| Ancho de un diálogo | el `size` del `Dialog` base (`sm` 500, `md` 600, `lg` 700, `xl` 760 px desde 576 px; pantalla completa en teléfono). Si ninguno cabe, `width='min(100%, 60ch)'` | `width: 830px` → `<Dialog size='xl'>`; `460px` → `size='sm'` |
| Tope de lectura (texto, mensaje, columna de formulario) | `max-width: min(100%, Nch)`; 1 ch ≈ 8 px del cuerpo, así `480px` ≈ `60ch` | `max-width: 480px` → `max-width: min(100%, 60ch)` |
| Etiqueta o botón con ancho fijo | `min-width: Nch` o `width: fit-content` con `max-width: min(100%, Nch)` | `width: 140px` → `width: fit-content; max-width: min(100%, 18ch)` |
| Columna junto a un mapa o a un menú lateral | `grid-template-columns: minmax(0, 1fr) minmax(0, 2fr)` (o `fr` a la proporción actual) | `width: 350px` + `calc(100% - 350px)` → `grid-template-columns: minmax(0, 1fr) minmax(0, 2fr)` |
| Rejilla de tarjetas | `grid-template-columns: repeat(auto-fill, minmax(min(100%, Nch), 1fr))` | `repeat(auto-fill, minmax(200px, 1fr))` → `repeat(auto-fill, minmax(min(100%, 24ch), 1fr))` |
| Tarjeta de un carrusel | `flex: 0 0 min(85%, Nch)` o `grid-auto-columns: min(85%, Nch)` | `width: 300px; min-width: 300px` → `flex: 0 0 min(85%, 36ch)` |
| Alto mínimo de una fila o tarjeta | un múltiplo de un tamaño del tema: `min-height: calc(2 * ${themeSize(theme, 'xl')})`; o `lh` si lo marca el texto | `min-height: 70px` → `min-height: calc(1.25 * ${themeSize(theme, 'xl')})` |
| Tope de una lista desplazable | `max-height: Ndvh` (con `vh` de respaldo antes si hace falta) | `max-height: 250px` → `max-height: 40dvh` |
| Alto de un panel o página que llena la pantalla | `min-height: calc(100dvh - var(--header-height, ${getThemeCss(theme, 'header').base.height}))` | `calc(100vh - var(--header-height, 65px))` → con el alto del tema como respaldo |
| Offset de una cabecera o barra pegajosa | la variable medida `--header-height` (con el alto del tema como respaldo) o un token de espacio | `top: 65px` → `top: var(--header-height, ${getThemeCss(theme, 'header').base.height})` |
| Esqueleto de carga | las mismas unidades que el contenido final (`aspect-ratio`, `%`, `dvh`); nunca un alto fijo propio | `height: 500px` → `min-height: 60dvh` |
| Caja de un mapa, banner o foto | `width: 100%` y `aspect-ratio`; un logo o miniatura fija, un nivel de [Medios](#medios-logo-miniatura-retrato-ilustración-mapa-banner) | `height: 250px` → `width: 100%; aspect-ratio: 16 / 9` |

Reglas:
- El cambio de una receta respecto del px escrito (un diálogo de 830 px que pasa a 760) se anota en el sobre, igual que un empate de la tabla; no es una decisión de diseño nueva.
- Un valor relativo que ya funciona (`100%`, `min()`, `clamp()` de tokens) no se toca.
- Si un valor de más de 60 px **es un control** (un botón de 64 px de alto), no es maquetación: es `TOKEN-GAP(<issue>)` con `size.xl` como referencia y se lista; no se cambia el valor.
- Si ninguna receta cabe sin romper la caja, la entrada se queda, con su excepción y la medida, para que Sergio la apruebe una por una.

## Borde

`tokens.border`: `thin` 1 · `thick` 2. Solo valores exactos.

- El borde de una caja: `themeBorderWidth(theme, 'thin' | 'thick', component?)`, que aplica el grosor de la Identity de la tienda.
- Un filete o separador que debe ser una línea (un `border-top` entre filas, un `height: 1px` de un divisor): `themeBorderWidth(theme, 'thin', { fixed: true })`, que conserva el nivel.
- Otro grosor (3 px o más) o una geometría que usa `border` sin ser un grosor (las flechas de los popovers, de 7 y 8 px): no es esta tabla; es una excepción con su motivo o `TOKEN-GAP`.

## Lo que la tabla no cubre

En este orden (es el árbol `TOKEN-GAP` del skill, `references/design-system.md`):

1. **No es un valor de diseño**: se queda el literal con un comentario que diga por qué. Ejemplos: el patrón de solo lectores de pantalla (`width: 1px; height: 1px; margin: -1px`), el suelo táctil de 44 px y el alcance de un área táctil (`inset: -6px 0` que la agranda sin mover la caja), `0`, `100%`. Si es un número del sistema de diseño, se añade a las excepciones registradas con el «sí» de Sergio; hasta entonces queda en la línea base.
2. **Una propiedad del componente** (`themePart`, `themeControlHeight`, el `icon_size` del componente, `--ui-*` de la pieza).
3. **Fuera de la tabla** (1 px de espacio, 56 px o más de espacio, menos de 14 px de tamaño, un control de más de 60 px): el nivel más cercano marcado `TOKEN-GAP(<issue>)` junto al valor y listado en el sobre (qué hacía falta, qué token se usó, qué efecto tiene), o el literal sin tocar y listado si el nivel más cercano cambia lo que se ve. Nunca un nombre de token nuevo ni un cambio de esquema.

## Lo que no cambia esta tabla

- Un valor que la tienda guardó en su tema: la tabla sustituye px escritos en el código, nunca un valor del tema.
- Los valores por defecto del esquema (`product.schema.json`).
- Las líneas base: bajan con `pnpm design:baseline` en un commit aparte, nunca a mano.
