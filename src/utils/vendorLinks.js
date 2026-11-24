/**
 * The platform's own links that the public site still needs. They are set
 * here, not read from src/config.json: the config's `project_error_redirect_url`,
 * `url_dashboard` and `contact_email` still hold the old vendor brand and
 * would win.
 */

/** Where a host whose project does not exist goes. */
export const PROJECT_NOT_FOUND_REDIRECT_URL = 'https://www.ordering.co'

/** The dashboard a business or a driver signs in to after signing up (SignUpApproval). */
export const SIGNUP_DASHBOARD_URL = 'https://dashboard.ordering.co'

/** The support address shown after a business or a driver signs up (SignUpApproval). */
export const SIGNUP_CONTACT_EMAIL = 'support@ordering.co'
