// The icon of each tag of an address (`~ui-icon` registry names): the address
// form's tag buttons and the saved address items read it from here, so a tag
// has the same icon everywhere.
export const ADDRESS_TAG_ICONS = {
  home: 'home',
  office: 'briefcase',
  other: 'tag'
}

// `favorite` is a tag the form no longer offers: an address saved with it reads
// as "Other" (the stored value is not rewritten unless the user picks a tag).
export const addressTagName = (tag) => (tag === 'favorite' ? 'other' : tag)

// The icon of an address's tag; one without a tag (or with one the form does
// not offer) is labelled "Other" and takes its icon.
export const addressTagIcon = (tag) => ADDRESS_TAG_ICONS[tag] || ADDRESS_TAG_ICONS.other
