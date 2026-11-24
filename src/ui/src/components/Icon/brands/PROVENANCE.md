# Procedencia de los iconos de marca

Los trazados vienen de Simple Icons, licencia CC0 1.0 (dominio público): https://simpleicons.org/ y https://creativecommons.org/publicdomain/zero/1.0/.
Se tomaron de `react-icons` 5.7.0, módulo `react-icons/si`, que empaqueta Simple Icons **12.14.0** (versión indicada en el README de `react-icons`). No se añadió ninguna dependencia nueva.

La licencia CC0 cubre el dibujo, no la marca: los logotipos siguen siendo marcas de sus dueños y se usan solo para identificar el método de pago o la red social.

| Componente | Nombre en el registro | Slug de Simple Icons | Componente de `react-icons/si` |
|---|---|---|---|
| `Apple` | `apple` | `apple` | `SiApple` |
| `Facebook` | `facebook` | `facebook` | `SiFacebook` |
| `Google` | `google` | `google` | `SiGoogle` |
| `Instagram` | `instagram` | `instagram` | `SiInstagram` |
| `Paypal` | `paypal` | `paypal` | `SiPaypal` |
| `Pinterest` | `pinterest` | `pinterest` | `SiPinterest` |
| `Snapchat` | `snapchat` | `snapchat` | `SiSnapchat` |
| `Stripe` | `stripe` | `stripe` | `SiStripe` |
| `StripeS` | `stripeS` | `stripe` (alias de `Stripe`) | `SiStripe` |
| `StripeCard` | `stripeCard` | `stripe` dentro de un marco de tarjeta propio | `SiStripe` |
| `Tiktok` | `tiktok` | `tiktok` | `SiTiktok` |
| `Whatsapp` | `whatsapp` | `whatsapp` | `SiWhatsapp` |

## Cambios respecto al original

- Un solo `<path>` por icono, `viewBox="0 0 24 24"` y `fill="currentColor"` (monocromo: la web es white-label y el color lo pone el tema).
- Cada trazado se escala y centra con `transform` para que su caja ocupe como máximo 20x20 dentro del 24x24, el área útil de Lucide (2 px de margen). Simple Icons llena los 24 px y, sin esto, un logo se vería más grande que los iconos de trazo que lo rodean. El `d` del trazado no se modificó.
- Simple Icons solo tiene la «S» de Stripe (no el logotipo con el texto): `stripe` y `stripeS` son el mismo glifo.
- `StripeCard` es la «S» a 8 px de alto dentro de un anillo de tarjeta dibujado a mano con las proporciones de Lucide (marco de 2 px, radio 3, `fill-rule: evenodd`).

## Cómo actualizar

Cambiar la versión de `react-icons` no actualiza estos archivos: son copias. Para refrescar uno, tomar el `d` de su componente `Si*`, medir su caja (`getBBox`) y recalcular el `transform` para que quepa en 20x20 centrado en (12, 12).
