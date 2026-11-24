# Guardas de diseño, líneas base y tamaño del entry

Cómo se imponen las reglas de `THEMING.md` §7 y del skill `ordering-website-design`, y qué compara cada comprobación. Todas corren en el paso «Design guards» y «Entry size» de `.github/workflows/ci.yml`.

| Comando | Qué comprueba |
| --- | --- |
| `pnpm design:test` | Las pruebas de las guardas, del ratchet y de la auditoría (`tests/design/`, repos git temporales incluidos). |
| `pnpm design:check` | Cuatro guardas (`literal`, `icon`, `pieces`, `ui-scope`) contra su línea base por archivo y regla (`scripts/design/baselines/*.json`). Un archivo nuevo no puede tener hallazgos; un recuento por encima o por debajo de la realidad falla. `pnpm design:baseline` solo baja. |
| `pnpm design:coherence --check` | El total por guarda (propio + compartido + sin ruta) contra la suma de las líneas base de `literal`, `icon` y `pieces`: la coherencia no tiene un archivo de línea base propio (era una sola línea que toda sesión bajaba y que chocaba en cada merge en paralelo). El veredicto de cada ruta es informativo: la deuda propia de una ruta cambia cuando un archivo pasa de compartido a propio sin que el código empeore, así que no bloquea. |
| `pnpm design:ratchet [--base <ref>]` | Las líneas base del árbol contra las del `git merge-base HEAD <ref>` (por defecto `origin/main`): ningún total de regla sube, ninguna excepción nueva sin razón (ni con más ocurrencias, `count`) sin nota, el entry no sube. Un archivo que no existe en la base se acepta como nuevo, y también una regla nueva cuyo nombre no está en la guarda de la base (se siembra una vez con `node scripts/design/guard.mjs <guarda> --update-baseline --seed-rule <regla>` y el ratchet la anota). Necesita historia completa: el checkout de CI usa `fetch-depth: 0`; sin la base el script la descarga o falla diciendo qué falta. |
| `tests/design/ui-none.test.mjs` (en `pnpm design:test`) | Ninguna pieza escribe una clase `ui:*-none` que Tailwind define con otro sentido y esta hoja manda a la escala de espaciado (`ui:max-w-none` es `max-width: 0`, `ui:leading-none` es `line-height: 0`). Compila cada clase con la hoja del sistema y con el tema propio de Tailwind; `ui:m-none` o `ui:gap-none` pasan (Tailwind no tiene `-none` ahí). Los comentarios no cuentan. |
| `pnpm test:design:browser` | Las piezas base contra el CSS global de la app en Chromium (`e2e/design/`). |
| `pnpm build && pnpm size:entry` | El gzip del chunk JS de entrada y de las hojas CSS locales enlazadas en `index.html` contra `scripts/entry-size.baseline.json`. |

Por qué `design:ratchet`: `design:check` demuestra que la línea base es igual al código, no que nadie la subió a mano junto con el código que la justifica. El ratchet compara con `main`, donde ese número lo fijó otra persona. Un recuento que sube solo se acepta cambiando la regla, no el número. Dos salidas explícitas: una excepción nueva con razón pasa y se imprime (necesita la aprobación de Sergio en el PR), y `--allow-entry-growth` en el paso de CI acepta un entry mayor cuando el PR lo explica.

**Hasta el merge a `main`, la base es la rama de integración.** `origin/main` no tiene líneas base, así que con la base por defecto el ratchet acepta todo como nuevo y una línea base subida a mano pasa las tres puertas. Mientras la etapa viva en una rama de integración, compara contra ella: el coordinador, con el merge en `--no-commit`, corre `pnpm design:ratchet --base HEAD` (el árbol fusionado contra la punta de integración), y cada sesión, antes de entregar, `pnpm design:ratchet --base <rama-de-integración>`. El paso de CI sigue contra `origin/main` y es la red del merge final.

## Qué ve cada guarda, y qué no

- **`pieces`** cuenta por símbolo importado (con alias o sin él). Cuenta cada primitiva legada de `src/ui/src/styles/` que ya tiene pieza, con una regla por pieza: `legacy-buttons`, `legacy-inputs`, `legacy-textarea` (el `TextArea` de `styles/Inputs`), `legacy-select` (`styles/Select` y `styles/Selects`), `legacy-tabs`, `legacy-chip`, `legacy-avatar`, `legacy-choice`, `legacy-checkbox` y `legacy-favorite` (`styles/FavoriteButton`), además de `legacy-overlay` (`Modal`, `BottomSheet`). Una primitiva que importa otra de su misma familia (`styles/Select` lee `styles/Selects`) no cuenta: no es una pantalla. Un control sin pieza base (switch, stepper, slider, accordion, tooltip, toast, calendar) se construye con su primitiva legada, nunca con un `<button>` nativo, y no cuenta; si no existe primitiva, se pide la pieza con duda. Ese hueco es un **migration gap** (falta una pieza), no un `TOKEN-GAP` (falta un token).
  - **Cambio de regla del 2026-11-19 (R2-03).** Hasta aquí la guarda solo conocía las 4 piezas de la Ola 1, y `TextArea` seguía en la lista de «sin pieza» aunque `Textarea` existe desde `d5a3ae97`. Las 8 reglas nuevas se sembraron con `node scripts/design/guard.mjs pieces --update-baseline --seed-rule legacy-select --seed-rule legacy-tabs --seed-rule legacy-chip --seed-rule legacy-avatar --seed-rule legacy-choice --seed-rule legacy-checkbox --seed-rule legacy-favorite --seed-rule legacy-textarea` (`--seed-rule` se repite: las reglas de un mismo cambio se siembran juntas). La línea base de `pieces` sube de 275 a 459 hallazgos por la regla nueva, no por código nuevo: `legacy-choice` 62, `legacy-select` 40, `legacy-tabs` 36, `legacy-chip` 18, `legacy-avatar` 13, `legacy-favorite` 6, `legacy-checkbox` 5, `legacy-textarea` 4; las reglas que ya existían no cambian. `design:ratchet` lo acepta como regla nueva y lo anota («NEW rule … seeded»). Reglas sin línea base (hoy 0 casos): `base-ui-direct` (`@base-ui/react` fuera de `design-system/components`) y `piece-selector` (`[data-slot` o `--ui-*` dentro de un estilo, o `style={{ '--ui-…': … }}`, fuera de `design-system/`; leer la variable con `componentVars` no cuenta). **Cambio de regla del 2026-11-20.** Regla nueva `piece-override`: un archivo de estilos de un componente que renderiza una pieza base (él o un archivo de su carpeta importa una pieza con control: Button, Input, Choice, Select, Tabs, Chip…) y tiene una regla cuyo sujeto es el elemento de la pieza (`button`, `input`/`textarea` si renderiza una pieza de campo, `select`, `[role=tab|radio|checkbox|switch|combobox|option|menuitem…]`, con cualquier combinador y pseudo: `> button`, `&&&& > button:focus-visible`, `button:first-child`) y fija su presentación (color, fondo, borde, radio, sombra, padding, tipografía, tamaño —`width`, `min-/max-width`, `height`—, `gap`, anillo de foco, o una interpolación entera que es un mixin). Colocar la pieza (margin, flex/grid, position, display, z-index) y la maquetación del propio contenedor no cuentan. Se resuelve el anidado y el `&` de styled-components, y se lee el CSS de una plantilla simple dentro de una interpolación (`${cond && `button { … }`}`; `scan.mjs`: antes solo contaba la etiquetada con `css`). Se sembró con `--seed-rule piece-override`; la corrección de cada hallazgo bajó la línea base hasta 0 y hoy bloquea. **Límite:** un selector que nombra la pieza por referencia (`${Button} { … }`) o dentro de `:is()` no se ve, ni una pieza renderizada en una carpeta distinta de la de los estilos.
- **`icon`**, regla `entry-full-icon` (sin línea base: 0 casos): recorre el grafo de imports estáticos desde `src/index.js` (`import`, `export … from` e imports de efecto; los `import()` dinámicos son otro chunk y no se siguen) y falla si alcanza `design-system/components/Icon.jsx` o `components/Icon/lucideRegistry.js`, el registro completo de Lucide. El entry dibuja sus iconos con `createIcon` y un mapa de glifos (`confirmGlyphs.js`, `headerGlyphs.js`). El hallazgo cae en `src/index.js` con la cadena de imports. Sin build: es una lectura del código, no una medición; el tamaño lo sigue midiendo `size:entry`. **Límite:** un import construido en tiempo de ejecución o un alias que no sea de `vite.config.js` no se ve. Origen: R2-01 (`c43a2f86` metió el registro en el entry por un icono de `Confirm`).
- **`literal`**: cuenta hex, `rgb()`/`hsl()`, `px`, `rem`, duraciones, familias, colores calculados y la regla `named-color` (lista cerrada: `white`, `black`, `red`, `green`, `blue`, `gray`, `grey`, `orange`, `yellow` tras `color`, `background`, `border*`, `outline*`, `fill`, `stroke`, en CSS o como clave JS). Una cadena que es solo un literal cuenta solo si es el valor de `style=` o de una propiedad con nombre de estilo (`width`, `padding`, `closeIconColor`…): `aria-label='3s'` o `data-id='#abc'` no. Una excepción registrada exime sus primeras `count` ocurrencias (por defecto 1) del valor en ese archivo; la `n+1` es un hallazgo.
- **Falsos negativos conocidos** (el recuento es un mínimo): `${…}px` con la unidad fuera; un nombre de color dentro de una interpolación (`${a ? 'black' : 'white'}`) o como prop de un componente (`color='red'`); `em`; números sin unidad (`opacity`, `font-weight`, `line-height`) y números JS en `style={{ width: 40 }}`; la familia de un `font:` abreviado; constantes sueltas (`const w = '560px'`) cuyo nombre no es de estilo. Falso positivo conocido: en un `styles.js` toda cadena es estilo, así que `'item-2px'` cuenta.

## Tamaño del entry: contra qué se mide

`scripts/entry-size.mjs` mide el build contra su archivo de línea base, es decir, contra el entry de la rama que lo escribió con `--update`, no contra `main`. `main` no tiene el script ni la línea base. Cada medida tiene un margen independiente de +1 024 B. El presupuesto de CSS suma el gzip de las hojas locales que carga `index.html`. Cuando esta rama se integre, la línea base pasa a ser la de `main` y `design:ratchet` impide subirla.

Medición del 2026-11-18 (build de `vite build` de `git archive` de cada commit, mismas dependencias, gzip de zlib por defecto):

| | Entry (gzip) |
| --- | --- |
| `main` en el merge-base `960d208a` | 279 710 B (273,15 kB) |
| rama (`798af8bf`) | 283 550 B (276,90 kB) |
| diferencia | +3 840 B (+3,75 kB) |
| línea base guardada en la rama (`ca9fe1ee`) | 283 237 B (276,60 kB); +313 B hasta hoy |

Para medir el entry contra `main` (el coordinador lo corre al cierre de cada ola; no hay un script aparte):

```bash
tmp=$(mktemp -d)
git archive origin/main | tar -x -C "$tmp"
ln -s "$PWD/node_modules" "$tmp/node_modules"
cp -R src/@ "$tmp/src/"            # el submódulo src/@/components, que git archive no incluye
(cd "$tmp" && pnpm exec vite build)
node scripts/entry-size.mjs --measure-only --dist "$tmp/dist"   # informa el gzip de JS y CSS de main
pnpm build && node scripts/entry-size.mjs --dist dist
```

`--measure-only` imprime ambos tamaños sin exigir manifiesto ni aplicar el presupuesto de esta rama. La ejecución de CI conserva ambos presupuestos y comprueba que el SVG del mapa no vuelva al JavaScript inicial ni al precaché.

Qué explica la diferencia (coste marginal en gzip de los módulos que `main` no tiene, atribuidos con el mapa de fuentes del entry; no suma exacto porque comprimen juntos):

| Causa | gzip |
| --- | --- |
| Runtime de `lucide-react` (`Icon`, `createLucideIcon`, utilidades, contexto) | ≈ 1 340 B |
| Nueve glifos Lucide del selector de contexto del pedido (`orderContextGlyphs.js`) | ≈ 1 140 B |
| Escritor de variables de los tokens (`design-system/tokens/`: alias, catálogo, variables, `ThemeCssVariables`, `themeBreakpoint`) | ≈ 740 B |
| `createIcon`, la lista de glifos y `OrderIcon` | ≈ 220 B |
| Tres glifos Lucide del `Chevron` | ≈ 100 B |
| Cambios en módulos que ya existían (`Header/styles.js`, `themeTokens`, `themeMotion`, `ThemeContext`, `AddressOrderType/styles.js`) | ≈ 300 B |
| i18n | 0: ningún módulo del catálogo cambió en el entry |

El entry toma `createIcon` con sus glifos, no el registro completo de `Icon` (unos 16 kB gzip, implementation notes). Las cifras de la tabla miden solo el JS de entrada.

### implementation notesel header con el Button base (2026-11-19)

El header, el carrito, el menú lateral, la barra de la tienda y el chip del contexto pasaron a ser `Button` base con iconos Lucide (`HeaderIcon`), y el header ganó su comportamiento de scroll. El entry crece y la línea base sube a propósito (decisión de Sergio, opción A: aceptar el crecimiento).

| | Entry (gzip) |
| --- | --- |
| `8f64d2ba` (antes de implementation notes) | 284 374 B (277,71 kB) |
| `bfc17dcb` y la línea base nueva | 303 211 B (296,10 kB) |
| diferencia | +18 837 B (+18,40 kB) |

Medido con el `vite build` de `git archive` de cada commit (mismas dependencias, gzip de zlib por defecto) y atribuido con el mapa de fuentes del entry: coste marginal en gzip de quitar del entry los trozos de cada módulo. Cada fila es marginal, así que no suman exacto (comprimen juntos).

| Causa | gzip |
| --- | --- |
| `tailwind-merge` (el catálogo de clases y la fusión), que entra por `design-system/lib/cn.js` | ≈ 8 930 B |
| `design-system/lib/cn.js`, `clsx` y `design-system/tokens/tailwind.mjs` | ≈ 550 B |
| `class-variance-authority` (las variantes de `Button.jsx`) | ≈ 340 B |
| `design-system/components/Button.jsx` | ≈ 1 240 B |
| `@base-ui/react/button` y sus utilidades (`useButton`, `mergeProps`, `useRenderElement`, `@base-ui/utils`) | ≈ 2 600 B |
| `@floating-ui/utils` (el módulo DOM que arrastra la pieza) | ≈ 330 B |
| `design-system/lib/componentVars.js` | ≈ 480 B |
| `Icon/headerGlyphs.js` y los doce glifos Lucide nuevos del header | ≈ 1 050 B |
| Resto del header nuevo (`scrollBehavior`, `OrderContextChip`, `behindHeader`, `orderContextDock`, `HeaderMapButton`, `HeaderCartButton`) | ≈ 1 610 B |
| Todos los grupos anteriores juntos (marginal conjunto) | ≈ 17 920 B |
| Resto: módulos que ya existían y cambiaron (`Header/styles.js`, `Header/index.js`, `src/index.js`, `HeaderOption/styles.js`) | ≈ 920 B |

Por qué: el header es la primera pieza base encima del pliegue, así que el `Button` base (con `cn.js` y `tailwind-merge`) entra por primera vez en el entry, que es lo que se descarga antes que nada. Casi la mitad del crecimiento es `tailwind-merge`, que `cn.js` usa para fusionar clases. Mejora futura: adelgazar `cn.js` en el entry (una fusión de las pocas clases que usa el `Button`, sin el catálogo completo de `tailwind-merge`); no se hace aquí. El presupuesto de CSS cubre la hoja global de Tailwind. Los chunks por ruta se descargan aparte.
