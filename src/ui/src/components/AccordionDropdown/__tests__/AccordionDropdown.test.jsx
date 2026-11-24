import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { AccordionDropdown } from '../index'

const windowSize = vi.hoisted(() => ({ width: 1280, height: 800 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => windowSize }))

describe('AccordionDropdown', () => {
  it('renders subcategories when open', () => {
    const { getByText } = renderWithProviders(
      <AccordionDropdown
        item={{ name: 'Produce', subcategories: [{ id: 1, name: 'Fruit' }] }}
        isOpen
        isSelected={false}
        handleClickItem={vi.fn()}
        IterateCategories={() => <div>Fruit list</div>}
      />
    )
    expect(getByText('Produce')).toBeInTheDocument()
    expect(getByText('Fruit list')).toBeInTheDocument()
  })

  it('calls handleClickItem when header is clicked', () => {
    const handleClickItem = vi.fn()
    const { getByText } = renderWithProviders(
      <AccordionDropdown
        item={{ name: 'Dairy', subcategories: [] }}
        isOpen={false}
        isSelected={false}
        handleClickItem={handleClickItem}
        IterateCategories={() => null}
      />
    )
    fireEvent.click(getByText('Dairy'))
    expect(handleClickItem).toHaveBeenCalledWith(false)
  })

  it('its title is a real button that says whether it is open, with the disclose chevron (chevronDown)', () => {
    const render = (isOpen) => renderWithProviders(
      <AccordionDropdown
        item={{ name: 'Bakery', subcategories: [] }}
        isOpen={isOpen}
        isSelected={false}
        handleClickItem={vi.fn()}
        IterateCategories={() => null}
      />
    )
    const closed = render(false)
    const title = closed.container.querySelector('.accordion-title')
    expect(title.tagName).toBe('BUTTON')
    expect(title).toHaveAttribute('type', 'button')
    expect(title).toHaveAttribute('aria-expanded', 'false')
    expect(title.querySelector('svg.lucide-chevron-down')).not.toBeNull()
    closed.unmount()
    expect(render(true).container.querySelector('.accordion-title')).toHaveAttribute('aria-expanded', 'true')
  })

  describe('on small screens, where the list is alone', () => {
    const renderOpen = (width, handleClickItem = vi.fn()) => {
      windowSize.width = width
      return renderWithProviders(
        <AccordionDropdown
          item={{ name: 'Laundry', subcategories: [{ id: 1, name: 'Wash' }] }}
          isOpen
          isSelected={false}
          handleClickItem={handleClickItem}
          IterateCategories={() => <div>Wash</div>}
        />
      )
    }

    it('the title has only its chevron (no select mark); "All" first opens the whole category', () => {
      const handleClickItem = vi.fn()
      const { container, getByText } = renderOpen(390, handleClickItem)
      const title = container.querySelector('.accordion-title')
      expect(title.lastElementChild.children).toHaveLength(1)
      const all = container.querySelector('.accordion-content .accordion-all')
      expect(all).toHaveTextContent('All')
      expect(all.nextSibling).toBe(getByText('Wash'))
      fireEvent.click(all)
      expect(handleClickItem).toHaveBeenCalledWith(true)
    })

    it('beside the products, no "All": the title selects the category', () => {
      const { container } = renderOpen(1280)
      expect(container.querySelector('.accordion-all')).toBeNull()
    })
  })
})
