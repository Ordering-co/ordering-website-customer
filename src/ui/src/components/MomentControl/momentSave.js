// Whether a picker's Save of the order time is in flight. The order alert
// reads it when it opens, to know it opened for the rejection of that Save and say it was
// the time; OrderMomentDraft clears it once the Save has settled, whether it was
// rejected with an alert or without one.
let pending = false

export const markMomentSave = (value) => { pending = value }
export const isMomentSavePending = () => pending
