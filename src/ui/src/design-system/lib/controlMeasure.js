import { componentVars } from './componentVars'

/**
 * The font of a base control's text, as declarations: the measure ("ch") of a box that sizes a control
 * (the slot of a Button, the cell of a field). `ch` is the width of "0" in the font of the element it is
 * written on, so a slot that caps a Button at 38ch takes the Button's own font to keep the cap it had
 * when the rule sat on the Button. It only reads `components.<component>`: nothing is written on the control.
 */
export const controlMeasureCss = (theme, component = 'button', { size } = {}) => {
  const vars = componentVars(theme, component, { size })
  const at = (name) => vars[`--ui-${component}-text-${name}`]
  return `font-family: ${at('family')}; font-size: ${at('size')}; font-weight: ${at('weight')};`
}
