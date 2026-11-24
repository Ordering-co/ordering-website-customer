// The public reads of the marketing home page (full website). Pure: no React, no window, so the
// browser hook (useStoreLanding) and the Cloudflare Worker (worker/landingData.js) share them.
// `ordering` is { root, appId, appInternalName }; `fetchImpl` lets the Worker add its timeout.

const FEATURED_LIMIT = 8
const REVIEWS_LIMIT = 3
const REVIEWS_MIN_RATING = 4
// order types to try for the featured dishes: delivery, pickup, dine in (a store that
// serves only one of them has no menu open for the others)
const FEATURED_ORDER_TYPES = [1, 2, 3]

export const BUSINESS_PARAMS = 'id,name,slug,logo,header,description,about,address,address_notes,location,phone,cellphone,schedule,timezone,open,today,gallery,reviews,delivery_time,pickup_time,facebook_profile,instagram_profile,tiktok_profile,whatsapp_number'

/** A read with the API's pagination, when it comes: `{ result, pagination }`. */
export const readPage = async (ordering, path, fetchImpl = fetch) => {
  const headers = { 'Content-Type': 'application/json', 'X-App-X': ordering?.appId, 'X-INTERNAL-PRODUCT-X': ordering?.appInternalName }
  Object.keys(headers).forEach((name) => headers[name] === undefined && delete headers[name])
  const response = await fetchImpl(`${ordering.root}/${path}`, { method: 'GET', headers })
  const { error, result, pagination } = await response.json()
  if (error) throw new Error(Array.isArray(result) ? result.join(' ') : String(result || response.status))
  return { result, pagination }
}

export const read = async (ordering, path, fetchImpl = fetch) => (await readPage(ordering, path, fetchImpl)).result

const minutes = (clock) => {
  const [hour, minute] = String(clock || '').split(':').map((part) => parseInt(part, 10))
  const total = hour * 60 + (minute || 0)
  return Number.isFinite(total) && total > 0 ? total : null
}

export const fetchServices = async (ordering, business, fetchImpl) => {
  const menus = await read(ordering, `business/${business.id}/menus?params=delivery,pickup,eatin,enabled`, fetchImpl)
  const serves = (service) => (menus || []).some((menu) => menu.enabled !== false && menu[service])
  return {
    delivery: { enabled: serves('delivery'), time: minutes(business.delivery_time) },
    pickup: { enabled: serves('pickup'), time: minutes(business.pickup_time) },
    eatin: { enabled: serves('eatin') }
  }
}

export const fetchFeatured = async (ordering, business, fetchImpl) => {
  let products = []
  let failures = 0
  let failure
  for (const type of FEATURED_ORDER_TYPES) {
    try {
      products = await read(ordering, `business/${business.id}/products?type=${type}&params=id,name,price,featured,images,slug,category_id`, fetchImpl)
    } catch (error) {
      failures += 1
      failure = error
      continue
    }
    if (products?.length) break
  }
  // an error only when no order type could be read
  if (failures === FEATURED_ORDER_TYPES.length) throw failure
  return (products || [])
    .filter((product) => product.featured)
    .slice(0, FEATURED_LIMIT)
    .map((product) => ({ id: product.id, name: product.name, price: product.price, image: product.images || null, slug: product.slug, category_id: product.category_id }))
}

// "Laura Smith" → "Laura S."
const reviewAuthor = (user) => {
  const name = String(user?.name || '').trim()
  const initial = String(user?.lastname || '').trim().charAt(0).toUpperCase()
  return name && initial ? `${name} ${initial}.` : name
}

// the mean of the criteria the reviewer rated (an unrated one is 0, not a bad grade)
const reviewRating = (review) => {
  const rated = [review.quality, review.delivery, review.service, review.package].map(Number).filter((value) => value > 0)
  return rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : 0
}

const reviewsCount = (business) => Number(business.reviews?.reviews_count ?? business.reviews?.reviews?.length ?? 0)

export const fetchReviews = async (ordering, business, fetchImpl) => {
  const count = reviewsCount(business)
  const summary = { average: Number(business.reviews?.total) || 0, count, recent: [] }
  if (!count) return summary
  const list = await read(ordering, `business/${business.id}/reviews?params=id,comment,quality,delivery,service,package,created_at,user&orderBy=-created_at&page=1&page_size=20`, fetchImpl)
  const recent = (list || [])
    .map((review) => ({ review, rating: reviewRating(review) }))
    .filter(({ review, rating }) => rating >= REVIEWS_MIN_RATING && String(review.comment || '').trim())
    .slice(0, REVIEWS_LIMIT)
    // only these fields leave the hook: never the reviewer's last name, photo, email or user
    .map(({ review, rating }) => ({ id: review.id, author: reviewAuthor(review.user), comment: String(review.comment).trim(), rating, createdAt: review.created_at }))
  return { ...summary, recent }
}

// Privacy: the API's `reviews` may carry the list of reviews with their `user`; the page keeps its
// summary only (the sections read `reviews.data`, which fetchReviews builds), so it is never cached or serialized.
const reviewsSummary = (reviews) => (reviews && typeof reviews === 'object'
  ? { total: reviews.total, reviews_count: Number(reviews.reviews_count ?? reviews.reviews?.length ?? 0) }
  : reviews)

/** The store `store` (id or slug) with the fields the page reads (its `reviews` reduced to `{ total, reviews_count }`). */
export const fetchBusiness = async (ordering, store, fetchImpl) => {
  const business = await read(ordering, `business/${encodeURIComponent(store)}?params=${BUSINESS_PARAMS}`, fetchImpl)
  return business && typeof business === 'object' && 'reviews' in business ? { ...business, reviews: reviewsSummary(business.reviews) } : business
}
