import fs from 'node:fs/promises'
import path from 'node:path'
import { websiteImageRoot } from './paths.js'

export const disableMotion = async (page) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `
  })
}

export const waitForDocumentationReady = async (page, readiness = {}, targetSelector, options = {}) => {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.readyState === 'complete')
  await page.evaluate(() => document.fonts?.ready)

  for (const selector of readiness.selectors || []) {
    await page.locator(selector).waitFor({ state: 'visible', timeout: readiness.timeout || 30000 })
  }

  if (targetSelector) {
    const viewportImages = options.imageScope === 'viewport'
    const imageLocator = viewportImages ? page.locator('img') : page.locator(targetSelector).locator('img')
    const brokenImages = await imageLocator.evaluateAll(async (images, { timeout, viewportImages }) => {
      const isVisibleForCapture = (image) => {
        const rects = [...image.getClientRects()]
        if (rects.length === 0) return false
        if (!viewportImages) return true
        return rects.some((rect) => (
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
        ))
      }
      const visibleImages = images.filter(isVisibleForCapture)
      return Promise.all(visibleImages.map((image) => {
        if (image.complete) return Promise.resolve(image.naturalWidth > 0 ? null : image.currentSrc || image.src || 'inline image')
        return new Promise((resolve) => {
          const finish = (broken) => {
            window.clearTimeout(timer)
            resolve(broken ? image.currentSrc || image.src || 'inline image' : null)
          }
          const timer = window.setTimeout(() => finish(true), timeout)
          const settle = () => {
            finish(image.naturalWidth === 0)
          }
          image.addEventListener('load', settle, { once: true })
          image.addEventListener('error', settle, { once: true })
        })
      }))
    }, { timeout: readiness.imageTimeout ?? 2000, viewportImages })

    const failures = brokenImages.filter(Boolean)
    if (failures.length > 0 && !readiness.allowBrokenImages) {
      throw new Error(`Visible documentation images failed to load:\n${failures.join('\n')}`)
    }
    if (failures.length > 0) {
      await imageLocator.evaluateAll((images, viewportImages) => {
        const isVisibleForCapture = (image) => {
          const rects = [...image.getClientRects()]
          if (rects.length === 0) return false
          if (!viewportImages) return true
          return rects.some((rect) => (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
          ))
        }
        images.filter((image) => isVisibleForCapture(image) && image.naturalWidth === 0).forEach((image) => {
          image.style.visibility = 'hidden'
          image.dataset.docImageState = 'unavailable'
        })
      }, viewportImages)
    }
  }
  await page.waitForTimeout(readiness.settleMs ?? 150)
}

export const captureSection = async ({ page, locator, filename, captureMode = 'section' }) => {
  await fs.mkdir(websiteImageRoot, { recursive: true })
  if (path.basename(filename) !== filename) throw new Error(`Capture filename must not contain a path: ${filename}`)
  const outputPath = path.resolve(websiteImageRoot, filename)
  const relativeOutput = path.relative(websiteImageRoot, outputPath)
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) {
    throw new Error(`Capture output escapes the Website image directory: ${filename}`)
  }
  if (captureMode === 'viewport') {
    await page.screenshot({ path: outputPath, animations: 'disabled', fullPage: false })
  } else {
    await locator.scrollIntoViewIfNeeded()
    await locator.screenshot({ path: outputPath, animations: 'disabled' })
  }
  return outputPath
}
