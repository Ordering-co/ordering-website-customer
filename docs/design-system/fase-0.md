# Sistema de diseño de la web: fase 0

Propuesta para que Sergio elija el **puente de tokens** y la **superficie piloto** antes de la fase 1. Nada de esto cambia pantallas existentes ni `product.schema.json`: el spike vive en `src/ui/src/design-system/` y en una página aparte que no entra en el build de producción.

Lo medido, resumido aquí para que no dependa de archivos de una sesión: 132 aserciones de CSS calculado sobre los tres temas del spike, 0 fallos; el build de producción sale idéntico con y sin el spike (222 assets, entry de 279,7 kB gzip); con Button, Icon y el CSS en el entry sube +11,8 kB gzip de JS (A) o +12,0 kB (B) y +1,0 / +1,1 kB de CSS (§1.6). El inventario completo con archivo:línea, las capturas de los tres temas (opciones A y B, escritorio y móvil) y las aserciones son evidencia adjunta al issue implementation notes o a su PR, no parte de este árbol.

El spike ya no está en el árbol: se retiró en la fase 1. Las piezas se ven en `design-system-preview.html` (`pnpm dev`, un tema cada vez, `?theme=defaults|grill|cafe|grocery|typefaces`).

## 1. Lo que hay que saber antes de elegir

### 1.1 Qué es de verdad «el sistema del dashboard»

En la rama `dashboard-redesign-skill-fb8742f2` el dashboard **no** está montado sobre utilidades de Tailwind:

- Sus piezas de `Shared/UI/` (`Button.jsx`, `Dialog.jsx`, `Input.jsx`…) son **primitivas de Base UI con la API de shadcn, estilizadas con styled-components y variables `--od-*`** (`Shared/UI/Button.jsx:1-12`).
- Tailwind 4 solo compila una hoja piloto, `styles/OrderingUi/tailwind.css`, con `prefix(mia)`, sin preflight y con `source(none)`, y `vite.config.js:16-28` filtra el plugin para que no toque nada más. Su único componente Tailwind no tiene consumidores (`docs/BRAND.md`).
- Sus tokens son fijos de la marca Ordering.co; solo el color de acción admite un valor por tenant.

Lo reutilizable es el patrón: `cva` + `cn` (clsx + tailwind-merge), Base UI para el comportamiento, el `@theme inline` que apunta nombres semánticos a variables, la convivencia sin preflight y con prefijo, y Lucide. **Los tokens que salen del tema de cada tienda son trabajo nuevo de la web.**

`docs/theme-v2/styled-components-analisis.md` recomendaba quedarse en styled-components; la decisión de Sergio del 2026-11-18 lo sustituye y el piloto convive con él.

### 1.2 Qué personaliza cada tienda y con qué precedencia

La precedencia de lo que personaliza cada tienda, de menor a mayor, está en una sola lista: [`references/theming.md` del skill](../../.claude/skills/ordering-website-design/references/theming.md#what-a-store-configures-and-who-wins). Además: visibilidad (`themeVisible`), páginas (`themePages`) y `modes.dark`, que el motor conserva pero la web no lee.

**Cambio de tema en caliente:** hoy no existe. Nadie llama a `refreshTheme`, no hay `postMessage` de preview y cambiar el tema exige recargar. El puente se diseñó igual para soportarlo (las dos opciones lo hacen) por si llega un preview del editor.

### 1.3 Tokens semánticos del dashboard → tema

| Nombre del dashboard / shadcn | Token del tema | Helper | Nota |
|---|---|---|---|
| `primary` / `primary-foreground` | `color.primary` / `color.on_primary` | `themeColor`, `onPrimary` | Igual |
| `action-foreground` (texto de enlace) | `color.primary_text` | `primaryText` | AA sobre `background`, `surface`, `primary_subtle`; no sobre `surface_alt` |
| hover del primario | `color.primary_pressed` | `themeColor` | Aproximado: el hover real es de `components.button` |
| `background` (en el dashboard es la superficie de controles) | `color.surface` | `themeColor` | En la web `background` es solo el lienzo: no mezclarlos |
| `foreground` | `color.text` | `themeColor` | Igual |
| `secondary` | `color.surface_alt` o `color.secondary` | `themeColor` | Ambiguo: en la web `secondary` es un color de marca editable |
| `muted` / `muted-foreground` | `color.surface_alt` / `color.text_muted` | `themeColor` | Igual |
| `border` / `input` | `color.border` / `color.border_strong` | `themeColor` | `input` diverge: los controles usan `border_strong` |
| `ring` | `focus_ring` (color, ancho, offset) | `focusRingCss` | Es un `outline` de tres piezas; el foco global de la app ya lo pinta con `!important` |
| `destructive` (+ `/10`, foreground) | `color.danger`, `danger_subtle`, `danger_text`, `on_danger` | `themeColor` | Usar los derivados del esquema, no `color-mix` |
| `card`, `popover` | `color.surface` + `color.text` | `themeColor` | Todo lo que flota es `surface` |
| `accent` | `color.primary_subtle` + `color.primary_text` | `themeColor` | Aproximado (estado seleccionado) |
| `radius-*` | `radius.*` con Identity | `themeRadius` | Nunca el token crudo; un componente puede fijar su `base.radius` |
| `shadow-*` | `shadow.*` con Identity | `themeShadow` | Estados con `fixed` |
| `border` (1px) | `border.thin/thick` + `border_style.width` | `themeBorderWidth` | El default del tema es **sin** borde en cajas |
| alturas, iconos, texto | `size.*`, `icon.*`, `typography.*`, `components.button.sizes.*` | `themeControlHeight`, `themeIconSize`, `themeText` | En el dashboard son literales |
| espaciado | `space.none…xxxl` (no múltiplos de 4) | `themeSpace` | Escala con nombre, no `--spacing` base |
| `disabled:opacity-50` | `opacity.disabled` | `themeOpacity` | |
| `transition-*` | `motion.*`, `motion_style` | `motionCss` | Respeta reduced motion; falta un helper de los tokens de motion |
| `dark:*`, `chart-*`, `sidebar-*` | — | — | Sin equivalente |

**Brecha:** el tema no solo personaliza tokens, también ≈55 `components.*` con sus ejes y `scope`. Los nombres semánticos cubren el nivel «token»; el nivel «componente» (la altura del botón de un tamaño, el radio propio del modal, sus overrides móviles) lo tienen que leer las piezas base con los helpers.

### 1.4 Iconos: `iconRegistry.js` → Lucide

- El registro tiene **172 nombres**, todos de react-icons (Ai, Bs, Bi, Fa, Md, Fi, Hi, Ri, Io5, Vsc, Cg, Go, Gr). `@meronex/icons` no está instalado: el `CLAUDE.md` está desactualizado en eso.
- **0 imports directos** de react-icons fuera del registro: el cambio se concentra en `iconRegistry.js` e `Icon/index.js` (320 usos de `<Icon`).
- **160 tienen equivalente en Lucide** (tabla completa en el inventario, §3.1; nombres comprobados en `lucide-react` 1.72.0 y una muestra de 50 en la 1.75.0 instalada).
- **Sin equivalente (12, marcas):** `apple`, `facebook`, `google`, `instagram`, `paypal`, `pinterest`, `snapchat`, `stripe`, `stripeCard`, `stripeS`, `tiktok`, `whatsapp`. Propuesta: SVG propios en `Icon/brands/`, para poder quitar react-icons.
- A decidir con diseño: los iconos de relleno (`*Filled`, `*Fill`, `cart`, `user`, `truckDelivery`) pasan a trazo; el corazón de favorito y la estrella de rating necesitan `fill="currentColor"`. Aproximados: `cardChecklist`, `caretLeftFill`/`caretUpFill`, `circleHalf`, `menuAltRight`, `searchLoading`, `pinMapFill`.
- Lucide no tiene `title`; `Icon` lo reenvía hoy, sin usos detectados. El chevron de `src/ui/src/styles/Chevron` es un SVG de Bootstrap en `data:` URI que habrá que redibujar.

### 1.5 Convivencia de Tailwind 4 con styled-components 5.3.3 (medido en el spike)

- **Sin preflight y con prefijo `ui:`**, `source(none)` y un `@source` explícito; el plugin de Vite solo transforma `design-system/bridge/*/theme.css`. `src/index.css` y las hojas de terceros no pasan por él. Resultado medido: el build de producción sale idéntico (mismos 222 assets, mismo entry de 279,7 kB gzip y misma hoja CSS) y nada del sistema de diseño entra en `dist/`.
- **`@theme inline` es obligatorio**: sin `inline`, Tailwind fija el valor en `:root` y se rompen el cambio de tema y los portales.
- Se anulan los defaults de Tailwind (`--color-*: initial`, radios, sombras, fuentes, tipografía): no se cuela su paleta ni `p-4`.
- **Las utilidades en `@layer` pierden contra cualquier regla fuera de capa**, aunque tenga menos especificidad. Todo el CSS de la app está fuera de capas. Consecuencias: las piezas nuevas no se pueden restilizar con `styled(...)`, el foco global `!important` de la app sigue mandando (bien), y una regla descendiente legada de un contenedor puede alterar una pieza nueva.
- **tailwind-merge** necesita `extendTailwindMerge` con los nombres del tema: sin eso borró `text-button` (tamaño) al ver `text-primary-foreground` (color) y el botón salió a 13,33px.
- Los tests de jsdom no compilan Tailwind (`css: false`): las piezas nuevas se prueban por clases y atributos en vitest y por CSS calculado en Playwright.

### 1.6 Riesgos

| Riesgo | Qué pasa | Mitigación propuesta |
|---|---|---|
| Portales (`#app-modals`, `DatePicker`, `BottomSheet`, Base UI) | Variables en un wrapper no llegan | Variables globales en `:root` (medido: el botón del portal pinta el tema) |
| `scope` dentro de un portal | `:root` tiene un valor por nombre; un modal abierto dentro de un grupo vería el valor global | Las piezas base leen los valores de componente con los helpers (el contexto de React sí cruza portales) y los escriben como variables en su propio elemento |
| Primer pintado | Las variables las escribe React; no hay SSR (el worker solo reescribe `index.html`) | Escribirlas en el mismo `ThemeProvider` del boot (`src/index.js`), que ya tiene el tema de `first_load`; opcional: que el worker inyecte un `<style>:root{…}` |
| Tema en caliente | Hoy no existe | Ambas opciones lo soportan (medido 1→2→3→1 sin recarga) |
| Bundle | Con Button, Icon y el CSS en el entry: **+11,8 kB gzip de JS (A) / +12,0 kB (B)** y +1,0 / +1,1 kB de CSS, casi todo `tailwind-merge`. Entry actual medido: 279,7 kB gzip | Aceptable para la base; Base UI solo en piezas diferidas (`loadable`) |
| Navegadores | Tailwind 4 usa `@layer`, `@property` y `color-mix` (Safari 16.4+, Chrome 111+, Firefox 128+, según su documentación; no medido) y el `browserslist` de la web es `>0.2%, not dead` | Decidirlo en fase 1 con datos de tráfico; el puente no usa `color-mix` |
| Kiosk | Solo cambia flujos (`use_kiosk`), no estilos | Piezas sin depender de hover y con área táctil de `size.*` |
| Corte móvil | El tema corta en 576px; el `sm` de Tailwind es 640px | Definir `--breakpoint-*` propios con el corte del tema |
| Identity parte tokens en dos | El borde de caja y el borde fijo de control son valores distintos | Nombre extra en el catálogo (`--ot-border-fixed-thin`), ya probado en B |

## 2. Puente de tokens

Las dos opciones del spike comparten: un componente `ThemeCssVariables` que escribe variables en `:root` desde el tema con los helpers (Identity incluida), Tailwind sin preflight con prefijo `ui:`, `@theme inline` y el mismo `Button` (cva: solid, outline, ghost; sm, md, lg) con un `Icon` de Lucide dimensionado por `icon.*`. Código en `src/ui/src/design-system/bridge/option-a/` y `option-b/`.

### Opción A: nombres del dashboard, mapeo a mano

`variables.js` escribe `--primary`, `--primary-foreground`, `--muted-foreground`, `--radius-md`… y `theme.css` los mapea en `@theme inline` (`--color-primary: var(--primary)`).

- ✅ Nombres de tipo shadcn: el código de shadcn se copia casi tal cual (`bg-primary text-primary-foreground`).
- ⚠️ El spike no se alineó del todo con la hoja real del dashboard: añade `accent`, `muted-foreground` y `primary-hover`, que el dashboard no tiene, y su `--background` es el lienzo, cuando el `background` del dashboard es la superficie (`color.surface`, tabla 1.3). En la fase 1 habría que alinearlo.
- ✅ Superficie pequeña y fácil de leer; puede leer valores de componente (la altura sale de `themeControlHeight(button)` y responde a `scopedTheme`, comprobado).
- ❌ Mapeo manual: ≈64 líneas en tres archivos (variables, `@theme`, tailwind-merge) para solo 11 colores, 4 radios y lo que pide el Button. Cada token nuevo toca dos o tres archivos.
- ❌ Las equivalencias son decisiones a mano (`accent` = `primary_subtle`, `background` = ¿`surface` o lienzo?), y ahí es donde se pierde el theming sin que nada lo detecte.
- ⚠️ Riesgo para el theming: medio. Un token del tema que nadie mapeó no existe para Tailwind y se tiende a poner un literal.

### Opción B: catálogo generado del esquema

`scripts/theme-tailwind-catalog.mjs` (`pnpm theme:catalog`, con `--check`) lee `src/theme.compiled.json` y genera `catalog.generated.css` con **100 variables** de Tailwind con los nombres del tema (`--color-on-primary`, `--color-surface-alt`, `--spacing-md`, `--radius-lg`), cada una `var(--ot-…, <default del esquema>)`. `variables.js` llena las `--ot-*` en runtime con los helpers.

- ✅ Cero mapeo manual de valores; un token nuevo del esquema aparece al regenerar. Hoy solo un test de vitest detecta un catálogo viejo: en la fase 1 el `--check` tiene que entrar en CI.
- ✅ Los nombres son el vocabulario del tema y de `docs/THEMING.md` (`p-md`, `rounded-lg`, `bg-surface-alt`): la guarda de la fase 3 y el skill hablan el mismo idioma.
- ✅ El default del esquema viaja como respaldo del `var()`: sin variables escritas, se pinta el tema por defecto, no nada.
- ✅ Los nombres para tailwind-merge salen del mismo catálogo; un test comprueba que los defaults generados coinciden con los que escribe el runtime.
- ❌ Los nombres no son los del dashboard (`text-on-primary` en vez de `text-primary-foreground`) y algunos quedan feos (`text-text-muted`).
- ❌ Choque de nombres entre el rol de fuente `body` y la tipografía `body` (`font-body` solo da la familia).
- ❌ Solo cubre tokens: los valores de componente (`components.button.sizes`, `scope`) los siguen leyendo las piezas con los helpers.
- ⚠️ Riesgo para el theming: bajo en tokens (lo que existe en el esquema existe en Tailwind, con su default); el de los valores de componente es el mismo que en A (ver abajo).

### Brecha común: ninguna opción lee aún `components.button`

El Button del spike no usa los valores del componente del tema: el radio llama a `themeRadius(theme, 'md')` sin el componente (ignora `button.base.radius`), el padding usa `space.*` en vez de `sizes.*.padding_x`, el icono `tokens.icon` en vez de `sizes.*.icon_size`, y en B la altura sale de `tokens.size` y no de `button.sizes.*.height` (en A sí, con `themeControlHeight`). Con los defaults coinciden; un tema que cambie su botón no se vería. El Button actual (`src/ui/src/styles/Buttons/index.js`) sí los lee. En la fase 1 las piezas base deben leer su componente con los helpers (`themeRadius(theme, level, 'button')`, `themeControlHeight`, `getThemeComponent`) y escribirlo como variables propias, sea cual sea la opción.

### Recomendación: B, con una capa de alias con los nombres del dashboard

La decisión de Sergio pide los nombres semánticos del dashboard, y B por sí sola no los da. Propongo B más una tabla corta de alias (unas 12-15 entradas, las del `tailwind.css` del dashboard: `primary-foreground` → `on_primary`, `action-foreground` → `primary_text`, `background` → `surface`, `foreground` → `text`, `muted` → `surface_alt`, `input` → `border_strong`, `destructive` → `danger`…) de la que el mismo generador emite las variables. Ojo: el alias tiene que apuntar a la variable de runtime con su default (`--color-primary-foreground: var(--ot-color-on-primary, <default>)`); apuntar a otra variable de Tailwind (`var(--color-on-primary)`) no funciona con `inline` y prefijo: lo comprobó la revisión compilando la utilidad. La capa de alias **no está en el spike**; es lo primero que hay que probar en la fase 1. La tabla de alias sí es una decisión a mano, pero solo de nombres (una vez y con test), no de valores. Así:

- el catálogo completo sale del esquema y no se pierde ningún token;
- el código copiado de shadcn o del dashboard funciona con sus nombres;
- los valores de componente y `scope` los escriben las piezas base como variables propias (`--ui-button-height`), leídos con los helpers, lo que también cubre los portales dentro de un grupo.

Si Sergio prefiere la simplicidad de A, también es viable, pero obliga a ampliar el mapeo a mano en cada pieza nueva.

## 3. Superficie piloto

### Opción P1: menú de compartir e iconos del selector Delivery / Pickup / ASAP

- ✅ Pequeña y acotada: prueba `Icon` (Lucide), un botón de icono, un menú emergente y los SVG de marca (Facebook, WhatsApp, X: el caso sin equivalente en Lucide).
- ✅ Toca dos contextos de tema reales: el modal de producto (portal `#app-modals`, `scope` `product_modal`) y el header (`scope` `header`).
- ✅ Arregla un defecto visible cuya causa es justo la mezcla de librerías de iconos.
- ❌ No prueba Dialog/Sheet ni Input.
- ❌ Los iconos de redes los pinta AddToAny con su propio CSS: hay que decidir si se estiliza el kit o se pintan iconos propios.
- ❌ El selector está en el header, que rediseña implementation noteshay que coordinarse.
- ⚠️ Riesgo para el theming: bajo; el radio de cuánto se puede romper es pequeño.

### Opción P2: modal de detalles de producto

- ✅ Máximo valor: prueba Dialog/Sheet, Button, stepper, opciones (`choice`), comentario (Input), barra fija y efectos.
- ✅ Ejercita a fondo `scope` (`product_modal`, `product_option`), portales, motion y `mobile_web`.
- ❌ Grande y con su propia puerta de diseño (2 opciones con mockups): el piloto quedaría detrás de otra decisión.
- ❌ Choca con implementation notes (Modal y overlay compartidos), implementation notes (pulso de obligatoria) y implementation notes (share sobre la imagen), y con lo ya arreglado en implementation notes, 1223, 1231 y 1232.
- ⚠️ Riesgo para el theming: alto; toca el flujo de añadir al carrito.

### Recomendación: P1

Valida el puente, Lucide y la política de iconos de marca con poco riesgo y en dos contextos de `scope` reales. El modal de producto (P2) pasa a ser la primera superficie grande de la etapa de rediseño, ya con la base y el piloto aprobados.

## 4. Decisiones que se proponen para la fase 1 (rutinarias, salvo que Sergio diga otra cosa)

- Carpeta de las piezas base: `src/ui/src/design-system/` (`components/`, `lib/cn.js`, `bridge/`), junto a `src/ui/src/styles/`.
- Prefijo de Tailwind `ui:`, sin preflight, `source(none)` y el plugin de Vite filtrado.
- Variables globales en `:root`, escritas desde el `ThemeProvider` del boot y de `App.js`.
- Base UI (`@base-ui/react` 1.8.0, como el dashboard) para Dialog, Sheet y Popover; el Button puede seguir siendo un `<button>` nativo con cva.
- Iconos de marca como SVG propios en `Icon/brands/` solo donde los pinta la web (botones de acceso, medios de pago), para poder retirar react-icons al final de la migración; donde los pinta un kit de terceros (el menú de compartir con AddToAny) quedan los del kit.
- En la fase 1 se retira la opción descartada del spike y la página `design-system-spike.html`.
- En el vocabulario de Tailwind mandan los nombres de shadcn: `bg-background` es la superficie de los controles (`color.surface`) y `bg-secondary` el relleno neutro (`color.surface_alt`). Los colores de la web que se llaman igual no cambian de variable ni de valor (`--ot-color-background`, `--ot-color-secondary`…) y se exponen con nombre propio: el lienzo es `canvas` (`color.background`) y la familia de marca es `brand-secondary`, `on-brand-secondary`, `brand-secondary-subtle` y `brand-secondary-pressed` (`color.secondary*`). Así ningún par mezcla dos colores (no existe `on-secondary` junto a `secondary`). El generador (`scripts/theme-css-catalog.mjs`, nombres en `tokens/aliases.mjs`, `BRAND_COLORS`) falla si un nombre de Tailwind lo reclaman dos tokens distintos, y un test comprueba los pares (`on-X` con `X`, cada `-foreground` con su pareja).
- Los ocho alias de shadcn que el dashboard no tiene (`muted-foreground`, `destructive-foreground`, `card`, `popover`, `accent` y sus foreground) están marcados como «shadcn» en `tokens/aliases.mjs`.

## 5. Qué no se comprobó

- Estados hover, pressed y foco por teclado de las piezas del spike (solo reposo y disabled).
- `components.button` como fuente de la altura en B (A sí la lee) y un `scope` real con botón: en el esquema actual solo existe `category_tabs.tabs`.
- El soporte de navegadores de Tailwind 4 frente al tráfico real.
- El aspecto de cada icono Lucide frente al actual, ni la existencia de todos en la 1.75.0 instalada (todos en 1.72.0; una muestra de 50 en 1.75.0).
- Los tokens de motion se leen directo de `theme.css` (no hay helper) y el spike no respeta `motion_style.enabled`.
- Quedan literales de diseño en el spike que la fase 1 debe quitar: `strokeWidth={1.75}` en `Icon.jsx`, `active:translate-y-px` y `ease-out` en los `vocab.js`, y la conversión `${…}px` de la altura en A (falta un helper que la devuelva como CSS).
- Tests: solo 6, de variables y catálogo; `Button`, `Icon` y el ajuste de tailwind-merge no tienen test todavía.
- `@tailwindcss/vite` quedó en `dependencies`; en la fase 1 va a `devDependencies` con el resto de Vite.

## Pendientes del piloto (implementation notes, implementation notes)

### Estilo del texto del pin de dirección del header: decisión de diseño pendiente de Sergio

Hoy el texto de la dirección del header (`AddressMenu`, `Header/styles.js`) es de 16 px y peso 600, mientras el resto de la cápsula (pestañas, ASAP, botones de la barra móvil) usa el texto de las pestañas (`components.tabs`: 14 px, peso 400). El pin y el reloj ya miden lo mismo; el texto no.

| Opción | Qué cambia | Contra |
|---|---|---|
| 1. Igualar al texto de la cápsula | La dirección toma el texto de las pestañas (14 px / 400): toda la fila se lee igual. Sigue en el color de texto (no atenuado), que ya la distingue. | La dirección pierde énfasis frente a Delivery / Pickup. |
| 2. Mantener el énfasis | Se queda en 16 px / 600: es el dato que el cliente completa y el que más le importa. | La fila mezcla dos escalas de texto y la dirección queda más grande que la pestaña activa. |

Recomendación: opción 1. Es la que cierra la coherencia que busca el piloto (una fila, un texto), y la dirección ya se distingue por su color pleno frente al de las pestañas inactivas y ASAP. Un «sí» la aplica en `AddressMenu`, con el helper `capsuleText`.

### Menú de compartir: opción A como posible mejora aparte

Sergio aprobó la opción B (los botones de AddToAny cuadrados a la caja del botón de icono, con sus colores de marca), que es la que está implementada. La opción A queda como mejora aparte, sin comprometerla: un `Button` del tema por red, con la marca en un solo color (el del tema), que abre la URL de compartir de cada red, y AddToAny solo para el «+». Ganaría que los botones sigan el tema sin CSS ajeno y quitar el kit del primer render; costaría mantener las URLs de compartir de cada red y perder las redes que AddToAny añade. Mockup en `design-system-preview.html` (`share-option-a`).

### Decisión pendiente: tamaño del chevron de Lucide

El `ChevronIcon` ya usa el glifo de Lucide (`ChevronDown`, también en la máscara de `listChevronMaskCss`). A igual `icon_size`, el glifo de Lucide ocupa cerca del 58 % del ancho de su caja, frente al 80 % del de Bootstrap. También tiene la mitad de alto relativo y un trazo más grueso. Se ve más pequeño y más pesado en unas 20 pantallas: acordeones, selects, ASAP y desplegables.

| Opción | Qué cambia | Ventaja | Desventaja |
|---|---|---|---|
| A. Compensar el tamaño | Escalar el glifo dentro de su caja (una proporción fija del `icon_size`, registrada como excepción) para igualar el tamaño visual anterior | Ninguna pantalla cambia de aspecto salvo el trazo | Un factor propio que mantener; el chevron no mide lo mismo que los demás iconos Lucide |
| B. Aceptar el glifo nuevo | Nada | Coherente con el resto de iconos Lucide y sin excepción | El chevron se ve más pequeño y grueso que antes en ~20 pantallas |

Recomendación: B, porque el sistema de iconos es uno solo. Si en alguna pantalla queda pequeño, se ajusta su `icon_size` desde el tema, no en el código.
