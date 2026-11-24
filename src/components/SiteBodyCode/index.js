import parse from 'html-react-parser'

// The site's body code (third_party_code.body) as React nodes. Loaded lazily
// from App: html-react-parser is only needed with consent and a body code.
export const SiteBodyCode = ({ html }) => parse(html, {
  // <script> tags are executed exactly once by App's effect. Skip them here
  // so React-mounted scripts don't double-fire analytics.
  // html-react-parser: null removes the node; <> </> would leave empty fragments.
  replace: (domNode) => (domNode.name === 'script' ? null : undefined)
})

export default SiteBodyCode
