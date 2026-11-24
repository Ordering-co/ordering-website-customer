import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { RadioGroup } from '~ui/src/design-system/components/Checkbox'

// The radiogroup of a single-choice option, for ProductOption to put around its sub-options: one
// group of radios (arrows move and choose, one tab stop). Every single-choice row inside it joins
// instead of making a group of its own.
const SubOptionGroupContext = createContext(null)

export const useSubOptionGroup = () => useContext(SubOptionGroupContext)

/**
 * `value`: the id of the chosen sub-option (any other value, or none, is "nothing chosen").
 * `aria-label`: the option's name. The rest goes to the design system's `RadioGroup` (`render`
 * puts the option's own wrapper as the group). A row chosen by the arrows toggles itself with
 * its own handler (the one a click calls), so the group needs nothing else.
 */
export const SubOptionRadioGroup = ({ value, ...props }) => {
  const choose = useRef(new Map())
  const group = useMemo(() => ({
    join: (id, handler) => {
      choose.current.set(id, handler)
      return () => choose.current.delete(id)
    }
  }), [])
  return (
    <SubOptionGroupContext.Provider value={group}>
      <RadioGroup {...props} value={value == null ? '' : String(value)} onValueChange={(id) => choose.current.get(id)?.()} />
    </SubOptionGroupContext.Provider>
  )
}

// A row joins the group of its ancestor, if any; `current()` is its latest handler
export const useJoinSubOptionGroup = (id, current) => {
  const group = useSubOptionGroup()
  const latest = useRef(current)
  latest.current = current
  useEffect(() => group?.join(String(id), () => latest.current()), [group, id])
  return !!group
}
