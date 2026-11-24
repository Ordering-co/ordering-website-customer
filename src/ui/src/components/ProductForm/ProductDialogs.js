import React from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~ui/src/design-system/components/Dialog'

/**
 * A window the product form opens over the product's own (login, address, the maximum alert): the
 * design system's Dialog, nested in the product's, so Base UI stacks it above (the later one opened is
 * on top) and gives Escape and the outside press to the top layer only.
 * `title`: shown in a header (it names the window); without one, `label` names it.
 * `closeOnBackdrop`: false leaves a press outside without effect (the window closes by its button or Escape).
 * `width`, `size` and `phone` are the DialogContent's.
 */
export const ProductDialog = ({ open, onClose, title, label, closeOnBackdrop = true, children, ...content }) => (
  <Dialog
    open={open}
    onOpenChange={(next, details) => {
      if (next) return
      if (!closeOnBackdrop && details?.reason === 'outside-press') return details.cancel()
      onClose?.()
    }}
  >
    <DialogContent aria-label={title ? undefined : label} {...content}>
      {title && <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>}
      {children}
    </DialogContent>
  </Dialog>
)

/**
 * The alert of the form (the maximum quantity, a failed add): a small Dialog with its title, its
 * messages (already translated) and one Accept. `content` stays while the window leaves, so it does not empty as it fades.
 */
export const ProductAlert = ({ open, title, content = [], onClose, onAccept = onClose, acceptText }) => {
  const [, t] = useLanguage()
  return (
    <ProductDialog open={open} onClose={onClose} title={title} size='sm' phone='sheet' closeOnBackdrop={false} data-doc-section='product-alert'>
      {content.map((item, index) => <DialogDescription key={index}>{item}</DialogDescription>)}
      <DialogFooter>
        <Button color='primary' data-doc-control='product-alert-accept' onClick={onAccept}>{acceptText ?? t('ACCEPT', 'Accept')}</Button>
      </DialogFooter>
    </ProductDialog>
  )
}
