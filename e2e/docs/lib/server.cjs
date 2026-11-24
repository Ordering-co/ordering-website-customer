const APP_HOST = '127.0.0.1'
// E2E_APP_PORT lets two checkouts run Playwright on the same machine without sharing a port.
const APP_PORT = Number(process.env.E2E_APP_PORT) || 3137

exports.APP_HOST = APP_HOST
exports.APP_PORT = APP_PORT
exports.APP_ORIGIN = `http://${APP_HOST}:${APP_PORT}`
exports.APP_WS_ORIGIN = `ws://${APP_HOST}:${APP_PORT}`
