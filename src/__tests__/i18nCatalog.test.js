import { describe, expect, it } from 'vitest'
import translations from '../../i18n/translations.json'
import i18nConfig from '../../i18n/config.json'

// Texts the catalog had machine-translated with the wrong sense: CLOSE as
// "near" / "closed" (es "Cerca", it "Vicino", tr "Kapalı"…), the actions as
// nouns, adjectives or other verbs (CLEAR as "clear, evident", BACK as the
// body's back, REORDER as "rearrange", CHECKOUT as "verify"…), and the
// names of the days and months (We → "we", Fri → "father", Sun → "the sun",
// May → "can"…). Each one now as a button, a calendar or a date says it.
// ORDER and GROUP_ORDER as a command or a sequence (de "Befehl", nl
// "Volgorde", tr "Grup Sırası"), INVOICE_NO as the word "no" (de "NEIN.") and
// GIFT_CARD_TO as the preposition "to" where it labels a gift card's recipient.
// Likewise the other "order" texts (fr "Ordres", ar "أوامري", bg "заповеди").
const FIXED = {
  CLOSE: { es: 'Cerrar', it: 'Chiudi', da: 'Luk', nl: 'Sluiten', ar: 'إغلاق', el: 'Κλείσιμο', bg: 'Затвори', tr: 'Kapat' },
  BACK: { fr: 'Retour', nl: 'Terug', ar: 'رجوع' },
  CLEAR: { es: 'Borrar', fr: 'Effacer', it: 'Cancella', de: 'Löschen', pt: 'Limpar', da: 'Ryd', nl: 'Wissen', ar: 'مسح', el: 'Εκκαθάριση', bg: 'Изчисти', tr: 'Temizle' },
  CHANGE: { fr: 'Modifier', da: 'Skift', nl: 'Wijzigen', ar: 'تغيير', bg: 'Промени', tr: 'Değiştir' },
  CONTINUE: { it: 'Continua', de: 'Weiter', da: 'Fortsæt', ar: 'متابعة', el: 'Συνέχεια', tr: 'Devam et' },
  CANCEL: { it: 'Annulla', de: 'Abbrechen', da: 'Annuller', ar: 'إلغاء', tr: 'İptal' },
  OK: { ar: 'حسنًا' },
  UPDATE: { fr: 'Mettre à jour', da: 'Opdater', bg: 'Актуализирай', tr: 'Güncelle' },
  UPDATE_SPOT_NUMBER: { fr: 'Mettre à jour', da: 'Opdater', bg: 'Актуализирай', tr: 'Güncelle' },
  CANCELLATION_SEND_BUTTON: { it: 'Invia', de: 'Senden', da: 'Send', ar: 'إرسال', el: 'Αποστολή', tr: 'Gönder' },
  COOKIE_GOT_IT: { it: 'Ho capito', de: 'Verstanden', da: 'Forstået', nl: 'Begrepen', ar: 'فهمت', bg: 'Разбрах' },
  CHECKOUT: { es: 'Finalizar pedido', fr: 'Paiement', it: 'Cassa', pt: 'Finalizar pedido', el: 'Ολοκλήρωση παραγγελίας', tr: 'Ödeme' },
  REORDER: { es: 'Volver a pedir', fr: 'Commander à nouveau', it: 'Ordina di nuovo', de: 'Erneut bestellen', pt: 'Pedir novamente', nl: 'Opnieuw bestellen', ar: 'إعادة الطلب', bg: 'Поръчай отново', tr: 'Tekrar sipariş ver' },
  REVIEW: { es: 'Calificar', fr: 'Évaluer', it: 'Valuta', de: 'Bewerten', pt: 'Avaliar', da: 'Bedøm', nl: 'Beoordelen', ar: 'تقييم', el: 'Αξιολόγηση', bg: 'Оцени', tr: 'Değerlendir' },
  REVIEW_TRIGGER_BUTTON: { es: 'Calificar', fr: 'Évaluer', it: 'Valuta', de: 'Bewerten', pt: 'Avaliar', da: 'Bedøm', nl: 'Beoordelen', ar: 'تقييم', el: 'Αξιολόγηση', bg: 'Оцени', tr: 'Değerlendir' },
  LOGIN: { es: 'Iniciar sesión', tr: 'Giriş yap' },
  SIGN_UP: { de: 'Registrieren' },
  MORE: { el: 'Περισσότερα', tr: 'Daha fazla' },
  DAYMIN1: { es: 'Lu', fr: 'Lu', it: 'Lun', pt: 'Seg', da: 'Ma', nl: 'Ma', ar: 'اثنين', el: 'Δε', bg: 'Пн', tr: 'Pt' },
  DAYMIN2: { es: 'Ma', it: 'Mar', pt: 'Ter', da: 'Ti', ar: 'ثلاثاء', el: 'Τρ', bg: 'Вт', tr: 'Sa' },
  DAYMIN3: { es: 'Mi', fr: 'Me', it: 'Mer', de: 'Mi', pt: 'Qua', da: 'On', nl: 'Wo', ar: 'أربعاء', el: 'Τε', bg: 'Ср', tr: 'Ça' },
  DAYMIN4: { es: 'Ju', fr: 'Je', it: 'Gio', de: 'Do', pt: 'Qui', da: 'To', nl: 'Do', ar: 'خميس', el: 'Πέ', bg: 'Чт', tr: 'Pe' },
  DAYMIN5: { es: 'Vi', fr: 'Ve', it: 'Ven', pt: 'Sex', nl: 'Vr', ar: 'جمعة', el: 'Πα', bg: 'Пт', tr: 'Cu' },
  DAYMIN6: { es: 'Sá', it: 'Sab', pt: 'Sáb', da: 'Lø', ar: 'سبت', el: 'Σά', bg: 'Сб', tr: 'Ct' },
  DAYMIN7: { es: 'Do', fr: 'Di', it: 'Dom', de: 'So', pt: 'Dom', da: 'Sø', ar: 'أحد', el: 'Κυ', bg: 'Нд', tr: 'Pz' },
  DAYSHORT3: { es: 'Mié', fr: 'Mer', de: 'Mi', ar: 'الأربعاء', el: 'Τετ' },
  DAYSHORT6: { es: 'Sáb', fr: 'Sam', pt: 'sáb', ar: 'السبت', tr: 'Cmt' },
  DAYSHORT7: { es: 'Dom', fr: 'Dim', it: 'Dom', de: 'So', pt: 'dom', da: 'søn', nl: 'zo', ar: 'الأحد', el: 'Κυρ', bg: 'нд', tr: 'Paz' },
  MONTH3: { de: 'März', pt: 'Março', ar: 'مارس', el: 'Μάρτιος' },
  MONTH5: { es: 'Mayo', fr: 'Mai', pt: 'Maio', nl: 'Mei', ar: 'مايو' },
  MONTHSHORT3: { de: 'Mär', el: 'Μαρ' },
  MONTHSHORT5: { es: 'May', fr: 'Mai', pt: 'mai', nl: 'mei', ar: 'مايو' },
  ORDER: { es: 'Pedido', de: 'Bestellung', pt: 'Pedido', da: 'Ordre', nl: 'Bestelling', bg: 'Поръчка', tr: 'Sipariş' },
  GROUP_ORDER: { es: 'Pedido grupal', pt: 'Pedido em grupo', ar: 'طلب جماعي', tr: 'Grup Siparişi' },
  INVOICE_NO: { es: 'N.º', fr: 'N°', it: 'N.', de: 'Nr.', pt: 'N.º', da: 'Nr.', nl: 'Nr.', ar: 'رقم', el: 'Αρ.', bg: '№', tr: 'No.' },
  GIFT_CARD_TO: { es: 'Para', de: 'An', nl: 'Aan', el: 'Προς', bg: 'До', tr: 'Alıcı' },
  WITHOUT_INGREDIENT: { es: 'Sin _ingredient_', fr: 'Sans _ingredient_', de: 'Ohne _ingredient_', tr: '_ingredient_ olmadan' },
  ORDERS: { es: 'Pedidos', fr: 'Commandes' },
  MY_ORDERS: { ar: 'طلباتي', bg: 'Моите поръчки' },
  CUSTOM_ORDER: { da: 'Tilpasset bestilling', nl: 'Aangepaste bestelling' },
  PLACE_ORDER: { ar: 'تقديم الطلب' },
  PREORDER: { ar: 'طلب مسبق', nl: 'Voorbestelling' },
  YOU_DONT_HAVE_ORDERS: { de: 'Sie haben keine Bestellungen', ar: 'ليس لديك أي طلبات' },
  MAXIMUM_SUBTOTAL_ORDER: { de: 'Maximale Zwischensumme der Bestellung', nl: 'Maximaal subtotaal van de bestelling', tr: 'Maksimum sipariş ara toplamı' }
}

// Texts the code fills in with .replace(): every language keeps the token.
const PLACEHOLDERS = {
  WITHOUT_INGREDIENT: '_ingredient_',
  CANCELLATION_OWNER_TEXT: ':owner',
  CANCELLATION_CUSTOMER_TEXT: ':customer',
  DELETE_SESSION_CREATED_AT: '_DATE_',
  ORDER_REJECT_REASON_IS: '_reject_reason_',
  ORDER_ATTRIBUTE_CHANGED_FROM_TO: '_attribute_'
}

describe('i18n catalog: the texts fixed', () => {
  it.each(Object.entries(FIXED))('%s', (key, expected) => {
    Object.entries(expected).forEach(([locale, text]) => {
      expect(translations[key][locale], `${key} ${locale}`).toBe(text)
    })
  })

  it('CLOSE is the action "Close" in every language of the site', () => {
    expect(Object.keys(translations.CLOSE).sort()).toEqual(['en', ...i18nConfig.supportedLocales].sort())
    expect(translations.CLOSE).toEqual({
      en: 'Close',
      es: 'Cerrar',
      fr: 'Fermer',
      it: 'Chiudi',
      de: 'Schließen',
      pt: 'Fechar',
      da: 'Luk',
      nl: 'Sluiten',
      ar: 'إغلاق',
      el: 'Κλείσιμο',
      bg: 'Затвори',
      tr: 'Kapat'
    })
    // the same as the PWA prompt's Close
    expect(translations.CLOSE).toEqual(translations.PWA_CLOSE_PROMPT)
  })

  it.each(Object.entries(PLACEHOLDERS))('%s keeps %s in every language', (key, token) => {
    ;['en', ...i18nConfig.supportedLocales].forEach((locale) => {
      expect(translations[key][locale], `${key} ${locale}`).toContain(token)
    })
  })

  it('the shortest weekday names are seven different ones in every language', () => {
    ;['en', ...i18nConfig.supportedLocales].forEach((locale) => {
      const days = [1, 2, 3, 4, 5, 6, 7].map((n) => translations[`DAYMIN${n}`][locale])
      expect(new Set(days).size, locale).toBe(7)
    })
  })
})
