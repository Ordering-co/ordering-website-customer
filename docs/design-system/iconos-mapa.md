# Mapa de iconos: registro antiguo (react-icons) → registro Lucide

Inventario de solo lectura de la web (`src/ui/src/components/Icon/`), con el commit `99dc13ab` de la rama `website-design-batch-2-55245006--d-1328`. Excluye el submódulo `src/@/components` (que no usa `~ui-icon`). Decisión ya tomada: todo a trazo con un grosor único (Lucide, stroke 2); solo favorito (corazón), valoración (estrella) y similares siguen rellenos (`FILLED_ICONS`).

Convenciones de este documento:

- Las rutas de «dónde» son relativas a `src/ui/src/` (por ejemplo `components/Header/index.js` es `src/ui/src/components/Header/index.js`).
- Marcas tras el número de línea: `†` el nombre se resuelve desde datos o una variable (ver sección 3; la línea apunta a donde se define el nombre); `‡` el nombre llega por un prop de otro componente (`NotFoundSource icon`, `EmptyStateIcon name`, `Stepper decrementIcon`, acción de `SavedAddressItem`; la línea es el sitio que lo pasa); `?` el nombre es una de dos ramas de un ternario (el uso real depende del estado).
- `(P2)` el `<Icon>` va dentro de un `Button`/`IconButton`/`ButtonLink` antiguo de `styles/Buttons` (o de un componente `styled(...)` derivado de ellos); se migra con los botones (P2). `(P4)` el `<Icon>` va dentro de un campo antiguo: el contenedor tiene como hijo un `Input`/`TextArea` de `styles/Inputs` (icono antepuesto, ojo de contraseña, lupa, adjuntar); se migra con los campos (P4). No existe ningún `<Icon>` hijo directo de `Input`/`TextArea` (son `<input>`/`<textarea>`) ni ninguna prop `startIcon`/`endIcon`/`icon` de `Button` o `Input` con un `<Icon>` (se comprobó con el AST).
- «usos» cuenta apariciones de un nombre (un `<Icon>` con ternario aporta una a cada nombre; un uso `‡` cuenta en el sitio que pasa el nombre, y el `<Icon>` interno de `NotFoundSource` no se cuenta aparte, para no duplicar).
- Los tests (`__tests__`) y `design-system/` quedan fuera de los conteos de uso.

## 1. Resumen

| Medida | Valor | Comando |
|---|---|---|
| Nombres en el registro | **172** (mismas claves en `iconRegistry.js` y `lucideRegistry.js`) | `sed -n "/export const ICON_REGISTRY/,/^}/p" src/ui/src/components/Icon/iconRegistry.js \| grep -cE "^  [A-Za-z0-9]+:"` |
| Nombres con al menos un uso | **137** (126 con un `<Icon name>` directo o resuelto desde datos y 11 solo por props de otros componentes) | AST (`@babel/parser`) sobre `src/` sin tests ni `design-system/`, cruzado con las claves del registro |
| Nombres sin uso | **35** (sección 6) | complemento de lo anterior |
| Elementos `<Icon>` antiguos en la UI | **279** en **99** archivos | `grep -rlE "from '(~ui-icon\|~ui/src/components/Icon)'" src --include='*.js' --include='*.jsx' --exclude-dir=__tests__ --exclude-dir=design-system --exclude-dir=@ \| xargs grep -ohE "<Icon\b" \| wc -l` (y `\| wc -l` sin el último paso para los archivos) |
| Apariciones de nombre ya resueltas | **357**: 256 literales, 14 de ternarios, 23 resueltas desde datos/variables y 64 por props de otros componentes | script AST de esta sesión (no versionado) sobre `src/`; detalle en las secciones 2 y 3 |
| Elementos `<Icon>` con nombre no literal | 16 (variable, miembro, llamada o `{...spread}`; sección 3) | AST |
| `<Icon>` ya migrados (design-system) fuera de `design-system/` | **4** elementos en 3 archivos (`styles/FavoriteButton/index.js:102`, `components/ProductShare/ProductCopyURL.js:60`, `components/ProductShare/index.js:51` y `:66`); dentro de `design-system/` hay 21 más (no son objeto de este inventario) | `grep -rn "<Icon\b" src --include='*.js' --include='*.jsx' --exclude-dir=__tests__ --exclude-dir=@ \| grep design-system \| wc -l` y el AST de arriba para los 4 |
| Otros iconos ya migrados que no usan este registro | `OrderIcon` (`createIcon` sobre `orderContextGlyphs.js`): 14 usos (Header 3, OrderContextUI 5, AddressOrderType 5, OrderTypeSelectorHeader 1); `Chevron` (`chevronGlyphs.js`) | `grep -rn "<OrderIcon" src --include='*.js' --include='*.jsx' --exclude-dir=__tests__ --exclude-dir=@ \| cut -d: -f1 \| sort \| uniq -c` |
| Imports directos de `react-icons` fuera de `Icon/` | **0** | `grep -rnE "from ['\"]react-icons" src --include='*.js' --include='*.jsx' --include='*.mjs' \| grep -v "^src/@/" \| grep -v "components/Icon/iconRegistry.js"` |
| Imports directos de `@meronex/icons` y otras librerías de iconos (fontawesome, mui, heroicons…) | **0** (ni siquiera están en `package.json`) | `grep -rnE "from ['\"](@meronex\|@fortawesome\|@mui/icons\|@heroicons\|react-feather\|react-bootstrap-icons)" src` |
| Imports directos de `lucide-react` fuera de `Icon/` y `design-system/` | **0** (dentro de `design-system/`: `components/Dialog.jsx:8` importa `X`, y 2 tests) | `grep -rn "from 'lucide-react'" src --include='*.js' --include='*.jsx' --exclude-dir=@ \| grep -v components/Icon/ \| grep -v design-system/` |
| `<svg>` en línea en la UI (`src/ui/src/components`, `src/ui/src/styles`, `src/pages`, `src/components`; sin `design-system/` ni `Icon/`) | **6** elementos en 5 archivos (sección 4); además 4 `data:image/svg+xml` en CSS (2 en `styles/Checkbox`, 2 en `ServiceForm/styles.js`). El comando devuelve 8 líneas: los 6 elementos y las 2 plantillas CSS de `styles/Checkbox/index.js:18,21` | `grep -rnE "<svg\b" src --include='*.js' --include='*.jsx' \| grep -v "^src/@/" \| grep -v design-system/ \| grep -v components/Icon/ \| grep -v __tests__` |
| Mocks de `~ui-icon` en tests | 14 archivos (`vi.mock('~ui-icon'`); a revisar si cambia la firma del `Icon` | `grep -rl "vi.mock('~ui-icon'" src \| wc -l` |
| `<Icon>` antiguo dentro de un `Button` antiguo (P2) | **66** apariciones | AST, con `Button`/`IconButton`/`ButtonLink` de `styles/Buttons` y los `styled(...)` derivados |
| `<Icon>` antiguo dentro de un campo antiguo (P4) | **15** apariciones (2 de ellas también en un botón) | AST, con `Input`/`TextArea` de `styles/Inputs` como hijo del contenedor |

De las 357 apariciones, **281** están fuera de las zonas con dueño (las que migra IC) y 76 dentro de ellas (sección 5).

**Hallazgo a corregir antes de migrar:** `components/BusinessBasicInformation/BusinessInfoComponent.js:261` usa `<Icon name="arrowLeftRight" />` y esa clave **no existe** en el registro (ni en el antiguo ni en el Lucide). `Icon` devuelve `null` y avisa por consola, así que el botón «Cambiar de tienda» no muestra icono hoy. Lucide tiene `ArrowLeftRight` (o `Repeat`); hay que añadir la clave o cambiar el nombre.

## 2. Tabla por nombre

Orden alfabético (sin distinguir mayúsculas). `antiguo` es el glifo de `react-icons` y su estilo en su librería; `relleno en el nuevo` es «sí» solo si la clave está en `FILLED_ICONS`. `usos` es el total y, entre paréntesis, los que caen fuera de las zonas con dueño (los de IC). Los ⚠️ marcan los aproximados y los sin equivalente.

| nombre | antiguo | Lucide | relleno en el nuevo | equivalencia | usos | dónde |
|---|---|---|---|---|---|---|
| `addressBook` | `FaAddressBook` · relleno | `BookUser` | no | exacto (relleno→trazo) | 1 (1) | `components/UserProfileForm/ProfileOptions/index.js`:40 |
| `apple` | `FaApple` · marca (sólido) | `Apple` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/AppleLogin/index.js`:39(P2) |
| `arrowDown` | `BsArrowDown` · trazo | `ArrowDown` | no | exacto | 2 (2) | `components/BusinessListingSearch/index.js`:753; `components/WalletTransactionItem/index.js`:37 |
| `arrowLeft` | `BsArrowLeft` · trazo | `ArrowLeft` | no | exacto | 5 (2) | `components/BusinessBasicInformation/index.js`:309(P2); `components/BusinessProductsListing/index.js`:615; `components/BusinessStickyHeader/index.js`:61; `components/MultiCheckout/index.js`:382(P2); `components/RenderProductsLayout/index.js`:401(P2) |
| `arrowRight` | `BsArrowRight` · trazo | `ArrowRight` | no | exacto | 6 (6) | `components/BusinessPreorder/index.js`:317(P2); `components/CitiesControl/index.js`:101; `components/CustomOrderModal/Step1.js`:228(P2); `components/CustomOrderModal/Step2.js`:190(P2); `components/OrderDetails/OrderHistory.js`:150(P2); `components/ReviewOrder/index.js`:231(P2) |
| `arrowUp` | `BsArrowUp` · trazo | `ArrowUp` | no | exacto | 2 (2) | `components/BusinessListingSearch/index.js`:753; `components/WalletTransactionItem/index.js`:34 |
| `bag` | `BsBag` · trazo | `ShoppingBag` | no | exacto | 10 (5) | `components/BusinessProductsListing/index.js`:791‡; `components/BusinessReservation/index.js`:368‡; `components/CartContent/index.js`:368‡; `components/CartStoresListing/index.js`:76‡; `components/Checkout/index.js`:2132‡, 2153‡; `components/MultiCart/index.js`:26‡; `components/MultiCheckout/index.js`:533‡; `components/RenderProductsLayout/index.js`:502‡, 682‡ |
| `basket` | `BiBasket` · trazo | `ShoppingBasket` | no | exacto | 1 (1) | `components/BusinessController/index.js`:449 |
| `basketFilled` | `BsBasket2Fill` · relleno | `ShoppingBasket` | no | exacto (relleno→trazo) | 3 (1) | `components/BusinessStickyHeader/index.js`:75; `components/CartPopover/index.js`:180; `components/HeaderOption/index.js`:42 |
| `bell` | `AiOutlineBell` · trazo | `Bell` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:633 |
| `book` | `AiOutlineBook` · trazo | `Book` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:433 |
| `boxArrowInRight` | `BsBoxArrowInRight` · trazo | `LogIn` | no | exacto | 1 (1) | `components/LoginForm/index.js`:491(P4) |
| `briefcase` | `FaBriefcase` · relleno | `Briefcase` | no | exacto (relleno→trazo) | 2 (2) | `components/AddressForm/index.js`:697†; `components/SavedAddressItem/index.js`:136† |
| `building` | `BsBuilding` · trazo | `Building2` | no | exacto | 0 | — |
| `calendar` | `BsCalendar3` · trazo | `Calendar` | no | exacto | 0 | — |
| `car` | `BiCar` · trazo | `Car` | no | exacto | 2 (2) | `components/BusinessController/index.js`:437, 443 |
| ⚠️ `cardChecklist` | `BsCardChecklist` · trazo | `ListChecks` | no | aproximado ⚠️ — lista con checks, no la tarjeta con lista | 1 (0) | `components/NavigationBar/index.js`:141 |
| `cardImage` | `BsCardImage` · trazo | `ImageIcon` | no | exacto | 1 (1) | `components/Messages/index.js`:572(P4) |
| ⚠️ `caretLeftFill` | `BsCaretLeftFill` · relleno | `ChevronLeft` | no | aproximado ⚠️ — triángulo relleno → chevron de trazo | 1 (1) | `components/ServiceForm/index.js`:483 |
| ⚠️ `caretUpFill` | `BsCaretUpFill` · relleno | `ChevronUp` | no | aproximado ⚠️ — triángulo relleno → chevron de trazo | 2 (0) | `components/Header/index.js`:602, 626 |
| `carFront` | `BsCarFront` · trazo | `CarFront` | no | exacto | 0 | — |
| ⚠️ `carSide` | `FaCarSide` · trazo | `Car` | no | aproximado ⚠️ — Lucide no tiene vista lateral; pasa a vista frontal (Car) | 0 | — |
| `cart` | `IoCart` · relleno | `ShoppingCart` | no | exacto (relleno→trazo) | 1 (1) | `components/CartSidebar/index.js`:66 |
| `cart3` | `BsCart3` · trazo | `ShoppingCart` | no | exacto | 0 | — |
| `cash` | `BsCash` · trazo | `Banknote` | no | exacto | 2 (2) | `components/MultiCartsPaymethodsAndWallets/index.js`:39; `components/PaymentOptions/index.js`:118 |
| `cellphone` | `MdPhoneAndroid` · relleno | `Smartphone` | no | exacto (relleno→trazo) | 0 | — |
| `chat` | `BsChat` · trazo | `MessageSquare` | no | exacto | 0 | — |
| `check` | `BsCheck` · trazo | `Check` | no | exacto | 3 (0) | `components/Checkout/index.js`:1274, 1303, 1638 |
| `check2` | `BsCheck2` · trazo | `Check` | no | exacto | 0 | — |
| `checkboxBlank` | `MdCheckBoxOutlineBlank` · trazo | `Square` | no | exacto | 0 | — |
| `checkCircleFill` | `BsCheckCircleFill` · relleno | `CircleCheck` | no | exacto (relleno→trazo) | 4 (4) | `components/OrderDetails/OrderHistory.js`:94, 113; `components/OrderDetails/index.js`:844?; `components/OrderDetails/layouts/Tracking/index.js`:66† |
| `checkOutline` | `AiOutlineCheck` · trazo | `Check` | no | exacto | 0 | — |
| `checkSquare` | `BiCheckSquare` · trazo | `SquareCheck` | no | exacto | 0 | — |
| `chevronDown` | `BsChevronDown` · trazo | `ChevronDown` | no | exacto | 0 | — |
| `chevronLeft` | `BsChevronLeft` · trazo | `ChevronLeft` | no | exacto | 0 | — |
| `chevronRight` | `BsChevronRight` · trazo | `ChevronRight` | no | exacto | 0 | — |
| `circleFill` | `BsCircleFill` · relleno | `Circle` | sí | exacto (sigue relleno) | 2 (1) | `components/BusinessListingSearch/MaxSectionItem/index.js`:80; `components/ProductOptionSubOption/index.js`:35† |
| `circleHalf` | `BsCircleHalf` · trazo | `CircleHalf` (propio, `custom/`) | no | propio — custom (./custom): solid left half, which the pizza halves control needs | 2 (0) | `components/ProductOptionSubOption/index.js`:34†, 36† |
| `clock` | `FiClock` · trazo | `Clock` | no | exacto | 6 (5) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:276(P2); `components/BusinessController/index.js`:390; `components/BusinessInformation/index.js`:209, 215; `components/Checkout/index.js`:1543; `components/OrderSuccessModal/index.js`:89 |
| `clockHistory` | `BsClockHistory` · trazo | `History` | no | exacto | 2 (2) | `components/SessionsList/index.js`:173‡, 188‡ |
| `clockOutline` | `FaRegClock` · trazo | `Clock` | no | exacto | 0 | — |
| `close` | `AiOutlineClose` · trazo | `X` | no | exacto | 2 (1) | `components/DriverTips/index.js`:131(P2,P4); `components/Header/index.js`:652 |
| `closeCircle` | `IoCloseCircle` · relleno | `CircleX` | no | exacto (relleno→trazo) | 5 (5) | `components/Cart/index.js`:540, 637, 717; `components/CouponControl/index.js`:120(P2); `components/OrderDetails/index.js`:844? |
| `closeLine` | `FiX` · trazo | `X` | no | exacto | 3 (2) | `components/Confirm/index.js`:93, 101; `components/Modal/index.js`:144† |
| `closeMd` | `MdClose` · trazo | `X` | no | exacto | 16 (16) | `components/BusinessInformation/index.js`:128; `components/CartSidebar/index.js`:81; `components/CitiesControl/index.js`:57; `components/Messages/index.js`:296(P2), 458(P2), 582(P2,P4), 641(P2); `components/ReviewDriver/index.js`:189; `components/ReviewOrder/index.js`:202; `components/ReviewProduct/index.js`:142; `components/ReviewProfessional/index.js`:158; `components/SessionsList/index.js`:140(P2); `components/UpsellingPage/index.js`:147(P2); `components/UserDetails/index.js`:209, 233(P2), 256(P2) |
| ⚠️ `closeOctagon` | `MdCancel` · relleno | `OctagonX` | no | aproximado ⚠️ — MdCancel es un círculo con X; Lucide OctagonX es un octógono. El equivalente exacto sería CircleX | 2 (2) | `components/CouponControl/index.js`:368; `components/Messages/index.js`:532 |
| `closeX` | `BsXLg` · trazo | `X` | no | exacto | 5 (4) | `components/BusinessListingSearch/index.js`:803; `components/BusinessProductsList/SubcategoriesComponent/index.js`:48; `components/BusinessTypeFilter/index.js`:74, 94; `components/BusinessesListing/layouts/AppointmentsBusinessListing/index.js`:197 |
| `creditCard` | `BsCreditCard` · trazo | `CreditCard` | no | exacto | 6 (6) | `components/CardBrand/index.js`:20; `components/MultiCartsPaymethodsAndWallets/index.js`:41, 53; `components/PaymentOptions/index.js`:121, 128; `components/SavedCards/index.js`:192 |
| `creditCardFront` | `BsCreditCard2Front` · trazo | `CreditCard` | no | exacto | 5 (5) | `components/PaymentOptionStripe/index.js`:111‡; `components/PaymentOptions/index.js`:354‡; `components/SavedCards/index.js`:176‡, 180‡, 184‡ |
| `creditCardOutline` | `AiOutlineCreditCard` · trazo | `CreditCard` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:565 |
| `crown` | `FaCrown` · relleno | `Crown` | no | exacto (relleno→trazo) | 1 (1) | `components/BusinessController/index.js`:243 |
| `dashCircle` | `BsDashCircle` · trazo | `CircleMinus` | no | exacto | 1 (1) | `components/CustomOrderModal/Step2.js`:95(P2) |
| `dashLg` | `BsDashLg` · trazo | `Minus` | no | exacto | 1 (1) | `styles/Stepper/index.js`:152†(P2) |
| `dashSquare` | `BsDashSquare` · trazo | `SquareMinus` | no | exacto | 0 | — |
| `dashSquareFill` | `BsDashSquareFill` · relleno | `SquareMinus` | no | exacto (relleno→trazo) | 0 | — |
| `dislikeOutline` | `AiOutlineDislike` · trazo | `ThumbsDown` | no | exacto | 4 (4) | `components/OrderDetails/layouts/Tracking/SatisfactionSurvey.js`:59†; `components/ReviewDriver/index.js`:168; `components/ReviewOrder/index.js`:182; `components/ReviewProduct/index.js`:125 |
| `dollarCircle` | `AiOutlineDollarCircle` · trazo | `CircleDollarSign` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:411 |
| ⚠️ `dot` | `GoDot` · trazo | `Dot` | no | aproximado ⚠️ — GoDot era un anillo hueco; Dot es un punto | 4 (4) | `components/BusinessController/index.js`:370, 420; `components/BusinessListingSearch/index.js`:626, 632 |
| `dotSmall` | `BsDot` · relleno (punto) | `Dot` | no | exacto | 1 (1) | `components/GiftCard/SingleGiftCard/index.js`:75 |
| `envelope` | `BsEnvelope` · trazo | `Mail` | no | exacto | 2 (0) | `components/UserVerification/index.js`:178(P4), 427(P4) |
| `environment` | `AiOutlineEnvironment` · trazo | `MapPin` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:544 |
| `exclamationFilled` | `AiFillExclamationCircle` · relleno | `CircleAlert` | no | exacto (relleno→trazo) | 0 | — |
| `eye` | `AiOutlineEye` · trazo | `Eye` | no | exacto | 2 (2) | `components/SignUpBusiness/index.js`:439(P4); `components/SignUpDriver/index.js`:434(P4) |
| `eyeBs` | `BsEye` · trazo | `Eye` | no | exacto | 0 | — |
| `eyeFilled` | `BsEyeFill` · relleno | `Eye` | no | exacto (relleno→trazo) | 2 (2) | `components/LoginForm/index.js`:617(P4); `components/SignUpForm/index.js`:513(P4) |
| `eyeInvisible` | `AiOutlineEyeInvisible` · trazo | `EyeOff` | no | exacto | 2 (2) | `components/SignUpBusiness/index.js`:439(P4); `components/SignUpDriver/index.js`:434(P4) |
| `eyeSlashBs` | `BsEyeSlash` · trazo | `EyeOff` | no | exacto | 0 | — |
| `eyeSlashFilled` | `BsEyeSlashFill` · relleno | `EyeOff` | no | exacto (relleno→trazo) | 2 (2) | `components/LoginForm/index.js`:617(P4); `components/SignUpForm/index.js`:513(P4) |
| `facebook` | `FaFacebookF` · marca (sólido) | `Facebook` (`brands/`) | no (marca, glifo sólido propio) | marca | 2 (2) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:343; `components/FacebookLogin/index.js`:33(P2) |
| `filter` | `FiFilter` · trazo | `Filter` | no | exacto | 2 (2) | `components/BusinessesListing/layouts/AppointmentsBusinessListing/index.js`:168(P2); `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:654(P2) |
| ⚠️ `fullscreen` | `BsArrowsFullscreen` · trazo | `Maximize` | no | aproximado ⚠️ — BsArrowsFullscreen son flechas diagonales; Maximize son esquinas (Maximize2 sería el exacto) | 1 (1) | `components/OrderDetails/layouts/Tracking/index.js`:406?(P2) |
| `fullscreenExit` | `BsFullscreenExit` · trazo | `Minimize` | no | exacto | 1 (1) | `components/OrderDetails/layouts/Tracking/index.js`:406?(P2) |
| `geoAlt` | `BsGeoAlt` · trazo | `MapPin` | no | exacto | 2 (2) | `components/AddressList/index.js`:430‡, 444‡ |
| `geoAltFill` | `BsGeoAltFill` · relleno | `MapPin` | no | exacto (relleno→trazo) | 1 (0) | `components/Header/index.js`:787 |
| `gift` | `BsGift` · trazo | `Gift` | no | exacto | 3 (3) | `components/GiftCard/GiftCardUI/index.js`:48, 70; `components/GiftCard/PurchaseGiftCard/index.js`:52 |
| `giftOutline` | `AiOutlineGift` · trazo | `Gift` | no | exacto | 2 (1) | `components/CouponControl/index.js`:379; `components/SidebarMenu/index.js`:477 |
| `google` | `BiLogoGoogle` · marca (sólido) | `Google` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/GoogleLogin/index.js`:33(P2) |
| `grid` | `BsGrid` · trazo | `LayoutGrid` | no | exacto | 1 (1) | `components/BusinessTypes/index.js`:54 |
| `heartBs` | `BsHeart` · trazo | `Heart` | no | exacto | 1 (1) | `components/FavoriteList/index.js`:230‡ |
| `heartFilled` | `AiFillHeart` · relleno | `Heart` | sí | exacto (sigue relleno) | 0 | — |
| `heartOutline` | `AiOutlineHeart` · trazo | `Heart` | no | exacto | 3 (2) | `components/AddressForm/index.js`:701†; `components/SavedAddressItem/index.js`:136†; `components/SidebarMenu/index.js`:337 |
| `home` | `FaHome` · relleno | `House` | no | exacto (relleno→trazo) | 3 (3) | `components/AddressForm/index.js`:693†; `components/OrderDetails/layouts/Tracking/index.js`:66†; `components/SavedAddressItem/index.js`:136† |
| `homeOutline` | `AiOutlineHome` · trazo | `House` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:285 |
| `house` | `BsHouse` · trazo | `House` | no | exacto | 2 (1) | `components/BusinessesListing/layouts/AppointmentsBusinessListing/index.js`:285; `components/NavigationBar/index.js`:137 |
| `image` | `BiImage` · trazo | `ImageIcon` | no | exacto | 1 (1) | `components/UserProfileForm/index.js`:179 |
| `infoCircle` | `BsInfoCircle` · trazo | `Info` | no | exacto | 12 (12) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:267(P2); `components/Cart/index.js`:536, 633, 667, 713; `components/FeeBillRows/index.js`:28; `components/OrderDetails/OrderBillSection.js`:130, 205, 231, 284; `components/SingleProfessionalCard/index.js`:101; `components/TaxBillRows/index.js`:31 |
| `infoCircleOutline` | `AiOutlineInfoCircle` · trazo | `Info` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:660 |
| `instagram` | `BsInstagram` · marca (sólido) | `Instagram` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:346 |
| `keyboardArrowLeft` | `MdKeyboardArrowLeft` · trazo | `ChevronLeft` | no | exacto | 6 (5) | `components/AutoScroll/index.js`:237?(P2); `components/MomentControl/layouts/CustomLayout/index.js`:89; `components/PageBanner/index.js`:204(P2); `components/PreorderDateTimeSteps/DayStrip.js`:141(P2); `components/ProductForm/index.js`:952(P2); `components/ServiceForm/index.js`:355(P2) |
| `keyboardArrowRight` | `MdKeyboardArrowRight` · trazo | `ChevronRight` | no | exacto | 6 (5) | `components/AutoScroll/index.js`:237?(P2); `components/MomentControl/layouts/CustomLayout/index.js`:90; `components/PageBanner/index.js`:207(P2); `components/PreorderDateTimeSteps/DayStrip.js`:180(P2); `components/ProductForm/index.js`:957(P2); `components/ServiceForm/index.js`:360(P2) |
| `lifeBuoy` | `FiLifeBuoy` · trazo | `LifeBuoy` | no | exacto | 1 (1) | `components/OrderDetails/index.js`:582(P2) |
| `likeOutline` | `AiOutlineLike` · trazo | `ThumbsUp` | no | exacto | 4 (4) | `components/OrderDetails/layouts/Tracking/SatisfactionSurvey.js`:58†; `components/ReviewDriver/index.js`:161; `components/ReviewOrder/index.js`:175; `components/ReviewProduct/index.js`:122 |
| `link` | `HiLink` · relleno | `Link` | no | exacto (relleno→trazo) | 0 | — |
| `location` | `GoLocation` · trazo | `MapPin` | no | exacto | 1 (1) | `components/CustomOrderModal/Step1.js`:167 |
| `locationFood` | `MdRestaurant` · relleno | `Utensils` | no | exacto (relleno→trazo) | 1 (0) | `components/Header/index.js`:783 |
| `locationMarker` | `HiOutlineLocationMarker` · trazo | `MapPin` | no | exacto | 1 (1) | `components/OrderSuccessModal/index.js`:84 |
| `locationPin` | `HiOutlineLocationMarker` · trazo | `MapPin` | no | exacto | 2 (1) | `components/AddressForm/AddressMapBoxList/index.js`:33; `components/Checkout/index.js`:1608? |
| `lock` | `BsLock` · trazo | `Lock` | no | exacto | 0 | — |
| `login` | `AiOutlineLogin` · trazo | `LogIn` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:719 |
| `logoutOutline` | `AiOutlineLogout` · trazo | `LogOut` | no | exacto | 1 (1) | `components/LogoutButton/index.js`:45 |
| `map` | `FiMap` · trazo | `MapIcon` | no | exacto | 2 (2) | `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:553(P2), 668(P2) |
| `mapMarker` | `FaMapMarkerAlt` · relleno | `MapPin` | no | exacto (relleno→trazo) | 5 (5) | `components/AddressForm/index.js`:570; `components/BusinessController/index.js`:420; `components/BusinessInformation/index.js`:151; `components/HeaderOption/index.js`:48; `components/HomeHero/index.js`:179 |
| `menu` | `AiOutlineMenu` · trazo | `Menu` | no | exacto | 0 | — |
| ⚠️ `menuAltRight` | `BiMenuAltRight` · trazo | `TextAlignEnd` | no | aproximado ⚠️ — líneas alineadas a la derecha (TextAlignEnd), forma distinta de BiMenuAltRight | 1 (0) | `components/RenderProductsLayout/index.js`:375† |
| `menuBars` | `FiMenu` · trazo | `Menu` | no | exacto | 3 (0) | `components/RenderProductsLayout/index.js`:375†; `components/SidebarMenu/index.js`:248†(P2), 273†(P2) |
| `message` | `AiOutlineMessage` · trazo | `MessageSquare` | no | exacto | 2 (1) | `components/OrderDetails/ActionsSection.js`:64(P2); `components/SidebarMenu/index.js`:587 |
| `paypal` | `FaPaypal` · marca (sólido) | `Paypal` (`brands/`) | no (marca, glifo sólido propio) | marca | 2 (2) | `components/MultiCartsPaymethodsAndWallets/index.js`:49; `components/PaymentOptions/index.js`:120 |
| `pencil` | `BsPencil` · trazo | `Pencil` | no | exacto | 9 (9) | `components/AddressDetails/index.js`:104(P2); `components/AddressList/index.js`:111‡(P2); `components/DriverTips/index.js`:99; `components/ProductItemAccordion/index.js`:195, 255, 351, 383; `components/UserDetails/index.js`:238(P2); `components/UserProfileForm/index.js`:246(P2) |
| `person` | `BsPerson` · trazo | `User` | no | exacto | 1 (1) | `components/UserProfileForm/ProfileOptions/index.js`:34 |
| `phone` | `BsTelephone` · trazo | `Phone` | no | exacto | 2 (2) | `components/OrderDetails/ActionsSection.js`:73(P2); `components/OrderDetails/layouts/Tracking/DeliveryOrderTabs.js`:222(P2) |
| ⚠️ `pinMapFill` | `BsPinMapFill` · relleno | `MapPinned` | no | aproximado ⚠️ — pin sobre mapa, trazo en lugar de relleno | 2 (0) | `components/Header/index.js`:666, 727 |
| `pinterest` | `BsPinterest` · marca (sólido) | `Pinterest` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:352 |
| `playCircle` | `MdPlayCircleOutline` · trazo | `CirclePlay` | no | exacto | 1 (0) | `components/ProductForm/index.js`:1010 |
| `plusCircle` | `BsPlusCircle` · trazo | `CirclePlus` | no | exacto | 1 (1) | `components/CustomOrderModal/Step2.js`:99(P2) |
| `plusLg` | `BsPlusLg` · trazo | `Plus` | no | exacto | 1 (1) | `styles/Stepper/index.js`:162(P2) |
| `plusSquareFill` | `BsPlusSquareFill` · relleno | `SquarePlus` | no | exacto (relleno→trazo) | 1 (1) | `components/UpsellingPage/index.js`:170(P2) |
| `radioCheck` | `CgRadioCheck` · trazo | `Circle` | no | exacto | 0 | — |
| `radioChecked` | `RiRadioButtonFill` · relleno | `CircleDot` | no | exacto (relleno→trazo) | 0 | — |
| `radioCheckedAlt` | `CgRadioChecked` · trazo | `CircleDot` | no | exacto | 0 | — |
| `radioChoiceOff` | `BsCircle` · trazo | `Circle` | no | exacto | 1 (1) | `styles/Choice/index.js`:138? |
| `radioChoiceOn` | `BsRecordCircleFill` · relleno | `CircleDot` | no | exacto (relleno→trazo) | 1 (1) | `styles/Choice/index.js`:138? |
| `radioOff` | `IoRadioButtonOff` · trazo | `Circle` | no | exacto | 0 | — |
| `radioOn` | `IoRadioButtonOn` · relleno | `CircleDot` | no | exacto (relleno→trazo) | 0 | — |
| `radioUnchecked` | `MdRadioButtonUnchecked` · trazo | `Circle` | no | exacto | 0 | — |
| `read` | `AiOutlineRead` · trazo | `BookOpen` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:524 |
| `receipt` | `BsReceipt` · trazo | `Receipt` | no | exacto | 11 (11) | `components/GiftCard/GiftCardOrdersList/index.js`:40‡; `components/MessagesListing/index.js`:275‡; `components/MultiOrdersDetails/index.js`:300‡, 307‡; `components/MyOrders/index.js`:218‡, 263‡; `components/OrderDetails/index.js`:1109‡, 1116‡; `components/OrderDetails/layouts/Tracking/index.js`:279‡, 286‡; `components/OrdersOption/index.js`:265‡ |
| `safety` | `AiOutlineSafety` · trazo | `ShieldCheck` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:686 |
| `search` | `BsSearch` · trazo | `Search` | no | exacto | 7 (4) | `components/BusinessBasicInformation/SearchComponent.js`:40; `components/BusinessListingSearch/index.js`:525‡; `components/BusinessReviews/index.js`:159; `components/Header/index.js`:791; `components/NavigationBar/index.js`:139; `components/RenderProductsLayout/index.js`:413; `components/SearchBar/index.js`:129(P4) |
| ⚠️ `searchLoading` | `CgSearchLoading` · trazo | `Search` | no | aproximado ⚠️ — lupa simple; el estado de carga se compone con un spinner | 1 (1) | `components/AddressForm/index.js`:571 |
| `searchOutline` | `AiOutlineSearch` · trazo | `Search` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:311 |
| `sendFilled` | `BsSendFill` · relleno | `Send` | no | exacto (relleno→trazo) | 1 (1) | `components/Messages/index.js`:605(P2) |
| `share` | `FiShare2` · trazo | `Share2` | no | exacto | 0 | — |
| `shop` | `BsShop` · trazo | `Store` | no | exacto | 11 (7) | `components/BusinessProductsList/index.js`:393‡; `components/BusinessProductsList/layouts/groceries/index.js`:289‡; `components/BusinessProductsListing/index.js`:682‡, 697‡, 714‡, 826‡, 832‡; `components/BusinessesListing/layouts/AppointmentsBusinessListing/index.js`:312‡; `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:699‡; `components/Checkout/index.js`:899‡; `components/ProductForm/index.js`:1288‡ |
| `shopFilled` | `AiFillShop` · relleno | `Store` | no | exacto (relleno→trazo) | 0 | — |
| `shopping` | `AiOutlineShopping` · trazo | `ShoppingBag` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:363 |
| `shoppingBag` | `HiOutlineShoppingBag` · trazo | `ShoppingBag` | no | exacto | 2 (2) | `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:475; `components/CustomOrderModal/Step1.js`:133 |
| `shoppingCart` | `AiOutlineShoppingCart` · trazo | `ShoppingCart` | no | exacto | 1 (0) | `components/NavigationBar/index.js`:143 |
| `signOut` | `FaSignOutAlt` · relleno | `LogOut` | no | exacto (relleno→trazo) | 0 | — |
| `signpost` | `BsSignpost` · trazo | `Signpost` | no | exacto | 3 (3) | `components/AddressList/index.js`:454‡; `components/Cms/index.js`:59‡; `components/PageNotFound/index.js`:14‡ |
| `sms` | `MdSms` · relleno | `MessageSquareText` | no | exacto (relleno→trazo) | 1 (1) | `components/SmsLogin/index.js`:30(P2) |
| `snapchat` | `BsSnapchat` · marca (sólido) | `Snapchat` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:358 |
| `star` | `BsStar` · trazo | `Star` | no | exacto | 4 (4) | `components/BusinessController/index.js`:315, 359; `components/BusinessReviews/index.js`:197‡; `components/HighestRated/index.js`:113‡ |
| `starFilled` | `BsStarFill` · relleno | `Star` | sí | exacto (sigue relleno) | 2 (2) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:250(P2); `components/BusinessReviews/index.js`:188 |
| `starFilledAi` | `AiFillStar` · relleno | `Star` | sí | exacto (sigue relleno) | 3 (3) | `styles/Rating/index.js`:107, 110?, 113 |
| `starOutline` | `AiOutlineStar` · trazo | `Star` | no | exacto | 2 (1) | `components/SidebarMenu/index.js`:452; `styles/Rating/index.js`:110? |
| `store` | `BiStoreAlt` · trazo | `Store` | no | exacto | 4 (2) | `components/Checkout/index.js`:1146, 1608?; `components/OrderDetails/ActionsSection.js`:54(P2); `components/OrderDetails/layouts/Tracking/index.js`:66† |
| `stripe` | `GrStripe` · marca (sólido) | `Stripe` (`brands/`) | no (marca, glifo sólido propio) | marca | 2 (2) | `components/MultiCartsPaymethodsAndWallets/index.js`:47; `components/PaymentOptions/index.js`:124 |
| `stripeCard` | `FaCcStripe` · marca (sólido) | `StripeCard` (`brands/`) | no (marca, glifo sólido propio) | marca | 2 (2) | `components/MultiCartsPaymethodsAndWallets/index.js`:43; `components/PaymentOptions/index.js`:122 |
| `stripeS` | `FaStripeS` · marca (sólido) | `StripeS` (`brands/`) | no (marca, glifo sólido propio) | marca | 2 (2) | `components/MultiCartsPaymethodsAndWallets/index.js`:45; `components/PaymentOptions/index.js`:123 |
| `tag` | `FaTag` · relleno | `Tag` | no | exacto (relleno→trazo) | 6 (6) | `components/AddressForm/index.js`:705†; `components/CouponControl/index.js`:105, 243(P2), 275, 411; `components/SavedAddressItem/index.js`:136† |
| `tags` | `AiOutlineTags` · trazo | `Tags` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:501 |
| `ticket` | `BsTicketPerforated` · trazo | `Ticket` | no | exacto | 4 (4) | `components/GiftCard/PurchaseGiftCard/index.js`:70‡; `components/Promotions/index.js`:136‡, 143‡, 152‡ |
| `tiktok` | `BsTiktok` · marca (sólido) | `Tiktok` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:349 |
| `translation` | `AiOutlineTranslation` · trazo | `Languages` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:611 |
| `trash` | `BsTrash` · trazo | `Trash2` | no | exacto | 3 (2) | `components/Checkout/index.js`:1233(P2); `components/PaymentOptionStripe/index.js`:311(P2); `components/SavedCards/index.js`:206(P2) |
| `trashFilled` | `BsTrash3Fill` · relleno | `Trash2` | no | exacto (relleno→trazo) | 7 (7) | `components/AddressList/index.js`:118‡(P2); `components/ProductItemAccordion/index.js`:221‡(P2), 260, 301‡(P2), 362, 394, 416 |
| `trophy` | `BsTrophy` · trazo | `Trophy` | no | exacto | 1 (1) | `components/Wallets/CreditPointsWallet.js`:81 |
| `trophyFilled` | `BsTrophyFill` · relleno | `Trophy` | sí | exacto (sigue relleno) | 1 (1) | `components/RewardsBanner/index.js`:45 |
| `truckDelivery` | `MdLocalShipping` · relleno | `Truck` | no | exacto (relleno→trazo) | 3 (3) | `components/BusinessController/utils.js`:7; `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:463; `components/OrderDetails/layouts/Tracking/index.js`:66† |
| `truckOutline` | `BsTruck` · trazo | `Truck` | no | exacto | 0 | — |
| `unorderedList` | `AiOutlineUnorderedList` · trazo | `List` | no | exacto | 1 (1) | `components/UserProfileForm/ProfileOptions/index.js`:46 |
| `user` | `FaUserAlt` · relleno | `User` | no | exacto (relleno→trazo) | 6 (6) | `components/Messages/index.js`:318, 365, 424; `components/MultiOrdersDetails/index.js`:120; `components/ReviewProfessional/index.js`:135; `styles/Avatar/index.js`:75 |
| `userAdd` | `AiOutlineUserAdd` · trazo | `UserPlus` | no | exacto | 3 (2) | `components/SidebarMenu/index.js`:744; `components/StudentOnboardingPopup/index.js`:58‡; `components/StudentsList/index.js`:31‡ |
| `userFilled` | `RiUser2Fill` · relleno | `User` | no | exacto (relleno→trazo) | 0 | — |
| `userOutline` | `FaRegUser` · trazo | `User` | no | exacto | 1 (0) | `components/NavigationBar/index.js`:144 |
| `userOutlineAi` | `AiOutlineUser` · trazo | `User` | no | exacto | 1 (0) | `components/SidebarMenu/index.js`:387 |
| `wallet` | `BsWallet2` · trazo | `Wallet` | no | exacto | 5 (5) | `components/Wallets/CashWallet.js`:103‡, 159‡; `components/Wallets/CreditPointsWallet.js`:141‡, 197‡; `components/Wallets/index.js`:142‡ |
| `walletCash` | `FaCoins` · relleno | `Coins` | no | exacto (relleno→trazo) | 2 (2) | `components/PaymentOptionWallet/index.js`:125?; `components/Wallets/CashWallet.js`:54 |
| `walletLoyalty` | `FaHeart` · relleno | `Heart` | sí | exacto (sigue relleno) | 2 (2) | `components/PaymentOptionWallet/index.js`:125?; `components/Wallets/CreditPointsWallet.js`:92 |
| `warning` | `VscWarning` · trazo | `TriangleAlert` | no | exacto | 6 (0) | `components/Checkout/PendingCartNotice.js`:79, 90; `components/Checkout/index.js`:1240, 1537; `components/MultiCheckout/index.js`:443, 451 |
| `whatsapp` | `BsWhatsapp` · marca (sólido) | `Whatsapp` (`brands/`) | no (marca, glifo sólido propio) | marca | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:355 |
| `wifiOff` | `BsWifiOff` · trazo | `WifiOff` | no | exacto | 1 (1) | `components/NotNetworkConnectivity/index.js`:66‡ |
| ⚠️ `arrowLeftRight` (no está en el registro) | — | — | — | sin equivalente ⚠️ — la clave no existe en ninguno de los dos registros; hay que crearla (Lucide `ArrowLeftRight`) o cambiar el nombre | 1 (1) | `components/BusinessBasicInformation/BusinessInfoComponent.js`:261(P2) |

Recuento de equivalencias por clave: aproximado ⚠️: 10, exacto: 112, exacto (relleno→trazo): 31, exacto (sigue relleno): 6, marca: 12, propio: 1.

Grupo `exacto (relleno→trazo)` (claves cuyo glifo antiguo era sólido y pasa a trazo con la misma forma): `addressBook`, `basketFilled`, `briefcase`, `cart`, `cellphone`, `checkCircleFill`, `closeCircle`, `crown`, `dashSquareFill`, `exclamationFilled`, `eyeFilled`, `eyeSlashFilled`, `geoAltFill`, `home`, `link`, `locationFood`, `mapMarker`, `plusSquareFill`, `radioChecked`, `radioChoiceOn`, `radioOn`, `sendFilled`, `shopFilled`, `signOut`, `sms`, `tag`, `trashFilled`, `truckDelivery`, `user`, `userFilled`, `walletCash`.

Claves que siguen rellenas por decisión (`FILLED_ICONS`): `circleFill`, `heartFilled`, `starFilled`, `starFilledAi`, `trophyFilled`, `walletLoyalty`.

## 3. Usos con nombre dinámico

Cada fila es un elemento `<Icon>` cuyo `name` no es una cadena literal. «Resuelve» son los nombres posibles tras seguir la variable.

| archivo:línea | expresión | resuelve | notas |
|---|---|---|---|
| `components/AddressForm/index.js:693` | `ADDRESS_TAG_ICONS.home` | `home` | `components/SavedAddressItem/tags.js:4-9` |
| `components/AddressForm/index.js:697` | `ADDRESS_TAG_ICONS.office` | `briefcase` |  |
| `components/AddressForm/index.js:701` | `ADDRESS_TAG_ICONS.favorite` | `heartOutline` |  |
| `components/AddressForm/index.js:705` | `ADDRESS_TAG_ICONS.other` | `tag` |  |
| `components/SavedAddressItem/index.js:136` | `addressTagIcon(address?.tag)` | `home`, `briefcase`, `heartOutline`, `tag` (según la etiqueta; sin etiqueta, `tag`) | `tags.js:13` |
| `components/SavedAddressItem/index.js:40 y :56` | `action.icon` | `pencil`, `trashFilled` | las acciones solo vienen de `components/AddressList/index.js:111` (`pencil`) y `:118` (`trashFilled`); render dentro de `AddressActionButton` (P2) |
| `components/NotFoundSource/index.js:35` | `name` de `EmptyStateIcon` | ver la lista de abajo | por defecto `bag` (variante empty) o `signpost` (:95), pero todas las llamadas pasan `icon` |
| `components/OrderDetails/layouts/Tracking/SatisfactionSurvey.js:236` | `thumb.icon` | `likeOutline`, `dislikeOutline` | datos en `:58-59` |
| `components/OrderDetails/layouts/Tracking/index.js:328` | `STAGE_ICON_NAMES[index]` | `store`, `truckDelivery`, `home`, `checkCircleFill` | `:66`, una por etapa del seguimiento |
| `components/ProductOptionSubOption/index.js:204` | `half.icon` | `circleHalf` (izquierda y derecha, esta con `reverse`), `circleFill` (entera) | datos en `:34-36`; zona Modal de producto (I-1309) |
| `components/SidebarMenu/index.js:248 y :273` | `{...menuIcon}` | `menuBars` (`strokeWidth: 2.4`) | `:52`; zona Header (I-1303); el `<Icon>` va dentro de `IconContent` / `MenuClose` (P2) |
| `components/Modal/index.js:144` | `{...closeIcon}` | `closeLine` (`strokeWidth: 2.4`) | `:61`; zona Modal de producto (I-1309) |
| `components/RenderProductsLayout/index.js:375` | `{...categoriesMenuIcon}` | `menuAltRight` (tema `bars_right`) o `menuBars` (`strokeWidth: 2.4`) | `categoriesMenuIconOf`, `components/BusinessProductsCategories/styles.js:13-18`; devuelve `null` si el tema oculta el menú; zona barra de categorías (I-1310) |
| `styles/Stepper/index.js:152` | `decrementIcon \|\| 'dashLg'` | `dashLg` por defecto; `trashFilled` desde `components/ProductItemAccordion/index.js:228` y `:308` | `<Icon>` dentro de `StepperButton` (P2) |

Ternarios con dos nombres literales (se cuentan en la tabla de la sección 2 con la marca `?`):

| archivo:línea | expresión | nombres |
|---|---|---|
| `components/AutoScroll/index.js:237` | `left ? 'keyboardArrowLeft' : 'keyboardArrowRight'` | `keyboardArrowLeft`, `keyboardArrowRight` |
| `components/Checkout/index.js:1608` | `deliveryTypes.includes(options?.type) ? 'locationPin' : 'store'` | `locationPin`, `store` |
| `components/OrderDetails/index.js:844` | `terminalRejected ? 'closeCircle' : 'checkCircleFill'` | `closeCircle`, `checkCircleFill` |
| `components/OrderDetails/layouts/Tracking/index.js:406` | `isMapExpanded ? 'fullscreenExit' : 'fullscreen'` | `fullscreenExit`, `fullscreen` |
| `components/PaymentOptionWallet/index.js:125` | `wallet.type === 'cash' ? 'walletCash' : 'walletLoyalty'` | `walletCash`, `walletLoyalty` |
| `styles/Choice/index.js:138` | `checked ? 'radioChoiceOn' : 'radioChoiceOff'` | `radioChoiceOn`, `radioChoiceOff` |
| `styles/Rating/index.js:110` | `outline ? 'starOutline' : 'starFilledAi'` | `starOutline`, `starFilledAi` |

Nombres que llegan a `NotFoundSource` (`icon`) y `EmptyStateIcon` (`name`) desde otros componentes (estado vacío o de error de 55 + 5 llamadas):

| nombre | llamadas |
|---|---|
| `bag` | 10: `components/BusinessProductsListing/index.js`:791‡; `components/BusinessReservation/index.js`:368‡; `components/CartContent/index.js`:368‡; `components/CartStoresListing/index.js`:76‡; `components/Checkout/index.js`:2132‡, 2153‡; `components/MultiCart/index.js`:26‡; `components/MultiCheckout/index.js`:533‡; `components/RenderProductsLayout/index.js`:502‡, 682‡ |
| `clockHistory` | 2: `components/SessionsList/index.js`:173‡, 188‡ |
| `creditCardFront` | 5: `components/PaymentOptionStripe/index.js`:111‡; `components/PaymentOptions/index.js`:354‡; `components/SavedCards/index.js`:176‡, 180‡, 184‡ |
| `geoAlt` | 2: `components/AddressList/index.js`:430‡, 444‡ |
| `heartBs` | 1: `components/FavoriteList/index.js`:230‡ |
| `receipt` | 11: `components/GiftCard/GiftCardOrdersList/index.js`:40‡; `components/MessagesListing/index.js`:275‡; `components/MultiOrdersDetails/index.js`:300‡, 307‡; `components/MyOrders/index.js`:218‡, 263‡; `components/OrderDetails/index.js`:1109‡, 1116‡; `components/OrderDetails/layouts/Tracking/index.js`:279‡, 286‡; `components/OrdersOption/index.js`:265‡ |
| `search` | 1: `components/BusinessListingSearch/index.js`:525‡ |
| `shop` | 11: `components/BusinessProductsList/index.js`:393‡; `components/BusinessProductsList/layouts/groceries/index.js`:289‡; `components/BusinessProductsListing/index.js`:682‡, 697‡, 714‡, 826‡, 832‡; `components/BusinessesListing/layouts/AppointmentsBusinessListing/index.js`:312‡; `components/BusinessesListing/layouts/OriginalBusinessesListing/index.js`:699‡; `components/Checkout/index.js`:899‡; `components/ProductForm/index.js`:1288‡ |
| `signpost` | 3: `components/AddressList/index.js`:454‡; `components/Cms/index.js`:59‡; `components/PageNotFound/index.js`:14‡ |
| `star` | 2: `components/BusinessReviews/index.js`:197‡; `components/HighestRated/index.js`:113‡ |
| `ticket` | 4: `components/GiftCard/PurchaseGiftCard/index.js`:70‡; `components/Promotions/index.js`:136‡, 143‡, 152‡ |
| `userAdd` | 2: `components/StudentOnboardingPopup/index.js`:58‡; `components/StudentsList/index.js`:31‡ |
| `wallet` | 5: `components/Wallets/CashWallet.js`:103‡, 159‡; `components/Wallets/CreditPointsWallet.js`:141‡, 197‡; `components/Wallets/index.js`:142‡ |
| `wifiOff` | 1: `components/NotNetworkConnectivity/index.js`:66‡ |

## 4. Imports directos de librerías de iconos e `<svg>` en línea

### 4.1 Imports directos fuera de `Icon/`

No hay ninguno de `react-icons` ni de `@meronex/icons` (ni de otras librerías de iconos) en la UI: todo pasa por `~ui-icon`. Lo más parecido, para que no sorprenda:

| archivo:línea | qué importa | estado / propuesta |
|---|---|---|
| `design-system/components/Dialog.jsx:8` | `X` de `lucide-react` | ya es Lucide; fuera de este inventario (design-system) |
| `design-system/preview/sections/ShareOptionsSection.jsx:7` | `Facebook`, `Whatsapp` de `~ui/src/components/Icon/brands` | ya son marcas del registro nuevo |
| `components/AddressOrderType/OrderIcon.jsx:2`, `styles/Chevron/index.js:4` | `orderContextGlyphs.js` / `chevronGlyphs.js` (Lucide) | ya migrados |
| `utils/bundledImages.js:14-15` | `left-arrow.svg`, `right-arrow.svg` como imágenes (`BUNDLED_IMAGES.leftArrow` / `rightArrow`) | son recursos de imagen, no iconos del registro; sin uso de UI localizado (solo se exponen en el mapa de imágenes) |

### 4.2 `<svg>` en línea (sin `design-system/` ni `Icon/`)

| archivo:línea | qué dibuja | uso | propuesta |
|---|---|---|---|
| `components/MultiCartsPaymethodsAndWallets/index.js:60` | `CreditCard2`: ilustración de tarjeta con mano (24×24, relleno `text_muted`, un solo `path`) | método de pago id 2 (`:51`) | duplicado exacto del de `PaymentOptions`; sin equivalente Lucide fiel: dejarlo como glifo propio (`custom/`) o usar `creditCard` |
| `components/PaymentOptions/index.js:59` | el mismo `CreditCard2` | `iconsById[2]` (`:119`) | igual que arriba; extraer una sola copia |
| `components/PaymentOptionWallet/utils.js:6` | `creditWalletIcon`: ficha 44×44 con borde gris y monedas apiladas (relleno multicolor `#D18A00`/`#FFCF23`) | wallet de efectivo, vía `getUtils().getIcon` en `OrderDetails/OrderRewardsBanner.js:16`, `Checkout/index.js:226`, `Cart/index.js:129` (zona Checkout I-1302 en el segundo) | ilustración de color, no un icono monocromo: `walletCash` (`Coins`) ya cubre el caso en `PaymentOptionWallet/index.js:125` |
| `components/PaymentOptionWallet/utils.js:66` | `loyaltyWalletIcon`: ficha 44×44 con un corazón relleno | wallet de puntos, mismos sitios | `walletLoyalty` (`Heart` relleno) |
| `components/BusinessReviews/utils.js:5` | `ratingIcon`: ilustración 171×171 (barras y estrella, colores propios) | cabecera del modal de ranking (`BusinessReviews/index.js:230`) | es una ilustración, no un icono; no migrar a Lucide |
| `components/Header/utils.js:5` | `AddressMapIcon`: ilustración de mapa 264×176 | modal del mapa de dirección (`Header/index.js:777`; zona Header I-1303) | es una ilustración; no migrar a Lucide |

CSS con SVG incrustado (no es `<svg>` JSX, pero dibuja iconos):

| archivo:línea | qué dibuja | propuesta |
|---|---|---|
| `styles/Checkbox/index.js:18` y `:21` (`iconMask`, `iconImage`) | cuadrado y cuadrado con check de Bootstrap como máscara/fondo del checkbox (`ICON_PATHS`, 16×16) | `checkboxBlank` (`Square`) y `checkSquare` (`SquareCheck`) de Lucide; el checkbox es un `<input>` pintado con máscara, va con los campos (P4) |
| `components/ServiceForm/styles.js:304` y `:315` | flechas anterior/siguiente del carrusel de fechas (caret de Bootstrap, `background-image`) | `ChevronLeft` / `ChevronRight` (como `CHEVRON_DOWN_MASK` de `Icon/chevronGlyphs.js`) |

## 5. Por carpeta / control

Una fila por carpeta de `components/` o `styles/` con apariciones del `<Icon>` antiguo (incluidas las `‡`, atribuidas a la carpeta que pasa el nombre). Las zonas con dueño no se migran en IC: sus iconos van con su control. «en Button/Input antiguo» es `P2 / P4`.

| carpeta | nº usos | nombres | zona/unidad dueña | en Button/Input antiguo (P2 / P4) |
|---|---|---|---|---|
| `CartPopover/` | 1 | `basketFilled` | Header (I-1303) | 0 / 0 |
| `Header/` | 8 | `caretUpFill`×2, `close`, `geoAltFill`, `locationFood`, `pinMapFill`×2, `search` | Header (I-1303) | 0 / 0 |
| `NavigationBar/` | 5 | `cardChecklist`, `house`, `search`, `shoppingCart`, `userOutline` | Header (I-1303) | 0 / 0 |
| `SidebarMenu/` | 22 | `bell`, `book`, `creditCardOutline`, `dollarCircle`, `environment`, `giftOutline`, `heartOutline`, `homeOutline`, `infoCircleOutline`, `login`, `menuBars`×2, `message`, `read`, `safety`, `searchOutline`, `shopping`, `starOutline`, `tags`, `translation`, `userAdd`, `userOutlineAi` | Header (I-1303) | 2 / 0 |
| `Modal/` | 1 | `closeLine` | Modal de producto (I-1309) | 0 / 0 |
| `ProductForm/` | 4 | `keyboardArrowLeft`, `keyboardArrowRight`, `playCircle`, `shop` | Modal de producto (I-1309) | 2 / 0 |
| `ProductOptionSubOption/` | 3 | `circleFill`, `circleHalf`×2 | Modal de producto (I-1309) | 0 / 0 |
| `BusinessProductsList/` | 3 | `closeX`, `shop`×2 | Barra de categorías/grid (G-TIENDA → I-1310) | 0 / 0 |
| `BusinessStickyHeader/` | 2 | `arrowLeft`, `basketFilled` | Barra de categorías/grid (G-TIENDA → I-1310) | 0 / 0 |
| `RenderProductsLayout/` | 6 | `arrowLeft`, `bag`×2, `menuAltRight`, `menuBars`, `search` | Barra de categorías/grid (G-TIENDA → I-1310) | 1 / 0 |
| `Checkout/` | 15 | `bag`×2, `check`×3, `clock`, `locationPin`, `shop`, `store`×2, `trash`, `warning`×4 | Checkout (I-1302) | 1 / 0 |
| `MultiCheckout/` | 4 | `arrowLeft`, `bag`, `warning`×2 | Checkout (I-1302) | 1 / 0 |
| `UserVerification/` | 2 | `envelope`×2 | Checkout (I-1302) | 0 / 2 |
| `AddressDetails/` | 1 | `pencil` | IC (sin dueño) | 1 / 0 |
| `AddressForm/` | 7 | `briefcase`, `heartOutline`, `home`, `locationPin`, `mapMarker`, `searchLoading`, `tag` | IC (sin dueño) | 0 / 0 |
| `AddressList/` | 5 | `geoAlt`×2, `pencil`, `signpost`, `trashFilled` | IC (sin dueño) | 2 / 0 |
| `AppleLogin/` | 1 | `apple` | IC (sin dueño) | 1 / 0 |
| `AutoScroll/` | 2 | `keyboardArrowLeft`, `keyboardArrowRight` | IC (sin dueño) | 2 / 0 |
| `BusinessBasicInformation/` | 12 | `arrowLeft`, `arrowLeftRight`, `clock`, `facebook`, `infoCircle`, `instagram`, `pinterest`, `search`, `snapchat`, `starFilled`, `tiktok`, `whatsapp` | IC (sin dueño) | 5 / 0 |
| `BusinessController/` | 11 | `basket`, `car`×2, `clock`, `crown`, `dot`×2, `mapMarker`, `star`×2, `truckDelivery` | IC (sin dueño) | 0 / 0 |
| `BusinessesListing/` | 10 | `closeX`, `filter`×2, `house`, `map`×2, `shop`×2, `shoppingBag`, `truckDelivery` | IC (sin dueño) | 4 / 0 |
| `BusinessInformation/` | 4 | `clock`×2, `closeMd`, `mapMarker` | IC (sin dueño) | 0 / 0 |
| `BusinessListingSearch/` | 7 | `arrowDown`, `arrowUp`, `circleFill`, `closeX`, `dot`×2, `search` | IC (sin dueño) | 0 / 0 |
| `BusinessPreorder/` | 1 | `arrowRight` | IC (sin dueño) | 1 / 0 |
| `BusinessProductsListing/` | 7 | `arrowLeft`, `bag`, `shop`×5 | IC (sin dueño) | 0 / 0 |
| `BusinessReservation/` | 1 | `bag` | IC (sin dueño) | 0 / 0 |
| `BusinessReviews/` | 3 | `search`, `star`, `starFilled` | IC (sin dueño) | 0 / 0 |
| `BusinessTypeFilter/` | 2 | `closeX`×2 | IC (sin dueño) | 0 / 0 |
| `BusinessTypes/` | 1 | `grid` | IC (sin dueño) | 0 / 0 |
| `CardBrand/` | 1 | `creditCard` | IC (sin dueño) | 0 / 0 |
| `Cart/` | 7 | `closeCircle`×3, `infoCircle`×4 | IC (sin dueño) | 0 / 0 |
| `CartContent/` | 1 | `bag` | IC (sin dueño) | 0 / 0 |
| `CartSidebar/` | 2 | `cart`, `closeMd` | IC (sin dueño) | 0 / 0 |
| `CartStoresListing/` | 1 | `bag` | IC (sin dueño) | 0 / 0 |
| `CitiesControl/` | 2 | `arrowRight`, `closeMd` | IC (sin dueño) | 0 / 0 |
| `Cms/` | 1 | `signpost` | IC (sin dueño) | 0 / 0 |
| `Confirm/` | 2 | `closeLine`×2 | IC (sin dueño) | 0 / 0 |
| `CouponControl/` | 7 | `closeCircle`, `closeOctagon`, `giftOutline`, `tag`×4 | IC (sin dueño) | 2 / 0 |
| `CustomOrderModal/` | 6 | `arrowRight`×2, `dashCircle`, `location`, `plusCircle`, `shoppingBag` | IC (sin dueño) | 4 / 0 |
| `DriverTips/` | 2 | `close`, `pencil` | IC (sin dueño) | 1 / 1 |
| `FacebookLogin/` | 1 | `facebook` | IC (sin dueño) | 1 / 0 |
| `FavoriteList/` | 1 | `heartBs` | IC (sin dueño) | 0 / 0 |
| `FeeBillRows/` | 1 | `infoCircle` | IC (sin dueño) | 0 / 0 |
| `GiftCard/` | 6 | `dotSmall`, `gift`×3, `receipt`, `ticket` | IC (sin dueño) | 0 / 0 |
| `GoogleLogin/` | 1 | `google` | IC (sin dueño) | 1 / 0 |
| `HeaderOption/` | 2 | `basketFilled`, `mapMarker` | IC (sin dueño) | 0 / 0 |
| `HighestRated/` | 1 | `star` | IC (sin dueño) | 0 / 0 |
| `HomeHero/` | 1 | `mapMarker` | IC (sin dueño) | 0 / 0 |
| `LoginForm/` | 3 | `boxArrowInRight`, `eyeFilled`, `eyeSlashFilled` | IC (sin dueño) | 0 / 3 |
| `LogoutButton/` | 1 | `logoutOutline` | IC (sin dueño) | 0 / 0 |
| `Messages/` | 10 | `cardImage`, `closeMd`×4, `closeOctagon`, `sendFilled`, `user`×3 | IC (sin dueño) | 5 / 2 |
| `MessagesListing/` | 1 | `receipt` | IC (sin dueño) | 0 / 0 |
| `MomentControl/` | 2 | `keyboardArrowLeft`, `keyboardArrowRight` | IC (sin dueño) | 0 / 0 |
| `MultiCart/` | 1 | `bag` | IC (sin dueño) | 0 / 0 |
| `MultiCartsPaymethodsAndWallets/` | 7 | `cash`, `creditCard`×2, `paypal`, `stripe`, `stripeCard`, `stripeS` | IC (sin dueño) | 0 / 0 |
| `MultiOrdersDetails/` | 3 | `receipt`×2, `user` | IC (sin dueño) | 0 / 0 |
| `MyOrders/` | 2 | `receipt`×2 | IC (sin dueño) | 0 / 0 |
| `NotNetworkConnectivity/` | 1 | `wifiOff` | IC (sin dueño) | 0 / 0 |
| `OrderDetails/` | 26 | `arrowRight`, `checkCircleFill`×4, `closeCircle`, `dislikeOutline`, `fullscreen`, `fullscreenExit`, `home`, `infoCircle`×4, `lifeBuoy`, `likeOutline`, `message`, `phone`×2, `receipt`×4, `store`×2, `truckDelivery` | IC (sin dueño) | 8 / 0 |
| `OrdersOption/` | 1 | `receipt` | IC (sin dueño) | 0 / 0 |
| `OrderSuccessModal/` | 2 | `clock`, `locationMarker` | IC (sin dueño) | 0 / 0 |
| `PageBanner/` | 2 | `keyboardArrowLeft`, `keyboardArrowRight` | IC (sin dueño) | 2 / 0 |
| `PageNotFound/` | 1 | `signpost` | IC (sin dueño) | 0 / 0 |
| `PaymentOptions/` | 8 | `cash`, `creditCard`×2, `creditCardFront`, `paypal`, `stripe`, `stripeCard`, `stripeS` | IC (sin dueño) | 0 / 0 |
| `PaymentOptionStripe/` | 2 | `creditCardFront`, `trash` | IC (sin dueño) | 1 / 0 |
| `PaymentOptionWallet/` | 2 | `walletCash`, `walletLoyalty` | IC (sin dueño) | 0 / 0 |
| `PreorderDateTimeSteps/` | 2 | `keyboardArrowLeft`, `keyboardArrowRight` | IC (sin dueño) | 2 / 0 |
| `ProductItemAccordion/` | 10 | `pencil`×4, `trashFilled`×6 | IC (sin dueño) | 2 / 0 |
| `Promotions/` | 3 | `ticket`×3 | IC (sin dueño) | 0 / 0 |
| `ReviewDriver/` | 3 | `closeMd`, `dislikeOutline`, `likeOutline` | IC (sin dueño) | 0 / 0 |
| `ReviewOrder/` | 4 | `arrowRight`, `closeMd`, `dislikeOutline`, `likeOutline` | IC (sin dueño) | 1 / 0 |
| `ReviewProduct/` | 3 | `closeMd`, `dislikeOutline`, `likeOutline` | IC (sin dueño) | 0 / 0 |
| `ReviewProfessional/` | 2 | `closeMd`, `user` | IC (sin dueño) | 0 / 0 |
| `RewardsBanner/` | 1 | `trophyFilled` | IC (sin dueño) | 0 / 0 |
| `SavedAddressItem/` | 4 | `briefcase`, `heartOutline`, `home`, `tag` | IC (sin dueño) | 0 / 0 |
| `SavedCards/` | 5 | `creditCard`, `creditCardFront`×3, `trash` | IC (sin dueño) | 1 / 0 |
| `SearchBar/` | 1 | `search` | IC (sin dueño) | 0 / 1 |
| `ServiceForm/` | 3 | `caretLeftFill`, `keyboardArrowLeft`, `keyboardArrowRight` | IC (sin dueño) | 2 / 0 |
| `SessionsList/` | 3 | `clockHistory`×2, `closeMd` | IC (sin dueño) | 1 / 0 |
| `SignUpBusiness/` | 2 | `eye`, `eyeInvisible` | IC (sin dueño) | 0 / 2 |
| `SignUpDriver/` | 2 | `eye`, `eyeInvisible` | IC (sin dueño) | 0 / 2 |
| `SignUpForm/` | 2 | `eyeFilled`, `eyeSlashFilled` | IC (sin dueño) | 0 / 2 |
| `SingleProfessionalCard/` | 1 | `infoCircle` | IC (sin dueño) | 0 / 0 |
| `SmsLogin/` | 1 | `sms` | IC (sin dueño) | 1 / 0 |
| `StudentOnboardingPopup/` | 1 | `userAdd` | IC (sin dueño) | 0 / 0 |
| `StudentsList/` | 1 | `userAdd` | IC (sin dueño) | 0 / 0 |
| `styles/Avatar/` | 1 | `user` | IC (sin dueño) | 0 / 0 |
| `styles/Choice/` | 2 | `radioChoiceOff`, `radioChoiceOn` | IC (sin dueño) | 0 / 0 |
| `styles/Rating/` | 4 | `starFilledAi`×3, `starOutline` | IC (sin dueño) | 0 / 0 |
| `styles/Stepper/` | 2 | `dashLg`, `plusLg` | IC (sin dueño) | 2 / 0 |
| `TaxBillRows/` | 1 | `infoCircle` | IC (sin dueño) | 0 / 0 |
| `UpsellingPage/` | 2 | `closeMd`, `plusSquareFill` | IC (sin dueño) | 2 / 0 |
| `UserDetails/` | 4 | `closeMd`×3, `pencil` | IC (sin dueño) | 3 / 0 |
| `UserProfileForm/` | 5 | `addressBook`, `image`, `pencil`, `person`, `unorderedList` | IC (sin dueño) | 1 / 0 |
| `Wallets/` | 8 | `trophy`, `wallet`×5, `walletCash`, `walletLoyalty` | IC (sin dueño) | 0 / 0 |
| `WalletTransactionItem/` | 2 | `arrowDown`, `arrowUp` | IC (sin dueño) | 0 / 0 |

Totales por zona:

| zona/unidad dueña | nº usos | P2 | P4 |
|---|---|---|---|
| Header (I-1303) | 36 | 2 | 0 |
| Modal de producto (I-1309) | 8 | 2 | 0 |
| Barra de categorías/grid (G-TIENDA → I-1310) | 11 | 1 | 0 |
| Checkout (I-1302) | 21 | 2 | 2 |
| Botón/spinner (F-1311) | 0 | 0 | 0 |
| IC (sin dueño) | 281 | 59 | 13 |
| **Total** | **357** | **66** | **15** |

Zonas con dueño que no tienen apariciones del `<Icon>` antiguo: `AddressOrderType/`, `OrderContextUI/`, `UserPopover/`, `ProductOption/`, `ProductIngredient/`, `ProductShare/`, `BusinessProductsCategories/`, `SingleProductCard/`, `UserFormDetails/`, `styles/Buttons/`, `styles/Spinner/`. (`ProductShare/` ya usa el `Icon` nuevo; `OrderContextUI/` y `AddressOrderType/` usan `OrderIcon`.)

## 6. Nombres sin uso en la web (candidatos a no migrar)

35 nombres sin ninguna aparición directa, resuelta ni por props en la UI (sin contar tests ni `design-system/`). Antes de retirarlos de `ICON_REGISTRY`/`LUCIDE_ICON_REGISTRY` comprueba los que el sistema de diseño u otros consumidores usan por nombre:

| nombre | antiguo | Lucide | equivalencia | otros consumidores que lo usan por nombre |
|---|---|---|---|---|
| `building` | `BsBuilding` · trazo | `Building2` | exacto | — |
| `calendar` | `BsCalendar3` · trazo | `Calendar` | exacto | `OrderIcon` (`orderContextGlyphs.js`) |
| `carFront` | `BsCarFront` · trazo | `CarFront` | exacto | `OrderIcon` (`orderContextGlyphs.js`) |
| `carSide` | `FaCarSide` · trazo | `Car` | aproximado ⚠️ | — |
| `cart3` | `BsCart3` · trazo | `ShoppingCart` | exacto | — |
| `cellphone` | `MdPhoneAndroid` · relleno | `Smartphone` | exacto (relleno→trazo) | — |
| `chat` | `BsChat` · trazo | `MessageSquare` | exacto | — |
| `check2` | `BsCheck2` · trazo | `Check` | exacto | — |
| `checkboxBlank` | `MdCheckBoxOutlineBlank` · trazo | `Square` | exacto | — |
| `checkOutline` | `AiOutlineCheck` · trazo | `Check` | exacto | — |
| `checkSquare` | `BiCheckSquare` · trazo | `SquareCheck` | exacto | — |
| `chevronDown` | `BsChevronDown` · trazo | `ChevronDown` | exacto | `Chevron` (`chevronGlyphs.js`) |
| `chevronLeft` | `BsChevronLeft` · trazo | `ChevronLeft` | exacto | `Chevron` (`chevronGlyphs.js`) |
| `chevronRight` | `BsChevronRight` · trazo | `ChevronRight` | exacto | `Chevron` (`chevronGlyphs.js`) |
| `clockOutline` | `FaRegClock` · trazo | `Clock` | exacto | `OrderIcon` (`orderContextGlyphs.js`) |
| `dashSquare` | `BsDashSquare` · trazo | `SquareMinus` | exacto | — |
| `dashSquareFill` | `BsDashSquareFill` · relleno | `SquareMinus` | exacto (relleno→trazo) | — |
| `exclamationFilled` | `AiFillExclamationCircle` · relleno | `CircleAlert` | exacto (relleno→trazo) | — |
| `eyeBs` | `BsEye` · trazo | `Eye` | exacto | — |
| `eyeSlashBs` | `BsEyeSlash` · trazo | `EyeOff` | exacto | — |
| `heartFilled` | `AiFillHeart` · relleno | `Heart` | exacto (sigue relleno) | `Icon` nuevo: `styles/FavoriteButton/index.js:102` |
| `link` | `HiLink` · relleno | `Link` | exacto (relleno→trazo) | design-system: `design-system/components/Button.jsx`; `Icon` nuevo: `components/ProductShare/index.js:66` |
| `lock` | `BsLock` · trazo | `Lock` | exacto | — |
| `menu` | `AiOutlineMenu` · trazo | `Menu` | exacto | — |
| `radioCheck` | `CgRadioCheck` · trazo | `Circle` | exacto | — |
| `radioChecked` | `RiRadioButtonFill` · relleno | `CircleDot` | exacto (relleno→trazo) | — |
| `radioCheckedAlt` | `CgRadioChecked` · trazo | `CircleDot` | exacto | — |
| `radioOff` | `IoRadioButtonOff` · trazo | `Circle` | exacto | — |
| `radioOn` | `IoRadioButtonOn` · relleno | `CircleDot` | exacto (relleno→trazo) | — |
| `radioUnchecked` | `MdRadioButtonUnchecked` · trazo | `Circle` | exacto | — |
| `share` | `FiShare2` · trazo | `Share2` | exacto | `Icon` nuevo: `components/ProductShare/index.js:51` |
| `shopFilled` | `AiFillShop` · relleno | `Store` | exacto (relleno→trazo) | — |
| `signOut` | `FaSignOutAlt` · relleno | `LogOut` | exacto (relleno→trazo) | — |
| `truckOutline` | `BsTruck` · trazo | `Truck` | exacto | `OrderIcon` (`orderContextGlyphs.js`) |
| `userFilled` | `RiUser2Fill` · relleno | `User` | exacto (relleno→trazo) | — |

«Sin uso» es respecto al `<Icon>` antiguo. Los que tienen otro consumidor (última columna) se dibujan ya con Lucide por otra vía (`OrderIcon`, `Chevron`, el `Icon` nuevo) y no dependen de la migración de IC; el resto no tiene ningún consumidor en el código inventariado.


## 7. Iconos sin equivalente exacto: opciones

Todo se ve en la preview (`design-system-preview.html`, secciones «Icons: legacy → Lucide map» e «Icons without an exact Lucide match: options»), con `?theme=defaults` y `?theme=grill`. El grosor es el de Lucide (2) en todos los glifos, también en los propios de las opciones B. Las 32 claves `exacto (relleno→trazo)` no necesitan elección: las cubre D9 A y se ven en el mapa (filtro «filled → stroke»).

| Grupo | Claves y dónde | A | B | Recomendación |
|---|---|---|---|---|
| Mitades de pizza | `circleHalf`, `circleFill` (`ProductOptionSubOption`, zona de I-1309) | Se quedan rellenas (el `CircleHalf` propio y el círculo relleno): excepción como el corazón y la estrella | A trazo: glifo propio con el diámetro y la mitad elegida rayada | **A**: el relleno es el dato (qué mitad lleva el ingrediente); rayado a 16 px no se lee |
| Rellenos que no son favorito ni valoración | `walletLoyalty` (monedero de puntos), `trophyFilled` (banner de recompensas), `circleFill` (inicio de la barra de `MaxSectionItem`) | A trazo (salen de `FILLED_ICONS`) | Siguen rellenos | **A**: es lo que pide D9 A; el color del favorito sigue distinguiendo el monedero |
| Carets | `caretLeftFill` (carrusel de días de `ServiceForm`), `caretUpFill` (Header, zona de I-1303) | `ChevronLeft` / `ChevronUp` de Lucide | Triángulo propio a trazo | **A**: un solo chevron en la web (D6 B) |
| Separador de metadatos | `dot` (`BusinessController`, `BusinessListingSearch`) | `Dot` de Lucide (punto) | Anillo pequeño propio a trazo (como el `GoDot` antiguo) | **A**: el separador no es información y Lucide lo tiene |
| Forma distinta en el registro Lucide | `closeOctagon` (cupón, mensajes), `fullscreen` (mapa del seguimiento) | `CircleX` y `Maximize2`: la forma del antiguo | `OctagonX` y `Maximize`: lo que tiene hoy `lucideRegistry.js` | **A**: corrige dos asignaciones del registro |
| Búsqueda de dirección cargando | `searchLoading` (`AddressForm`; en reposo es `mapMarker`) | `Search` estático | `LoaderCircle` estático | **A**: ya se distingue del reposo y no pide movimiento (un giro necesitaría un token de duración que no existe) |
| Zona del Header (el glifo; el cambio lo hace I-1303) | `cardChecklist` (pedidos, `NavigationBar`), `pinMapFill` (dirección), `menuAltRight` (`RenderProductsLayout`) | `ClipboardList`, `MapPinned`, `TextAlignEnd` | `ListChecks`, `MapPin`, `Menu` | **A** en los tres: `ClipboardList` se parece más a la tarjeta con lista; los otros dos son los de hoy |
| Indicador de elección única | `radioChoiceOff` / `radioChoiceOn` (`styles/Choice`, pieza de `PZ`) | `Circle` / `CircleDot` | `Circle` / `CircleCheck` | **A**: es la convención de un radio; el check se confunde con la casilla |
| Clave que no existe | `arrowLeftRight` (`BusinessInfoComponent.js:261`, botón «Cambiar de tienda»: hoy sin icono) | `ArrowLeftRight` | `ArrowRightLeft` | **B**: dos flechas opuestas es la metáfora de «cambiar»; una flecha doble se lee como «ancho» |

Para elegir basta con «A en todo», o con la letra de los grupos en los que no quieras la recomendación.

## 8. Cómo partir la implementación

Cuenta (sección 5): el `<Icon>` antiguo está en **99 archivos**. De ellos, 14 están en zonas con dueño y migran con su unidad: Header → I-1303; modal de producto → I-1309; barra y grid → I-1310; checkout → I-1302. Quedan **85 archivos** para IC, más el registro (`Icon/lucideRegistry.js`, `Icon/iconRegistry.js` y sus tests). En 46 de esos 85 hay algún icono dentro de un `Button` o un campo antiguo. Esos iconos se quedan con P2 o P4, y el resto del archivo sí migra. Además hay 14 tests con `vi.mock('~ui-icon')` que se revisan con su carpeta.

| Unidad | Archivos | Contenido | Choques |
|---|---|---|---|
| IC-0 Registro | `Icon/lucideRegistry.js`, `Icon/iconRegistry.js` (solo la clave nueva), `Icon/__tests__/lucideRegistry.test.js` (3) | Las elecciones de la sección 7: claves corregidas, `FILLED_ICONS` y `arrowLeftRight` | Ninguno: `Icon/` es de IC. Va primero, porque cambia los glifos que verán I-1303 e I-1309 al migrar |
| IC-1 Listado y tienda | `BusinessController`, `BusinessesListing`, `BusinessListingSearch`, `BusinessTypeFilter`, `BusinessTypes`, `HighestRated`, `HomeHero`, `CitiesControl`, `BusinessInformation`, `BusinessReviews`, `BusinessReservation`, `BusinessPreorder` (≈ 18) | Las tarjetas y filtros del listado | `BusinessBasicInformation` y `BusinessProductsListing` **no** entran: `BusinessProductsListing/index.js` lo cita 1309/1310, y la cabecera de la tienda la rediseña D-1310. Van con I-1310 |
| IC-2 Carrito y pago (fuera de Checkout) | `Cart`, `CartContent`, `CartSidebar`, `CartStoresListing`, `MultiCart`, `CouponControl`, `DriverTips`, `FeeBillRows`, `TaxBillRows`, `PaymentOptions`, `PaymentOptionStripe`, `PaymentOptionWallet`, `MultiCartsPaymethodsAndWallets`, `SavedCards`, `CardBrand`, `Wallets`, `WalletTransactionItem`, `GiftCard`, `ProductItemAccordion`, `UpsellingPage`, `RewardsBanner` (≈ 24) | Las filas y tarjetas de pago, cupón y monedero | Antes de abrir `Cart/`, comprobar que 1306 (G-CAPAS) lo cerró |
| IC-3 Pedidos y mensajes | `OrderDetails` (incluido `layouts/Tracking`), `MultiOrdersDetails`, `MyOrders`, `OrdersOption`, `OrderSuccessModal`, `ReviewOrder`, `ReviewDriver`, `ReviewProduct`, `ReviewProfessional`, `Messages`, `MessagesListing` (≈ 20, con 6 tests con mock) | El seguimiento, el historial y las reseñas | Ninguno conocido |
| IC-4 Cuenta, acceso y direcciones | `LoginForm`, `SignUpForm`, `SignUpBusiness`, `SignUpDriver`, `SmsLogin`, `AppleLogin`, `FacebookLogin`, `GoogleLogin`, `LogoutButton`, `UserDetails`, `UserProfileForm`, `SessionsList`, `AddressForm`, `AddressList`, `AddressDetails`, `SavedAddressItem`, `Promotions`, `FavoriteList` (≈ 18) | Los iconos fuera de los campos | Los iconos de campo (ojo de la contraseña, icono antepuesto) son de P4: en esta unidad casi todo va a P4 |
| IC-5 Resto y piezas legadas | `Cms`, `Confirm`, `PageBanner`, `PageNotFound`, `NotNetworkConnectivity`, `StudentOnboardingPopup`, `StudentsList`, `SingleProfessionalCard`, `ServiceForm`, `MomentControl`, `PreorderDateTimeSteps`, `CustomOrderModal`, `HeaderOption`, `AutoScroll`, `styles/Avatar`, `styles/Rating` (≈ 16) | Los sueltos | `styles/Choice` y `styles/Stepper` **no** entran: son piezas de `PZ` y sus iconos van con ellas |

- **Orden:** IC-0 primero. Después, IC-1 a IC-5 en cualquier orden, porque no comparten archivos entre sí ni con las zonas de I-1303 e I-1309. Una sola unidad IC abierta a la vez, por las líneas base de la guarda `icon`. Cada unidad cierra con su `pnpm design:baseline` en un commit aparte.
- **Regla por control:** un control que tiene un icono dentro de un `Button` o un campo antiguo lo deja entero para P2 o P4. Si ese control tiene más iconos fuera del botón, se quedan también con él para no mezclar estilos. Queda anotado como excepción en el PR.
- **Retirar el registro antiguo y `react-icons`:** solo cuando terminen P2, P4, PZ, I-1303, I-1309, I-1310 e I-1302. Será un commit propio, con el cambio del lockfile señalado.
