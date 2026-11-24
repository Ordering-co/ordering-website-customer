import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../ui/src/styles/__tests__/themeTestUtils'

// Each part of A's sections shows the store it was given: what is under test is the map's wiring
vi.mock('../Hero', () => ({ HeroSection: ({ store }) => <p>hero:{store}</p> }))
vi.mock('../Featured', () => ({ FeaturedSection: ({ store }) => <p>featured:{store}</p> }))
vi.mock('../About', () => ({ AboutSection: ({ store }) => <p>about:{store}</p> }))
vi.mock('../Services', () => ({ ServicesSection: ({ store }) => <p>services:{store}</p> }))
vi.mock('../Gallery', () => ({ GallerySection: ({ store }) => <p>gallery:{store}</p> }))
vi.mock('../Reviews', () => ({ ReviewsSection: ({ store }) => <p>reviews:{store}</p> }))
vi.mock('../Visit', () => ({ VisitSection: ({ store }) => <p>visit:{store}</p> }))
vi.mock('../../chrome/Header', () => ({ LandingHeader: ({ store }) => <p>header:{store}</p> }))
vi.mock('../../chrome/Footer', () => ({ LandingFooter: ({ store }) => <p>footer:{store}</p> }))
vi.mock('../App', () => ({ AppSection: () => <p>app</p> }))

const { default: oneStore } = await import('../oneStore')

const site = themeWithValues((values) => {
  values.site.mode = 'single_store'
  values.site.business_slug = 'casa-lupita'
})

describe('the one-store map', () => {
  it('has the sections of the page and its header and footer', () => {
    expect(Object.keys(oneStore).sort()).toEqual(['Footer', 'Header', 'about', 'app', 'featured', 'gallery', 'hero', 'reviews', 'services', 'visit'])
  })

  it.each(['Header', 'hero', 'featured', 'about', 'services', 'gallery', 'reviews', 'visit', 'Footer'])('%s is tied to the site\'s store', (key) => {
    const Part = oneStore[key]
    renderWithProviders(<Part />, { theme: site })
    expect(screen.getByText(`${key === 'Header' ? 'header' : key === 'Footer' ? 'footer' : key}:casa-lupita`)).toBeInTheDocument()
  })

  it('the app section does not depend on the store', () => {
    const Part = oneStore.app
    renderWithProviders(<Part />, { theme: site })
    expect(screen.getByText('app')).toBeInTheDocument()
  })
})
