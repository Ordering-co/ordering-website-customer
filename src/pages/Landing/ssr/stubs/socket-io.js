// The server render opens no socket: `socket.io-client` is replaced by this inert one
// in the landing's SSR bundle (WebsocketContext imports it, nothing connects on the server).
export const io = () => ({ on () {}, emit () {}, close () {}, disconnect () {} })
export default io
