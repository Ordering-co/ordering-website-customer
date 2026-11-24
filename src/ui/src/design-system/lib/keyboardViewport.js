// On iOS Safari, and on Chrome for Android since 108, the on-screen keyboard (and its accessory bar) covers
// the layout viewport instead of shrinking it: a layer that is `fixed` to the screen runs under the keyboard,
// and its action (Login, Add to cart) is behind it. The part of the screen the person can see is
// the visual viewport. Who reads it: useKeyboardOpen (src/ui/hooks), mounted once in App, publishes
// `html[data-keyboard-open]` and `--keyboard-inset`; a Dialog or a Sheet does not follow the visual viewport
// itself, it keeps its size and pads its body by that inset (implementation notes; before, each layer resized itself).
// shortcut: the keyboard is told by the visual viewport being this much shorter than the layout one (a
// browser bar sliding away changes it by less); upgrade if a keyboard shorter than this shows up.
const KEYBOARD_MIN_HEIGHT = 120

/** Whether the keyboard covers the screen now. Zoomed in (a scale other than 1) is not the keyboard. */
export const keyboardCovers = (visual) => visual.scale === 1 && window.innerHeight - visual.height >= KEYBOARD_MIN_HEIGHT
