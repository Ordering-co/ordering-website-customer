export const buildPwaPromptCopy = (t) => ({
  copyTitle: t('PWA_ADD_TO_HOME_SCREEN', 'Add to Home Screen'),
  copyBody: t(
    'PWA_ADD_TO_HOME_BODY',
    'This website has app functionality. Add it to your home screen to use it in fullscreen.'
  ),
  copyShareButtonLabel: t('PWA_SHARE_BUTTON', "1) Press the 'Share' button"),
  copyAddHomeButtonLabel: t('PWA_ADD_HOME_BUTTON', "2) Press 'Add to Home Screen'"),
  copyClosePrompt: t('PWA_CLOSE_PROMPT', 'Close')
})

// iOS browsers other than Safari (Chrome, Firefox, Edge) do not expose
// Safari's Share button, so the library's instructions ("1) Press the
// 'Share' button") would not apply.
const NON_SAFARI_IOS_BROWSER = /CriOS|FxiOS|EdgiOS/i

export const shouldShowIosPwaPrompt = ({
  ready,
  languageLoading,
  userAgent = ''
} = {}) => {
  if (!ready || languageLoading) return false
  return !NON_SAFARI_IOS_BROWSER.test(String(userAgent))
}

// The device check of react-ios-pwa-prompt, so its chunk loads only where it
// can show: the library keeps its first verdict in localStorage
// (`iosPwaPrompt.isiOS`), else iPhone / iPad / iPod or iPadOS, not standalone.
export const isIosPwaPromptDevice = ({
  userAgent = '',
  nav = typeof navigator !== 'undefined' ? navigator : {},
  storage = typeof window !== 'undefined' ? window.localStorage : null
} = {}) => {
  try {
    const stored = JSON.parse(storage?.getItem('iosPwaPrompt') ?? 'null')
    if (stored && typeof stored.isiOS === 'boolean') return stored.isiOS
  } catch (error) {}
  const isiOS = /iphone|ipad|ipod/.test(String(userAgent).toLowerCase())
  const isiPadOS = nav.platform === 'MacIntel' && nav.maxTouchPoints > 1
  const isStandalone = 'standalone' in nav && !!nav.standalone
  return (isiOS || isiPadOS) && !isStandalone
}
