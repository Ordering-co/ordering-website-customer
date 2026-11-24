import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { BusinessInformation } from '../index'
import * as styles from '../styles'

const businessFixture = vi.hoisted(() => ({
  id: 1,
  name: 'Demo Store',
  slug: 'demo-store',
  logo: 'logo.png',
  enabled: true
}))

vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps' />
}))
vi.mock('~ui/src/components/ScheduleAccordion', () => ({
  ScheduleAccordion: () => <div data-testid='schedule-accordion' />
}))
// the real getGoogleMapImage builds the Mapbox failover's URL
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

vi.mock('~components/components/BusinessInformation', () => ({
  BusinessInformation: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      businessLocation={{ lat: 1, lng: 2 }}
      businessSchedule={[{ enabled: true, lapses: [] }]}
      businessPhotos={[]}
      businessVideos={[]}
      onClose={vi.fn()}
      {...rest}
    />
  )
}))

describe('BusinessInformation', () => {
  it('renders business name and schedule section', () => {
    const { getByText, getAllByTestId } = renderWithProviders(<BusinessInformation />)
    expect(getByText('Demo Store')).toBeInTheDocument()
    // the 7 days of the user's week
    expect(getAllByTestId('schedule-accordion')).toHaveLength(7)
  })

  it('a gallery photo and its enlarged view are named by their place and the business', async () => {
    const photos = [{ file: '/a.jpg' }, { file: '/b.jpg' }]
    const { getByAltText, findByRole } = renderWithProviders(<BusinessInformation businessPhotos={photos} />)
    expect(getByAltText('Photo 1 of Demo Store')).toHaveAttribute('src', '/a.jpg')
    fireEvent.click(getByAltText('Photo 2 of Demo Store'))
    expect((await findByRole('dialog')).querySelector('img')).toHaveAttribute('alt', 'Photo 2 of Demo Store')
  })

  it('the enlarged photo is the base Dialog: flush, centered on a phone, its doc marker, closed by its close', async () => {
    const photos = [{ file: '/a.jpg' }]
    const { getByAltText, findByRole, queryByRole } = renderWithProviders(<BusinessInformation businessPhotos={photos} />)
    fireEvent.click(getByAltText('Photo 1 of Demo Store'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(dialog.getAttribute('data-doc-section')).toBe('business-gallery-image-dialog')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(dialog.querySelector('.ui\\:p-none')).toBeTruthy()
    expect(dialog.parentElement.className).toContain('ui:max-mobile:p-lg')
    fireEvent.click(dialog.querySelector('[data-slot="dialog-close-button"]'))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})

it('leaves dismissal to the containing dialog rather than exporting a second close control', () => {
  expect(styles).not.toHaveProperty('ModalIcon')
})
