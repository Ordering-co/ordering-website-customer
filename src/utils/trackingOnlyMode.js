// Whether the site is tracking-only is the site setting `site.tracking_only`
// (isTrackingOnly, src/utils/siteSettings.js; docs/TRACKING_ONLY_MODE.md).

// The courier projects: their "Your order" tab shows the order number and
// comment instead of the costs (docs/TRACKING_ONLY_MODE.md)
export const COURIER_TRACKING_PROJECTS = ['quickiedelivery']

export const isCourierTrackingProject = (project) => !!project && COURIER_TRACKING_PROJECTS.some(key => project.includes(key))
