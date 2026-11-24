import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export const productRoot = path.resolve(currentDirectory, '../../..')
export const docsRoot = process.env.ORDERING_DOCS_ROOT || path.resolve(productRoot, '../ordering-docs')
export const websiteImageRoot = path.join(docsRoot, 'static/img/docs/website')

export const resolveProductPath = (...segments) => path.join(productRoot, ...segments)
export const resolveDocsPath = (...segments) => path.join(docsRoot, ...segments)
