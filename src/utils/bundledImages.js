/**
 * Images bundled with the web.
 *
 * - THEME_IMAGE_DEFAULTS: the default of each image of the theme
 *   (`images.<key>` of product.schema.json) the bundle has. buildAppTheme
 *   (src/utils/appTheme.js) puts it in `theme.values.images.<key>` when the theme
 *   leaves that image empty; a URL of the theme always wins. Read them with
 *   themeImage(theme, key).
 * - BUNDLED_IMAGES: the rest of the app's own images (card brands, order
 *   status, icons, arrows…), which are not theme; components import them
 *   from here.
 */

import leftArrow from '../assets/left-arrow.svg'
import rightArrow from '../assets/right-arrow.svg'

import delivered from '../assets/icons/delivered.png'
import driver from '../assets/icons/driver.png'
import home from '../assets/icons/home.png'
import store from '../assets/icons/store.png'
import pickUpIcon from '../assets/icons/pickup.png'

import categoryFood from '../assets/images/categories/category-food.jpg'
import categoryGroceries from '../assets/images/categories/category-groceries.jpg'
import categoryAlcohol from '../assets/images/categories/category-alcohol.jpg'
import categoryLaundry from '../assets/images/categories/category-laundry.jpg'

import delivery from '../assets/images/delivery-types/delivery.jpg'
import curbside from '../assets/images/delivery-types/curbside.jpg'
import driveThru from '../assets/images/delivery-types/drive_thru.jpg'
import eatIn from '../assets/images/delivery-types/eat_in.jpg'
import pickUp from '../assets/images/delivery-types/pickup.jpg'
import cateringDelivery from '../assets/images/delivery-types/catering_delivery.png'
import cateringPickup from '../assets/images/delivery-types/catering_pickup.png'

import productDummy from '../assets/images/dummies/product.jpg'
// Only the gift card pages draw this placeholder: a file, not base64 in the entry chunk
import giftCardDummy from '../assets/images/dummies/gift-card.png?url&no-inline'
import storeDummy from '../assets/images/dummies/store.jpg'

import orderStatus0 from '../assets/images/order/status-0.svg'
import orderStatus1 from '../assets/images/order/status-1.svg'
import orderStatus2 from '../assets/images/order/status-2.svg'
import orderStatus3 from '../assets/images/order/status-3.svg'
import orderStatus4 from '../assets/images/order/status-4.svg'
import orderStatus5 from '../assets/images/order/status-5.svg'
import orderStatus6 from '../assets/images/order/status-6.svg'
import orderStatus7 from '../assets/images/order/status-7.svg'
import orderStatus8 from '../assets/images/order/status-8.svg'
import orderStatus9 from '../assets/images/order/status-9.svg'
import orderStatus10 from '../assets/images/order/status-10.svg'
import orderStatus11 from '../assets/images/order/status-11.svg'
import orderStatus12 from '../assets/images/order/status-12.svg'
import orderStatus13 from '../assets/images/order/status-13.svg'
import orderStatus14 from '../assets/images/order/status-14.svg'
import orderStatus15 from '../assets/images/order/status-15.svg'
import orderStatus16 from '../assets/images/order/status-16.svg'
import orderStatus17 from '../assets/images/order/status-17.svg'
import orderStatus18 from '../assets/images/order/status-18.svg'
import orderStatus19 from '../assets/images/order/status-19.svg'
import orderStatus20 from '../assets/images/order/status-20.svg'
import orderStatus21 from '../assets/images/order/status-21.svg'

import logotype from '../assets/images/logotype.svg'
import logotypeInvert from '../assets/images/logotype-invert.svg'
import isotype from '../assets/images/isotype.svg'
import isotypeInvert from '../assets/images/isotype-invert.svg'

import amex from '../assets/images/amex.svg'
import applePay from '../assets/images/apple-pay.svg'
import googlePay from '../assets/images/google-pay.svg'
import paypal from '../assets/images/paypal.svg'
import businessSignUpHero from '../assets/images/business_signup.jpg'
import businessHero from '../assets/images/business-hero.jpg'
import businessSignUpBG from '../assets/images/business-signup-background.jpg'
import CongratulationApproval from '../assets/images/congratulation_approval.jpg'
import CongratulationNoApproval from '../assets/images/congratulation_no_approval.jpg'
import credit from '../assets/images/credit.jpg'
import deliveryIco from '../assets/images/delivery.svg'
import eatstreetScooter from '../assets/images/eatstreet-scooter.svg'
import diners from '../assets/images/diners.svg'
import discover from '../assets/images/discover.svg'
import driverCongratulationApproval from '../assets/images/driver_congratulation_approval.jpg'
import driverCongratulationNoApproval from '../assets/images/driver_congratulation_no_approval.jpg'
import driverSignUpBG from '../assets/images/driver-signup-background.jpg'
import driverSignUpHero from '../assets/images/driver-signup-hero.jpg'
import driverPng from '../assets/images/driver.png'
import mapDriver from '../assets/images/map-driver.png'
import mapPin from '../assets/images/map-pin.svg'
import emptyActiveOrders from '../assets/images/empty-active-orders.svg'
import emptyPastOrders from '../assets/images/empty-past-orders.svg'
import homeHeroMobile from '../assets/images/home-hero-mobile.jpg'
import homeHero from '../assets/images/home-hero.webp'
// the default home_hero, a 16:9 crop of homeHero (2560x1440)
import homeHeroWide from '../assets/images/home-hero-wide.webp'
import jcb from '../assets/images/jcb.svg'
import loyaltyLevel from '../assets/images/loyalty_level.jpg'
import mastercard from '../assets/images/mastercard.jpg'
import notFound404 from '../assets/images/not-found-404.svg'
import notFoundLighting from '../assets/images/not-found-lighting.svg'
import notFound from '../assets/images/not-found.svg'
import pickupIco from '../assets/images/pickup.svg'
import searchIcon from '../assets/images/search-icon.svg'
import unionpay from '../assets/images/unionpay.svg'
import visa from '../assets/images/visa.webp'
import giftCard from '../assets/images/gift-card.webp'
import noTransactionsIcon from '../assets/images/no-transactions.webp'
import walletCredits from '../assets/illustrations/wallet-credits.svg'
import walletPoints from '../assets/illustrations/wallet-points.svg'

// The custom order banner's photo (a delivery), served from the CDN: the
// bundle has no file of its own for it
const CUSTOM_ORDER_BANNER = 'https://cloud-assets.orderingplus.com/image/upload/projectcnew/iaex8mo4xlpuovii6asg/1774629480.jpg'

const logos = {
  logotype,
  logotypeInvert,
  isotype,
  isotypeInvert
}

export const BUNDLED_IMAGES = {
  logos,
  general: {
    leftArrow,
    rightArrow,
    amex,
    businessSignUpHero,
    businessHero,
    businessSignUpBG,
    CongratulationApproval,
    CongratulationNoApproval,
    credit,
    deliveryIco,
    eatstreetScooter,
    diners,
    discover,
    driverCongratulationApproval,
    driverCongratulationNoApproval,
    driverSignUpBG,
    driverSignUpHero,
    driverPng,
    emptyActiveOrders,
    emptyPastOrders,
    homeHeroMobile,
    homeHero,
    homeHeroWide,
    jcb,
    loyaltyLevel,
    mastercard,
    notFound404,
    notFoundLighting,
    notFound,
    pickupIco,
    searchIcon,
    unionpay,
    visa,
    giftCard,
    noTransactionsIcon,
    applePay,
    googlePay,
    paypal,
    mapPin: 'https://res.cloudinary.com/ditpjbrmz/image/upload/f_auto,q_auto,w_75/v1564675872/marker-customer_kvxric.png'
  },
  icons: {
    delivered,
    driver,
    home,
    store,
    pickUpIcon
  },
  order: {
    status0: orderStatus0,
    status1: orderStatus1,
    status2: orderStatus2,
    status3: orderStatus3,
    status4: orderStatus4,
    status5: orderStatus5,
    status6: orderStatus6,
    status7: orderStatus7,
    status8: orderStatus8,
    status9: orderStatus9,
    status10: orderStatus10,
    status11: orderStatus11,
    status12: orderStatus12,
    status13: orderStatus13,
    status14: orderStatus14,
    status15: orderStatus15,
    status16: orderStatus16,
    status17: orderStatus17,
    status18: orderStatus18,
    status19: orderStatus19,
    status20: orderStatus20,
    status21: orderStatus21
  },
  categories: {
    food: categoryFood,
    groceries: categoryGroceries,
    alcohol: categoryAlcohol,
    laundry: categoryLaundry
  },
  dummies: {
    product: productDummy,
    driverPhoto: 'https://res.cloudinary.com/demo/image/fetch/c_thumb,g_face,r_max/https://www.freeiconspng.com/thumbs/driver-icon/driver-icon-14.png',
    businessLogo: storeDummy,
    customerPhoto: 'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png',
    loyaltyLevel,
    giftCard: giftCardDummy
  },
  // Map markers (`map.*` defaults of the theme, 128×128)
  map: {
    driver: mapDriver,
    store: storeDummy,
    customer: mapPin
  },
  deliveryTypes: {
    delivery,
    curbside,
    driveThru,
    eatIn,
    pickUp,
    cateringDelivery,
    cateringPickup
  },
  // Multicolor artwork, shown as an <img> (not an icon: it keeps its own colors)
  illustrations: {
    walletCredits,
    walletPoints
  }
}

/**
 * `images.<key>` of the theme → its bundled default. A key left out has none:
 * empty in the theme, the spot shows no image or falls back as it decides.
 * The logos and the favicon are left out on purpose: without one of the
 * theme the brand depends on the host (src/utils/siteBranding.js: Ordering's
 * own logo on its domains, the white-label one elsewhere). Also
 * placeholder.business_header, empty.address_list, empty.sessions,
 * order_types.reservation, tracking.survey and app_icon, which the bundle
 * does not have, and map.store: its spot puts the business logo between the
 * theme's and the bundle's (src/utils/mapMarkers.js). And the empty states
 * (empty.not_found, empty.active_orders, empty.past_orders,
 * empty.transactions, empty.no_internet): without an image of the theme
 * those spots show none (an icon of the registry, not a bundled one).
 */
export const THEME_IMAGE_DEFAULTS = {
  home_hero: homeHeroWide,
  home_hero_mobile: homeHeroMobile,
  custom_order_banner: CUSTOM_ORDER_BANNER,
  'signup.business_background': businessSignUpBG,
  'signup.driver_background': driverSignUpBG,
  'signup.business_approved': CongratulationApproval,
  'signup.business_pending': CongratulationNoApproval,
  'signup.driver_approved': driverCongratulationApproval,
  'signup.driver_pending': driverCongratulationNoApproval,
  'placeholder.business_logo': storeDummy,
  'placeholder.product': productDummy,
  'placeholder.loyalty_level': loyaltyLevel,
  'placeholder.gift_card': giftCardDummy,
  'order_types.delivery': delivery,
  'order_types.pickup': pickUp,
  'order_types.eat_in': eatIn,
  'order_types.curbside': curbside,
  'order_types.drive_thru': driveThru,
  'order_types.catering_delivery': cateringDelivery,
  'order_types.catering_pickup': cateringPickup,
  'map.driver': mapDriver,
  'map.customer': mapPin
}
