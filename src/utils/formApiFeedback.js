const errorsAsList = (value) => Array.isArray(value) ? value : value == null ? [] : [value]

// Only recognized codes enter the UI. Legacy endpoints may return a localized
// sentence with neither a code nor a field, which goes to the supplied fallback.
function formMessage (t, code) {
  switch (code) {
    case 'ERROR_AUTH_CREDENTIALS':
      return t('FORM_LOGIN_CREDENTIALS', 'Check your sign-in details and try again.')
    case 'ERROR_AUTH_LIMIT_REACHED':
      return t('FORM_LOGIN_RATE_LIMIT', 'Too many attempts. Wait a moment and try again.')
    case 'ERROR_AUTH_DISABLED':
      return t('FORM_LOGIN_DISABLED', 'This account is disabled.')
    case 'ERROR_RESET_ERROR':
      return t('FORM_RESET_LINK_INVALID', 'This password reset link is invalid or expired. Request a new one.')
    case 'ERROR_AUTH_SMS_TOKEN':
    case 'ERROR_VERIFICATION_CODE_INVALID':
      return t('FORM_VERIFICATION_CODE_INVALID', 'Check the verification code or request a new one.')
    case 'ERROR_WAS_REVIEWED':
    case 'ERROR_WAS_REVIEWED_ALL':
      return t('FORM_REVIEW_ALREADY_SENT', 'A review has already been submitted.')
    case 'VALIDATION_ERROR_AT_LEAST_ONE_REVIEW':
      return t('REVIEW_QUALIFICATION_REQUIRED', 'Review qualification is required')
    case 'ERROR_REVIEW_REGISTER':
      return t('FORM_REVIEW_NOT_SENT', 'We couldn’t submit your review. Please try again.')
    case 'ERROR_ORDER_MESSAGE_REGISTER':
      return t('FORM_MESSAGE_NOT_SENT', 'We couldn’t send your message. Please try again.')
    case 'RECAPTCHA_VALIDATION_IS_REQUIRED':
      return t('RECAPTCHA_VALIDATION_IS_REQUIRED', 'The ReCaptcha validation is required.')
    default:
      return null
  }
}

// The API's duplicate-account rule, by the codes it returns or, when it sends only its sentence, by that
// sentence. The sentence can carry another account's masked email: it is read, never shown.
const DUPLICATE_FIELD = { email: 'email', cellphone: 'cellphone', mobile_phone: 'cellphone' }
const TAKEN_SENTENCE = /already been taken/i
const duplicateOf = (code) => {
  if (typeof code !== 'string') return null
  const [field, rule] = code.split('.')
  return rule === 'unique' ? DUPLICATE_FIELD[field] ?? null : null
}
const takenSentenceAsCode = (text) => {
  if (typeof text !== 'string' || !TAKEN_SENTENCE.test(text)) return text
  return /e-?mail/i.test(text) ? 'email.unique' : /phone/i.test(text) ? 'cellphone.unique' : text
}

const duplicateMessage = (t, field) => field === 'email'
  ? t('FORM_EMAIL_IN_USE', 'This email is already in use.')
  : t('FORM_PHONE_IN_USE', 'This phone number is already in use.')

function fieldMessage (t, field, rule, form) {
  if (rule === 'unique' && duplicateOf(`${field}.${rule}`)) return duplicateMessage(t, duplicateOf(`${field}.${rule}`))
  if (field === 'email' && rule === 'email') return t('INVALID_ERROR_EMAIL', 'Invalid email address')
  if (field === 'cellphone' && ['regex', 'phone'].includes(rule)) return t('INVALID_PHONE_NUMBER', 'Invalid phone number')
  if (form === 'chat' && field === 'comment' && rule === 'max') return t('FORM_MESSAGE_TOO_LONG', 'Shorten your message and try again.')
  if (field === 'code' && rule === 'invalid') return formMessage(t, 'ERROR_VERIFICATION_CODE_INVALID')
  return t('FORM_CHECK_FIELD', 'Check this field and try again.')
}

// softDuplicates: the duplicate fields ('email', 'cellphone') the form draws its own notice for. They come back in
// `duplicates` (the form tells the guest to sign in) and add no field error or message; any other duplicate is
// told with its translated sentence.
export function getFormApiFeedback (t, response, { fields = [], fallback, form, softDuplicates = [] } = {}) {
  const result = response?.result
  const explicitCodes = errorsAsList(response?.error_codes)
  const reportedFields = response?.errors ?? (result && !Array.isArray(result) && typeof result === 'object' ? result : null)
  const fieldErrors = {}
  const messages = new Set()
  const codes = explicitCodes.length ? [...explicitCodes] : errorsAsList(result).filter((code) => typeof code === 'string').map(takenSentenceAsCode)
  const duplicates = new Set()
  let softened = false
  const otherwise = () => fallback ?? t('TRY_AGAIN', 'Please try again')

  const reportedFieldNames = reportedFields && !Array.isArray(reportedFields) && typeof reportedFields === 'object'
    ? Object.keys(reportedFields)
    : []
  for (const field of reportedFieldNames) {
    const taken = errorsAsList(reportedFields[field]).some((text) => typeof text === 'string' && TAKEN_SENTENCE.test(text))
    if (taken && DUPLICATE_FIELD[field]) codes.push(`${field}.unique`)
    else if (fields.includes(field)) fieldErrors[field] = fieldMessage(t, field)
  }

  let recognizedCode = false
  for (const code of codes) {
    const duplicate = duplicateOf(code)
    if (duplicate) {
      duplicates.add(duplicate)
      if (softDuplicates.includes(duplicate)) {
        softened = true
        recognizedCode = true
        continue
      }
    }
    const [field, rule] = code === 'ERROR_VERIFICATION_CODE_INVALID'
      ? ['code', 'invalid']
      : typeof code === 'string' ? code.split('.') : []
    if (rule && fields.includes(field)) {
      fieldErrors[field] = fieldMessage(t, field, rule, form)
      recognizedCode = true
    } else {
      const message = duplicate ? duplicateMessage(t, duplicate) : formMessage(t, code)
      if (message) recognizedCode = true
      messages.add(message ?? otherwise())
    }
  }

  if (!(explicitCodes.length && recognizedCode) && reportedFieldNames.some((field) => !fields.includes(field))) {
    messages.add(otherwise())
  }

  return {
    fields: fieldErrors,
    message: messages.size ? Array.from(messages).join(' ') : Object.keys(fieldErrors).length || softened ? null : otherwise(),
    ...(duplicates.size ? { duplicates: Array.from(duplicates) } : {})
  }
}

export function applyFormApiErrors (t, response, fields, setError, options) {
  const feedback = getFormApiFeedback(t, response, { ...options, fields })
  options?.onDuplicates?.(feedback.duplicates ?? [])
  for (const [name, message] of Object.entries(feedback.fields)) {
    setError(name, { type: 'server', message })
  }
  return feedback.message
}
