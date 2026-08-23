import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Briefcase,
  FileText,
  MapPin,
  Shield,
  CreditCard,
} from 'lucide-react'
import api, { apiRequest } from '../../../services/api'
import {
  Field,
  TextInput,
  Textarea,
  ToggleRow,
  RadioGroup,
  SelectInput,
  SubHead,
  FormCard,
} from './components'

/* ============== Constantes ============== */

const COUNTRY_OPTIONS = [
  { value: 'ES', label: 'España' },
  { value: 'PT', label: 'Portugal' },
  { value: 'FR', label: 'Francia' },
  { value: 'DE', label: 'Alemania' },
  { value: 'IT', label: 'Italia' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
]

const LEGAL_FORM_OPTIONS = [
  'Sociedad Limitada',
  'Sociedad Anónima',
  'Sociedad Civil',
  'Comunidad de Bienes',
  'Cooperativa',
  'Otra',
]

const TAX_ID_PLACEHOLDER = {
  ES: '12345678Z / B12345678',
  PT: '123456789',
  FR: 'FR12345678901',
  DE: 'DE123456789',
  IT: 'IT12345678901',
  GB: 'GB123456789',
  US: '12-3456789',
  MX: 'XAXX010101000',
}

const CLIENT_TYPE_OPTIONS = [
  { value: 'individual', label: 'Particular', sub: 'Persona física, sin actividad económica' },
  { value: 'freelancer', label: 'Autónomo / Freelance', sub: 'Persona física con actividad económica' },
  { value: 'company', label: 'Empresa / Sociedad', sub: 'Persona jurídica' },
]

const DELIVERY_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'postal', label: 'Postal' },
  { value: 'both', label: 'Email y postal' },
]

const LANG_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
]

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
]

const BILLING_DAY_OPTIONS = [1, 5, 10, 15, 20, 25].map((d) => ({
  value: String(d),
  label: `Día ${d} de cada mes`,
}))

const PAYMENT_METHOD_OPTIONS = [
  { value: 'transfer', label: 'Transferencia bancaria' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'sepa_dd', label: 'Domiciliación SEPA' },
]

/* ============== Helpers ============== */

function shallowAddressEquals(a, b) {
  if (!a || !b) return false
  const keys = ['country', 'region', 'city', 'postal_code', 'street_address']
  return keys.every((k) => (a[k] || '') === (b[k] || ''))
}

function normalizeError(err) {
  if (!err) return 'Error desconocido'
  if (err.status === 422 && err.data?.errors) {
    const first = Object.values(err.data.errors)[0]
    if (Array.isArray(first) && first.length) return first[0]
  }
  return err.message || 'Error en la solicitud'
}

function fieldErrorFrom422(err, field) {
  if (err?.status !== 422 || !err.data?.errors) return null
  const e = err.data.errors[field]
  if (Array.isArray(e) && e.length) return e[0]
  return null
}

/* ============== Componente principal ============== */

export default function TabFiscal({ profile, onShowToast, updateProfilePartial }) {
  const fiscal = profile?.fiscal_data || {}
  const billing = profile?.billing_preferences || {}
  const personalAddress = profile?.address || null

  /* ----- Estado local: tipo de cliente ----- */
  const [clientType, setClientType] = useState(fiscal.client_type || 'individual')

  /* ----- Estado local: datos fiscales ----- */
  const [fiscalCountry, setFiscalCountry] = useState(fiscal.fiscal_country || 'ES')
  const [taxId, setTaxId] = useState(fiscal.tax_id || '')
  const [taxIdHint, setTaxIdHint] = useState({ state: null, msg: null })
  const [legalName, setLegalName] = useState(fiscal.legal_name || '')
  const [commercialName, setCommercialName] = useState(fiscal.commercial_name || '')
  const [legalForm, setLegalForm] = useState(fiscal.legal_form || 'Sociedad Limitada')
  const [fiscalFullName, setFiscalFullName] = useState(fiscal.fiscal_full_name || '')

  const [taxIdError, setTaxIdError] = useState(null)
  const [legalNameError, setLegalNameError] = useState(null)
  const [commercialNameError, setCommercialNameError] = useState(null)
  const [legalFormError, setLegalFormError] = useState(null)
  const [fiscalFullNameError, setFiscalFullNameError] = useState(null)

  /* ----- Dirección fiscal ----- */
  const initialUsePersonal =
    !fiscal.fiscal_address ||
    (personalAddress && shallowAddressEquals(fiscal.fiscal_address, personalAddress))

  const [usePersonalAddress, setUsePersonalAddress] = useState(!!initialUsePersonal)
  const [addrCountry, setAddrCountry] = useState(fiscal.fiscal_address?.country || 'ES')
  const [addrRegion, setAddrRegion] = useState(fiscal.fiscal_address?.region || '')
  const [addrCity, setAddrCity] = useState(fiscal.fiscal_address?.city || '')
  const [addrPostalCode, setAddrPostalCode] = useState(fiscal.fiscal_address?.postal_code || '')
  const [addrStreet, setAddrStreet] = useState(fiscal.fiscal_address?.street_address || '')

  /* ----- Régimen fiscal ----- */
  const [appliesVat, setAppliesVat] = useState(fiscal.applies_vat ?? true)
  const [isEuOperator, setIsEuOperator] = useState(fiscal.is_eu_operator ?? false)
  const [hasIrpf, setHasIrpf] = useState((fiscal.irpf_retention ?? 0) > 0)
  const [irpfRetention, setIrpfRetention] = useState(
    fiscal.irpf_retention != null ? String(fiscal.irpf_retention) : '15',
  )
  const [vatExempt, setVatExempt] = useState(fiscal.vat_exempt ?? false)
  const [vatExemptReason, setVatExemptReason] = useState(fiscal.vat_exempt_reason || '')
  const [irpfError, setIrpfError] = useState(null)
  const [vatExemptReasonError, setVatExemptReasonError] = useState(null)

  /* ----- Preferencias de facturación ----- */
  const [billingEmail, setBillingEmail] = useState(billing.billing_email || '')
  const [billingEmailCc, setBillingEmailCc] = useState(billing.billing_email_cc || '')
  const [deliveryChannel, setDeliveryChannel] = useState(billing.delivery_channel || 'email')
  const [invoiceLanguage, setInvoiceLanguage] = useState(billing.invoice_language || 'es')
  const [currency, setCurrency] = useState(billing.currency || 'EUR')
  const [billingDay, setBillingDay] = useState(
    billing.preferred_billing_day != null ? String(billing.preferred_billing_day) : '1',
  )
  const [paymentMethod, setPaymentMethod] = useState(billing.payment_method || 'transfer')
  const [iban, setIban] = useState('')
  const [ibanHint, setIbanHint] = useState({ state: null, msg: null })
  const [accountantNotes, setAccountantNotes] = useState(billing.accountant_notes || '')

  const [billingEmailError, setBillingEmailError] = useState(null)
  const [billingEmailCcError, setBillingEmailCcError] = useState(null)
  const [ibanError, setIbanError] = useState(null)
  const [accountantNotesError, setAccountantNotesError] = useState(null)

  /* ----- Sincronización con cambios externos ----- */
  useEffect(() => {
    setClientType(fiscal.client_type || 'individual')
    setFiscalCountry(fiscal.fiscal_country || 'ES')
    setTaxId(fiscal.tax_id || '')
    setLegalName(fiscal.legal_name || '')
    setCommercialName(fiscal.commercial_name || '')
    setLegalForm(fiscal.legal_form || 'Sociedad Limitada')
    setFiscalFullName(fiscal.fiscal_full_name || '')
    setAppliesVat(fiscal.applies_vat ?? true)
    setIsEuOperator(fiscal.is_eu_operator ?? false)
    setHasIrpf((fiscal.irpf_retention ?? 0) > 0)
    setIrpfRetention(fiscal.irpf_retention != null ? String(fiscal.irpf_retention) : '15')
    setVatExempt(fiscal.vat_exempt ?? false)
    setVatExemptReason(fiscal.vat_exempt_reason || '')
    setAddrCountry(fiscal.fiscal_address?.country || 'ES')
    setAddrRegion(fiscal.fiscal_address?.region || '')
    setAddrCity(fiscal.fiscal_address?.city || '')
    setAddrPostalCode(fiscal.fiscal_address?.postal_code || '')
    setAddrStreet(fiscal.fiscal_address?.street_address || '')
    setUsePersonalAddress(
      !fiscal.fiscal_address ||
        (personalAddress && shallowAddressEquals(fiscal.fiscal_address, personalAddress)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fiscal.client_type,
    fiscal.fiscal_country,
    fiscal.tax_id,
    fiscal.legal_name,
    fiscal.commercial_name,
    fiscal.legal_form,
    fiscal.fiscal_full_name,
    fiscal.applies_vat,
    fiscal.is_eu_operator,
    fiscal.irpf_retention,
    fiscal.vat_exempt,
    fiscal.vat_exempt_reason,
    fiscal.fiscal_address?.country,
    fiscal.fiscal_address?.region,
    fiscal.fiscal_address?.city,
    fiscal.fiscal_address?.postal_code,
    fiscal.fiscal_address?.street_address,
  ])

  useEffect(() => {
    setBillingEmail(billing.billing_email || '')
    setBillingEmailCc(billing.billing_email_cc || '')
    setDeliveryChannel(billing.delivery_channel || 'email')
    setInvoiceLanguage(billing.invoice_language || 'es')
    setCurrency(billing.currency || 'EUR')
    setBillingDay(billing.preferred_billing_day != null ? String(billing.preferred_billing_day) : '1')
    setPaymentMethod(billing.payment_method || 'transfer')
    setAccountantNotes(billing.accountant_notes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    billing.billing_email,
    billing.billing_email_cc,
    billing.delivery_channel,
    billing.invoice_language,
    billing.currency,
    billing.preferred_billing_day,
    billing.payment_method,
    billing.accountant_notes,
  ])

  /* ----- PATCH helpers ----- */
  const patchFiscal = useCallback(
    async (body, fieldErrSetter) => {
      try {
        const res = await apiRequest('/client/profile/fiscal-data', {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        const data = res?.data ?? res ?? {}
        const patch = {}
        if (data.fiscal_data) patch.fiscal_data = data.fiscal_data
        if (data.completeness) patch.completeness = data.completeness
        if (Object.keys(patch).length) updateProfilePartial(patch)
        if (fieldErrSetter) fieldErrSetter(null)
        onShowToast?.('Guardado')
        return true
      } catch (err) {
        if (err?.status === 422 && fieldErrSetter) {
          const key = Object.keys(body)[0]
          const fieldMsg = fieldErrorFrom422(err, key)
          if (fieldMsg) {
            fieldErrSetter(fieldMsg)
            return false
          }
        }
        onShowToast?.(normalizeError(err))
        return false
      }
    },
    [onShowToast, updateProfilePartial],
  )

  const patchBilling = useCallback(
    async (body, fieldErrSetter) => {
      try {
        const res = await apiRequest('/client/profile/billing-preferences', {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        const data = res?.data ?? res ?? {}
        const patch = {}
        if (data.billing_preferences) patch.billing_preferences = data.billing_preferences
        if (data.completeness) patch.completeness = data.completeness
        if (Object.keys(patch).length) updateProfilePartial(patch)
        if (fieldErrSetter) fieldErrSetter(null)
        onShowToast?.('Guardado')
        return true
      } catch (err) {
        if (err?.status === 422 && fieldErrSetter) {
          const key = Object.keys(body)[0]
          const fieldMsg = fieldErrorFrom422(err, key)
          if (fieldMsg) {
            fieldErrSetter(fieldMsg)
            return false
          }
        }
        onShowToast?.(normalizeError(err))
        return false
      }
    },
    [onShowToast, updateProfilePartial],
  )

  /* ----- Validate-field helpers (debounced) ----- */
  const taxIdTimer = useRef(null)
  const ibanTimer = useRef(null)

  useEffect(() => () => {
    if (taxIdTimer.current) clearTimeout(taxIdTimer.current)
    if (ibanTimer.current) clearTimeout(ibanTimer.current)
  }, [])

  const triggerValidateTaxId = useCallback(
    (value) => {
      if (taxIdTimer.current) clearTimeout(taxIdTimer.current)
      if (!value || value.trim().length < 3) {
        setTaxIdHint({ state: null, msg: null })
        return
      }
      taxIdTimer.current = setTimeout(async () => {
        try {
          const res = await api.post('/client/profile/validate-field', {
            field: 'tax_id',
            value,
            country: fiscalCountry,
            client_type: clientType,
          })
          const data = res?.data ?? res ?? {}
          if (data.valid) {
            const meta = data.metadata || {}
            const txt = meta.tax_id_type
              ? `Válido (${meta.tax_id_type})`
              : 'Identificador válido'
            setTaxIdHint({ state: 'valid', msg: txt })
          } else {
            setTaxIdHint({ state: 'error', msg: data.message || 'Identificador inválido' })
          }
        } catch (err) {
          setTaxIdHint({ state: 'error', msg: normalizeError(err) })
        }
      }, 500)
    },
    [clientType, fiscalCountry],
  )

  const triggerValidateIban = useCallback((value) => {
    if (ibanTimer.current) clearTimeout(ibanTimer.current)
    if (!value || value.trim().length < 4) {
      setIbanHint({ state: null, msg: null })
      return
    }
    ibanTimer.current = setTimeout(async () => {
      try {
        const res = await api.post('/client/profile/validate-field', {
          field: 'iban',
          value,
        })
        const data = res?.data ?? res ?? {}
        if (data.valid) {
          const meta = data.metadata || {}
          const txt = meta.bank_name ? `Válido · ${meta.bank_name}` : 'IBAN válido'
          setIbanHint({ state: 'valid', msg: txt })
        } else {
          setIbanHint({ state: 'error', msg: data.message || 'IBAN inválido' })
        }
      } catch (err) {
        setIbanHint({ state: 'error', msg: normalizeError(err) })
      }
    }, 500)
  }, [])

  /* ----- Handlers Card 1 ----- */
  const onClientTypeChange = (value) => {
    setClientType(value)
    patchFiscal({ client_type: value })
  }

  /* ----- Handlers Card 2 ----- */
  const onFiscalCountryChange = (value) => {
    setFiscalCountry(value)
    patchFiscal({ fiscal_country: value })
  }

  const onTaxIdChange = (value) => {
    setTaxId(value)
    setTaxIdError(null)
    triggerValidateTaxId(value)
  }

  const onTaxIdBlur = () => {
    if ((taxId || '') === (fiscal.tax_id || '')) return
    patchFiscal({ tax_id: taxId }, setTaxIdError)
  }

  const onLegalNameBlur = () => {
    if ((legalName || '') === (fiscal.legal_name || '')) return
    patchFiscal({ legal_name: legalName }, setLegalNameError)
  }

  const onCommercialNameBlur = () => {
    if ((commercialName || '') === (fiscal.commercial_name || '')) return
    patchFiscal({ commercial_name: commercialName }, setCommercialNameError)
  }

  const onLegalFormChange = (value) => {
    setLegalForm(value)
    patchFiscal({ legal_form: value }, setLegalFormError)
  }

  const onFiscalFullNameBlur = () => {
    if ((fiscalFullName || '') === (fiscal.fiscal_full_name || '')) return
    patchFiscal({ fiscal_full_name: fiscalFullName }, setFiscalFullNameError)
  }

  /* ----- Handlers Card 3 (dirección fiscal) ----- */
  const onUsePersonalAddressChange = (next) => {
    setUsePersonalAddress(next)
    if (next) {
      if (personalAddress) {
        const body = {
          country: personalAddress.country || '',
          region: personalAddress.region || '',
          city: personalAddress.city || '',
          postal_code: personalAddress.postal_code || '',
          street_address: personalAddress.street_address || '',
        }
        setAddrCountry(body.country)
        setAddrRegion(body.region)
        setAddrCity(body.city)
        setAddrPostalCode(body.postal_code)
        setAddrStreet(body.street_address)
        patchFiscal({ fiscal_address: body })
      } else {
        onShowToast?.('No tienes una dirección personal definida')
      }
    }
  }

  const buildAddressBody = (overrides = {}) => ({
    country: addrCountry || '',
    region: addrRegion || '',
    city: addrCity || '',
    postal_code: addrPostalCode || '',
    street_address: addrStreet || '',
    ...overrides,
  })

  const onAddrCountryChange = (value) => {
    setAddrCountry(value)
    patchFiscal({ fiscal_address: buildAddressBody({ country: value }) })
  }

  const onAddrFieldBlur = (field, value, original) => {
    if ((value || '') === (original || '')) return
    patchFiscal({ fiscal_address: buildAddressBody() })
  }

  /* ----- Handlers Card 4 (régimen fiscal) ----- */
  const onAppliesVatChange = (next) => {
    setAppliesVat(next)
    patchFiscal({ applies_vat: next })
  }

  const onIsEuOperatorChange = (next) => {
    setIsEuOperator(next)
    patchFiscal({ is_eu_operator: next })
  }

  const onHasIrpfChange = (next) => {
    setHasIrpf(next)
    if (!next) {
      patchFiscal({ irpf_retention: 0 }, setIrpfError)
    } else {
      const num = parseFloat(irpfRetention)
      patchFiscal({ irpf_retention: isNaN(num) ? 15 : num }, setIrpfError)
    }
  }

  const onIrpfBlur = () => {
    const num = parseFloat(irpfRetention)
    if (isNaN(num)) {
      setIrpfError('Introduce un número válido')
      return
    }
    if (num === (fiscal.irpf_retention ?? 0)) return
    patchFiscal({ irpf_retention: num }, setIrpfError)
  }

  const onVatExemptChange = (next) => {
    setVatExempt(next)
    patchFiscal({ vat_exempt: next })
  }

  const onVatExemptReasonBlur = () => {
    if ((vatExemptReason || '') === (fiscal.vat_exempt_reason || '')) return
    patchFiscal({ vat_exempt_reason: vatExemptReason }, setVatExemptReasonError)
  }

  /* ----- Handlers Card 5 (facturación) ----- */
  const onBillingEmailBlur = () => {
    if ((billingEmail || '') === (billing.billing_email || '')) return
    patchBilling({ billing_email: billingEmail }, setBillingEmailError)
  }
  const onBillingEmailCcBlur = () => {
    if ((billingEmailCc || '') === (billing.billing_email_cc || '')) return
    patchBilling({ billing_email_cc: billingEmailCc }, setBillingEmailCcError)
  }
  const onDeliveryChannelChange = (value) => {
    setDeliveryChannel(value)
    patchBilling({ delivery_channel: value })
  }
  const onInvoiceLanguageChange = (value) => {
    setInvoiceLanguage(value)
    patchBilling({ invoice_language: value })
  }
  const onCurrencyChange = (value) => {
    setCurrency(value)
    patchBilling({ currency: value })
  }
  const onBillingDayChange = (value) => {
    setBillingDay(value)
    patchBilling({ preferred_billing_day: parseInt(value, 10) })
  }
  const onPaymentMethodChange = (value) => {
    setPaymentMethod(value)
    patchBilling({ payment_method: value })
  }
  const onIbanChange = (value) => {
    setIban(value)
    setIbanError(null)
    triggerValidateIban(value)
  }
  const onIbanBlur = () => {
    if (!iban || !iban.trim()) return
    patchBilling({ iban: iban.trim() }, setIbanError).then((ok) => {
      if (ok) {
        setIban('')
        setIbanHint({ state: null, msg: null })
      }
    })
  }
  const onAccountantNotesBlur = () => {
    if ((accountantNotes || '') === (billing.accountant_notes || '')) return
    patchBilling({ accountant_notes: accountantNotes }, setAccountantNotesError)
  }

  /* ----- Render ----- */
  const showLegalCommercial = clientType !== 'individual'
  const showLegalForm = clientType === 'company'
  const showFiscalFullName = clientType === 'individual' || clientType === 'freelancer'
  const showIrpfToggle = clientType !== 'individual'
  const showIbanField = paymentMethod === 'transfer' || paymentMethod === 'sepa_dd'

  const taxIdPlaceholder = TAX_ID_PLACEHOLDER[fiscalCountry] || ''

  const ibanLast4Chip = useMemo(() => {
    const last4 = billing.iban_last_4
    const bank = billing.iban_bank_name
    if (!last4) return null
    return (
      <span className="pf-chip" style={{ marginTop: 8 }}>
        <CreditCard size={11} />
        •••• {last4}
        {bank ? ` · ${bank}` : ''}
      </span>
    )
  }, [billing.iban_last_4, billing.iban_bank_name])

  return (
    <div className="pf-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===================== Card 1: Tipo de cliente ===================== */}
      <FormCard icon={Briefcase} iconAccent="cyan" title="Tipo de cliente">
        <RadioGroup
          value={clientType}
          onChange={onClientTypeChange}
          options={CLIENT_TYPE_OPTIONS}
        />
      </FormCard>

      {/* ===================== Card 2: Datos fiscales ===================== */}
      <FormCard
        icon={FileText}
        iconAccent="amber"
        title="Datos fiscales"
        subtitle="Identificación y razón social"
      >
        <div className="pf-field-row">
          <Field label="País fiscal" required>
            <SelectInput
              value={fiscalCountry}
              onChange={onFiscalCountryChange}
              options={COUNTRY_OPTIONS}
            />
          </Field>
          <Field
            label={fiscalCountry === 'ES' ? 'NIF / CIF / NIE' : 'Identificador fiscal / VAT'}
            required
            hint={taxIdError || taxIdHint.msg}
            hintState={taxIdError ? 'error' : taxIdHint.state}
          >
            <TextInput
              value={taxId}
              onChange={onTaxIdChange}
              onBlur={onTaxIdBlur}
              placeholder={taxIdPlaceholder}
              valid={!taxIdError && taxIdHint.state === 'valid'}
              error={!!taxIdError || taxIdHint.state === 'error'}
            />
          </Field>
        </div>

        {showLegalCommercial && (
          <div className="pf-field-row">
            <Field
              label="Razón social"
              required
              hint={legalNameError}
              hintState={legalNameError ? 'error' : null}
            >
              <TextInput
                value={legalName}
                onChange={(v) => {
                  setLegalName(v)
                  setLegalNameError(null)
                }}
                onBlur={onLegalNameBlur}
                placeholder="Nombre legal de la empresa"
                error={!!legalNameError}
              />
            </Field>
            <Field
              label="Nombre comercial"
              hint={commercialNameError}
              hintState={commercialNameError ? 'error' : null}
            >
              <TextInput
                value={commercialName}
                onChange={(v) => {
                  setCommercialName(v)
                  setCommercialNameError(null)
                }}
                onBlur={onCommercialNameBlur}
                placeholder="Nombre comercial (opcional)"
                error={!!commercialNameError}
              />
            </Field>
          </div>
        )}

        {showLegalForm && (
          <Field
            label="Forma jurídica"
            hint={legalFormError}
            hintState={legalFormError ? 'error' : null}
          >
            <SelectInput
              value={legalForm}
              onChange={onLegalFormChange}
              options={LEGAL_FORM_OPTIONS}
            />
          </Field>
        )}

        {showFiscalFullName && (
          <Field
            label="Nombre fiscal completo"
            required
            hint={fiscalFullNameError}
            hintState={fiscalFullNameError ? 'error' : null}
          >
            <TextInput
              value={fiscalFullName}
              onChange={(v) => {
                setFiscalFullName(v)
                setFiscalFullNameError(null)
              }}
              onBlur={onFiscalFullNameBlur}
              placeholder="Nombre y apellidos como figuran en el DNI"
              error={!!fiscalFullNameError}
            />
          </Field>
        )}
      </FormCard>

      {/* ===================== Card 3: Dirección fiscal ===================== */}
      <FormCard icon={MapPin} iconAccent="cyan" title="Dirección fiscal">
        <ToggleRow
          title="Usar mi dirección personal"
          sub="Mismas calles, ciudad y código postal"
          value={usePersonalAddress}
          onChange={onUsePersonalAddressChange}
        />

        {!usePersonalAddress && (
          <>
            <div className="pf-field-row">
              <Field label="País" required>
                <SelectInput
                  value={addrCountry}
                  onChange={onAddrCountryChange}
                  options={COUNTRY_OPTIONS}
                />
              </Field>
              <Field label="Provincia / Región">
                <TextInput
                  value={addrRegion}
                  onChange={setAddrRegion}
                  onBlur={() =>
                    onAddrFieldBlur('region', addrRegion, fiscal.fiscal_address?.region)
                  }
                  placeholder="Provincia / Región"
                />
              </Field>
            </div>
            <div className="pf-field-row">
              <Field label="Ciudad" required>
                <TextInput
                  value={addrCity}
                  onChange={setAddrCity}
                  onBlur={() =>
                    onAddrFieldBlur('city', addrCity, fiscal.fiscal_address?.city)
                  }
                  placeholder="Ciudad"
                />
              </Field>
              <Field label="Código postal" required>
                <TextInput
                  value={addrPostalCode}
                  onChange={setAddrPostalCode}
                  onBlur={() =>
                    onAddrFieldBlur(
                      'postal_code',
                      addrPostalCode,
                      fiscal.fiscal_address?.postal_code,
                    )
                  }
                  placeholder="28001"
                />
              </Field>
            </div>
            <Field label="Calle y número" required>
              <TextInput
                value={addrStreet}
                onChange={setAddrStreet}
                onBlur={() =>
                  onAddrFieldBlur(
                    'street_address',
                    addrStreet,
                    fiscal.fiscal_address?.street_address,
                  )
                }
                placeholder="Calle, número, piso, puerta..."
              />
            </Field>
          </>
        )}
      </FormCard>

      {/* ===================== Card 4: Régimen fiscal ===================== */}
      <FormCard icon={Shield} iconAccent="green" title="Régimen fiscal">
        <ToggleRow
          title="Aplica IVA en facturas"
          sub="Las facturas incluirán el IVA correspondiente"
          value={appliesVat}
          onChange={onAppliesVatChange}
          color="green"
        />
        <ToggleRow
          title="Operador intracomunitario"
          sub="Inscrito en el ROI / VIES"
          value={isEuOperator}
          onChange={onIsEuOperatorChange}
          color="cyan"
        />

        {showIrpfToggle && (
          <>
            <ToggleRow
              title="Aplica retención IRPF"
              sub="Las facturas mostrarán retención de IRPF"
              value={hasIrpf}
              onChange={onHasIrpfChange}
              color="amber"
            />
            {hasIrpf && (
              <Field
                label="Porcentaje de IRPF"
                required
                hint={irpfError || 'Habitualmente 7% o 15%'}
                hintState={irpfError ? 'error' : null}
              >
                <TextInput
                  type="number"
                  value={irpfRetention}
                  onChange={(v) => {
                    setIrpfRetention(v)
                    setIrpfError(null)
                  }}
                  onBlur={onIrpfBlur}
                  placeholder="15"
                  suffix="%"
                  error={!!irpfError}
                />
              </Field>
            )}
          </>
        )}

        <ToggleRow
          title="Exento de IVA"
          sub="No se aplicará IVA en las facturas"
          value={vatExempt}
          onChange={onVatExemptChange}
          color="amber"
        />
        {vatExempt && (
          <Field
            label="Motivo de exención"
            required
            hint={vatExemptReasonError}
            hintState={vatExemptReasonError ? 'error' : null}
          >
            <Textarea
              value={vatExemptReason}
              onChange={(v) => {
                setVatExemptReason(v)
                setVatExemptReasonError(null)
              }}
              onBlur={onVatExemptReasonBlur}
              placeholder="Artículo o motivo legal por el que se aplica la exención"
              rows={3}
            />
          </Field>
        )}
      </FormCard>

      {/* ===================== Card 5: Preferencias de facturación ===================== */}
      <FormCard icon={CreditCard} iconAccent="cyan" title="Preferencias de facturación">
        <SubHead>Email de facturación</SubHead>
        <div className="pf-field-row">
          <Field
            label="Email de facturación"
            required
            hint={billingEmailError}
            hintState={billingEmailError ? 'error' : null}
          >
            <TextInput
              type="email"
              value={billingEmail}
              onChange={(v) => {
                setBillingEmail(v)
                setBillingEmailError(null)
              }}
              onBlur={onBillingEmailBlur}
              placeholder="facturacion@empresa.com"
              error={!!billingEmailError}
            />
          </Field>
          <Field
            label="Email CC"
            hint={billingEmailCcError}
            hintState={billingEmailCcError ? 'error' : null}
          >
            <TextInput
              type="email"
              value={billingEmailCc}
              onChange={(v) => {
                setBillingEmailCc(v)
                setBillingEmailCcError(null)
              }}
              onBlur={onBillingEmailCcBlur}
              placeholder="contable@empresa.com (opcional)"
              error={!!billingEmailCcError}
            />
          </Field>
        </div>

        <SubHead>Entrega</SubHead>
        <div className="pf-field-row">
          <Field label="Canal de entrega">
            <SelectInput
              value={deliveryChannel}
              onChange={onDeliveryChannelChange}
              options={DELIVERY_OPTIONS}
            />
          </Field>
          <Field label="Idioma de la factura">
            <SelectInput
              value={invoiceLanguage}
              onChange={onInvoiceLanguageChange}
              options={LANG_OPTIONS}
            />
          </Field>
        </div>
        <div className="pf-field-row">
          <Field label="Moneda">
            <SelectInput
              value={currency}
              onChange={onCurrencyChange}
              options={CURRENCY_OPTIONS}
            />
          </Field>
          <Field label="Día preferente de cobro">
            <SelectInput
              value={billingDay}
              onChange={onBillingDayChange}
              options={BILLING_DAY_OPTIONS}
            />
          </Field>
        </div>

        <SubHead>Método de pago</SubHead>
        <RadioGroup
          value={paymentMethod}
          onChange={onPaymentMethodChange}
          options={PAYMENT_METHOD_OPTIONS}
        />

        {showIbanField && (
          <div style={{ marginTop: 12 }}>
            <Field
              label="IBAN"
              hint={ibanError || ibanHint.msg || 'Se almacenará cifrado en el servidor'}
              hintState={ibanError ? 'error' : ibanHint.state}
            >
              <TextInput
                value={iban}
                onChange={onIbanChange}
                onBlur={onIbanBlur}
                placeholder="ES00 0000 0000 0000 0000 0000"
                valid={!ibanError && ibanHint.state === 'valid'}
                error={!!ibanError || ibanHint.state === 'error'}
              />
            </Field>
            {ibanLast4Chip}
          </div>
        )}

        <SubHead>Notas para gestoría</SubHead>
        <Field
          label="Notas internas"
          hint={accountantNotesError}
          hintState={accountantNotesError ? 'error' : null}
        >
          <Textarea
            value={accountantNotes}
            onChange={(v) => {
              setAccountantNotes(v)
              setAccountantNotesError(null)
            }}
            onBlur={onAccountantNotesBlur}
            placeholder="Cualquier dato relevante para la gestoría / contable"
            rows={3}
          />
        </Field>
      </FormCard>
    </div>
  )
}
