import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  User,
  Mail,
  Globe,
  MapPin,
  Link as LinkIcon,
  MessageSquare,
  Linkedin,
  Twitter,
  Instagram,
  Github,
} from 'lucide-react'
import api, { apiRequest } from '../../../services/api'
import {
  Field,
  TextInput,
  Textarea,
  ToggleRow,
  SelectInput,
  VerifyBadge,
  FormCard,
} from './components'

/* ----------------- Constantes ----------------- */

const PHONE_PREFIX_OPTIONS = [
  { value: '+34', label: '+34 España' },
  { value: '+351', label: '+351 Portugal' },
  { value: '+33', label: '+33 Francia' },
  { value: '+44', label: '+44 Reino Unido' },
  { value: '+49', label: '+49 Alemania' },
  { value: '+1', label: '+1 EEUU' },
]

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
]

const TIMEZONE_OPTIONS = [
  'Europe/Madrid',
  'Europe/Lisbon',
  'Europe/London',
  'America/New_York',
  'America/Mexico_City',
]

const SOCIAL_PLATFORMS = [
  { key: 'linkedin', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
  { key: 'twitter', icon: Twitter, placeholder: 'https://twitter.com/...' },
  { key: 'instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
  { key: 'github', icon: Github, placeholder: 'https://github.com/...' },
  { key: 'web', icon: Globe, placeholder: 'https://tudominio.com' },
]

const PHONE_COUNTRY_BY_PREFIX = {
  '+34': 'ES',
  '+351': 'PT',
  '+33': 'FR',
  '+44': 'GB',
  '+49': 'DE',
  '+1': 'US',
}

/* ----------------- Helpers ----------------- */

function pickPersonalFields(user) {
  return {
    name: user?.name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    secondary_email: user?.secondary_email ?? '',
    job_title: user?.job_title ?? '',
    company: user?.company ?? '',
    bio: user?.bio ?? '',
    language: user?.language ?? 'es',
    timezone: user?.timezone ?? 'Europe/Madrid',
    birth_date: user?.birth_date ?? '',
    phone: user?.phone ?? '',
    phone_country_code: user?.phone_country_code ?? '+34',
    phone_alt: user?.phone_alt ?? '',
    whatsapp_number: user?.whatsapp_number ?? '',
    whatsapp_enabled: !!user?.whatsapp_enabled,
  }
}

function pickAddressFields(address) {
  const a = address || {}
  return {
    country: a.country ?? '',
    region: a.region ?? '',
    city: a.city ?? '',
    postal_code: a.postal_code ?? '',
    street_address: a.street_address ?? '',
    apartment: a.apartment ?? '',
    use_for_billing: !!a.use_for_billing,
  }
}

function socialMapFromArray(links) {
  const out = {}
  for (const p of SOCIAL_PLATFORMS) out[p.key] = ''
  if (!Array.isArray(links)) return out
  for (const l of links) {
    if (l && l.platform && out[l.platform] !== undefined) {
      out[l.platform] = l.url ?? ''
    }
  }
  return out
}

function firstValidationError(err) {
  const data = err?.data || {}
  if (data.errors && typeof data.errors === 'object') {
    const keys = Object.keys(data.errors)
    if (keys.length > 0) {
      const arr = data.errors[keys[0]]
      if (Array.isArray(arr) && arr.length > 0) return { field: keys[0], message: arr[0] }
      if (typeof arr === 'string') return { field: keys[0], message: arr }
    }
  }
  return null
}

/* ----------------- Componente ----------------- */

export default function TabPersonal({ profile, onShowToast, updateProfilePartial, onOpenVerifyEmail }) {
  const user = profile?.user || {}
  const address = profile?.address || {}
  const socialLinks = profile?.social_links || []

  const [personalForm, setPersonalForm] = useState(() => pickPersonalFields(user))
  const [addressForm, setAddressForm] = useState(() => pickAddressFields(address))
  const [socialForm, setSocialForm] = useState(() => socialMapFromArray(socialLinks))

  const [personalErrors, setPersonalErrors] = useState({})
  const [addressErrors, setAddressErrors] = useState({})

  const [phoneValid, setPhoneValid] = useState(false)
  const phoneTimerRef = useRef(null)

  // Sincroniza si llega una nueva versión del padre
  useEffect(() => {
    setPersonalForm(pickPersonalFields(user))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user.name,
    user.last_name,
    user.email,
    user.secondary_email,
    user.job_title,
    user.company,
    user.bio,
    user.language,
    user.timezone,
    user.birth_date,
    user.phone,
    user.phone_country_code,
    user.phone_alt,
    user.whatsapp_number,
    user.whatsapp_enabled,
  ])

  useEffect(() => {
    setAddressForm(pickAddressFields(address))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    address.country,
    address.region,
    address.city,
    address.postal_code,
    address.street_address,
    address.apartment,
    address.use_for_billing,
  ])

  useEffect(() => {
    setSocialForm(socialMapFromArray(socialLinks))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(socialLinks?.map?.((l) => ({ p: l.platform, u: l.url })) || [])])

  /* ---------- PATCH personal-info ---------- */

  const patchPersonal = useCallback(
    async (patch) => {
      try {
        const res = await apiRequest('/client/profile/personal-info', {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
        const payload = res?.data ?? res
        if (payload) {
          // Aceptamos varias formas: { user: {...} } o el objeto user directamente
          const nextUser = payload.user ? payload.user : payload
          if (nextUser && typeof nextUser === 'object') {
            const merged = { user: { ...user, ...nextUser } }
            if (res?.completeness) merged.completeness = res.completeness
            updateProfilePartial(merged)
          } else if (res?.completeness) {
            updateProfilePartial({ completeness: res.completeness })
          }
        }
        // Limpia errores de los campos enviados
        setPersonalErrors((prev) => {
          const next = { ...prev }
          for (const k of Object.keys(patch)) delete next[k]
          return next
        })
        onShowToast?.('Guardado')
        return true
      } catch (err) {
        if (err?.status === 422) {
          const fe = firstValidationError(err)
          if (fe) {
            setPersonalErrors((prev) => ({ ...prev, [fe.field]: fe.message }))
            return false
          }
        }
        onShowToast?.(err?.message || 'No se pudo guardar')
        return false
      }
    },
    [onShowToast, updateProfilePartial, user],
  )

  /* ---------- PATCH address ---------- */

  const patchAddress = useCallback(
    async (patch) => {
      try {
        const res = await apiRequest('/client/profile/address', {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
        const payload = res?.data ?? res
        if (payload) {
          const nextAddress = payload.address ? payload.address : payload
          if (nextAddress && typeof nextAddress === 'object') {
            const merged = { address: { ...address, ...nextAddress } }
            if (res?.completeness) merged.completeness = res.completeness
            updateProfilePartial(merged)
          } else if (res?.completeness) {
            updateProfilePartial({ completeness: res.completeness })
          }
        }
        setAddressErrors((prev) => {
          const next = { ...prev }
          for (const k of Object.keys(patch)) delete next[k]
          return next
        })
        onShowToast?.('Guardado')
        return true
      } catch (err) {
        if (err?.status === 422) {
          const fe = firstValidationError(err)
          if (fe) {
            setAddressErrors((prev) => ({ ...prev, [fe.field]: fe.message }))
            return false
          }
        }
        onShowToast?.(err?.message || 'No se pudo guardar')
        return false
      }
    },
    [onShowToast, updateProfilePartial, address],
  )

  /* ---------- PATCH social-links ---------- */

  const patchSocialLinks = useCallback(
    async (mapState) => {
      const links = SOCIAL_PLATFORMS.map((p) => ({
        platform: p.key,
        url: (mapState[p.key] || '').trim(),
      })).filter((l) => l.url.length > 0)
      try {
        const res = await apiRequest('/client/profile/social-links', {
          method: 'PATCH',
          body: JSON.stringify({ links }),
        })
        const payload = res?.data ?? res
        if (payload) {
          const nextLinks = Array.isArray(payload) ? payload : payload.social_links || payload.links
          if (Array.isArray(nextLinks)) {
            const merged = { social_links: nextLinks }
            if (res?.completeness) merged.completeness = res.completeness
            updateProfilePartial(merged)
          } else if (res?.completeness) {
            updateProfilePartial({ completeness: res.completeness })
          }
        }
        onShowToast?.('Guardado')
        return true
      } catch (err) {
        onShowToast?.(err?.message || 'No se pudo guardar')
        return false
      }
    },
    [onShowToast, updateProfilePartial],
  )

  /* ---------- Helpers de cambio + blur ---------- */

  const setPersonal = (k, v) => setPersonalForm((p) => ({ ...p, [k]: v }))
  const setAddress = (k, v) => setAddressForm((p) => ({ ...p, [k]: v }))
  const setSocial = (k, v) => setSocialForm((p) => ({ ...p, [k]: v }))

  const blurPersonal = (key) => {
    const original = pickPersonalFields(user)[key] ?? ''
    const current = personalForm[key] ?? ''
    if (String(original) === String(current)) return
    patchPersonal({ [key]: current })
  }

  const blurAddress = (key) => {
    const original = pickAddressFields(address)[key] ?? ''
    const current = addressForm[key] ?? ''
    if (String(original) === String(current)) return
    patchAddress({ [key]: current })
  }

  const blurSocial = (key) => {
    const originalMap = socialMapFromArray(socialLinks)
    const orig = originalMap[key] ?? ''
    const cur = socialForm[key] ?? ''
    if (String(orig).trim() === String(cur).trim()) return
    patchSocialLinks(socialForm)
  }

  /* ---------- Validación de teléfono (debounced) ---------- */

  useEffect(() => {
    if (!personalForm.phone) {
      setPhoneValid(false)
      return
    }
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current)
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const country = PHONE_COUNTRY_BY_PREFIX[personalForm.phone_country_code] || undefined
        const res = await api.post('/client/profile/validate-field', {
          field: 'phone',
          value: personalForm.phone,
          country,
        })
        const payload = res?.data ?? res
        if (payload?.valid) {
          setPhoneValid(true)
          setPersonalErrors((prev) => {
            const next = { ...prev }
            delete next.phone
            return next
          })
        } else {
          setPhoneValid(false)
          if (payload?.message || payload?.metadata?.message) {
            setPersonalErrors((prev) => ({
              ...prev,
              phone: payload.message || payload.metadata?.message || 'Teléfono no válido',
            }))
          }
        }
      } catch {
        // Silencioso: si la validación falla por red, no bloqueamos
      }
    }, 500)
    return () => {
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalForm.phone, personalForm.phone_country_code])

  /* ---------- Cambios inmediatos en select/toggle ---------- */

  const onChangeSelectPersonal = (key, v) => {
    setPersonal(key, v)
    patchPersonal({ [key]: v })
  }

  const onChangeWhatsappEnabled = (v) => {
    setPersonal('whatsapp_enabled', v)
    patchPersonal({ whatsapp_enabled: v })
  }

  const onChangeUseForBilling = (v) => {
    setAddress('use_for_billing', v)
    patchAddress({ use_for_billing: v })
  }

  const onChangePhonePrefix = (v) => {
    setPersonal('phone_country_code', v)
    patchPersonal({ phone_country_code: v })
  }

  /* ---------- Render ---------- */

  const phoneVerified = !!user.phone_verified_at
  const emailPrimaryVerified = !!user.email_verified_at
  const emailSecondaryVerified = !!user.secondary_email_verified_at

  const wrapStyle = useMemo(
    () => ({ display: 'flex', flexDirection: 'column', gap: 16 }),
    [],
  )

  return (
    <div className="pf-tab-content" style={wrapStyle}>
      {/* ===== Card 1: Información personal ===== */}
      <FormCard
        icon={User}
        iconAccent="cyan"
        title="Información personal"
        subtitle="Nombre, cargo y biografía"
      >
        <div className="pf-field-row">
          <Field
            label="Nombre"
            required
            hint={personalErrors.name}
            hintState={personalErrors.name ? 'error' : undefined}
          >
            <TextInput
              value={personalForm.name}
              onChange={(v) => setPersonal('name', v)}
              onBlur={() => blurPersonal('name')}
              error={!!personalErrors.name}
              autoComplete="given-name"
            />
          </Field>
          <Field
            label="Apellidos"
            hint={personalErrors.last_name}
            hintState={personalErrors.last_name ? 'error' : undefined}
          >
            <TextInput
              value={personalForm.last_name}
              onChange={(v) => setPersonal('last_name', v)}
              onBlur={() => blurPersonal('last_name')}
              error={!!personalErrors.last_name}
              autoComplete="family-name"
            />
          </Field>
        </div>

        <div className="pf-field-row">
          <Field
            label="Cargo"
            hint={personalErrors.job_title}
            hintState={personalErrors.job_title ? 'error' : undefined}
          >
            <TextInput
              value={personalForm.job_title}
              onChange={(v) => setPersonal('job_title', v)}
              onBlur={() => blurPersonal('job_title')}
              error={!!personalErrors.job_title}
              placeholder="CTO, Director..."
            />
          </Field>
          <Field
            label="Empresa"
            hint={personalErrors.company}
            hintState={personalErrors.company ? 'error' : undefined}
          >
            <TextInput
              value={personalForm.company}
              onChange={(v) => setPersonal('company', v)}
              onBlur={() => blurPersonal('company')}
              error={!!personalErrors.company}
              autoComplete="organization"
            />
          </Field>
        </div>

        <Field
          label="Biografía"
          hint={personalErrors.bio}
          hintState={personalErrors.bio ? 'error' : undefined}
        >
          <Textarea
            rows={3}
            value={personalForm.bio}
            onChange={(v) => setPersonal('bio', v)}
            onBlur={() => blurPersonal('bio')}
            placeholder="Cuéntanos brevemente quién eres"
          />
        </Field>
      </FormCard>

      {/* ===== Card 2: Cuenta y contacto ===== */}
      <FormCard icon={Mail} iconAccent="cyan" title="Cuenta y contacto">
        <Field label="Email principal" required>
          <TextInput
            value={personalForm.email}
            readonly
            type="email"
            suffix={
              <VerifyBadge
                verified={emailPrimaryVerified}
                onVerify={() => onOpenVerifyEmail?.('primary')}
              />
            }
          />
        </Field>

        <Field
          label="Email secundario"
          hint={personalErrors.secondary_email}
          hintState={personalErrors.secondary_email ? 'error' : undefined}
        >
          <TextInput
            type="email"
            value={personalForm.secondary_email}
            onChange={(v) => setPersonal('secondary_email', v)}
            onBlur={() => blurPersonal('secondary_email')}
            error={!!personalErrors.secondary_email}
            placeholder="opcional@dominio.com"
            suffix={
              <VerifyBadge
                verified={emailSecondaryVerified}
                onVerify={() => onOpenVerifyEmail?.('secondary')}
              />
            }
          />
        </Field>

        <div className="pf-field-row">
          <Field label="Prefijo país">
            <SelectInput
              value={personalForm.phone_country_code}
              onChange={onChangePhonePrefix}
              options={PHONE_PREFIX_OPTIONS}
            />
          </Field>
          <Field
            label="Teléfono"
            hint={personalErrors.phone}
            hintState={personalErrors.phone ? 'error' : phoneValid ? 'valid' : undefined}
          >
            <TextInput
              type="tel"
              value={personalForm.phone}
              onChange={(v) => setPersonal('phone', v)}
              onBlur={() => blurPersonal('phone')}
              valid={phoneValid && !personalErrors.phone}
              error={!!personalErrors.phone}
              placeholder="600 12 34 56"
              suffix={<VerifyBadge verified={phoneVerified} onVerify={() => {}} />}
              autoComplete="tel"
            />
          </Field>
        </div>

        <Field
          label="Teléfono alternativo"
          hint={personalErrors.phone_alt}
          hintState={personalErrors.phone_alt ? 'error' : undefined}
        >
          <TextInput
            type="tel"
            value={personalForm.phone_alt}
            onChange={(v) => setPersonal('phone_alt', v)}
            onBlur={() => blurPersonal('phone_alt')}
            error={!!personalErrors.phone_alt}
            placeholder="Opcional"
          />
        </Field>

        <ToggleRow
          icon={MessageSquare}
          color="green"
          title="WhatsApp activo"
          sub="Recibirás notificaciones por WhatsApp en este número"
          value={personalForm.whatsapp_enabled}
          onChange={onChangeWhatsappEnabled}
        />

        {personalForm.whatsapp_enabled && (
          <Field
            label="Número de WhatsApp"
            hint={personalErrors.whatsapp_number}
            hintState={personalErrors.whatsapp_number ? 'error' : undefined}
          >
            <TextInput
              type="tel"
              value={personalForm.whatsapp_number}
              onChange={(v) => setPersonal('whatsapp_number', v)}
              onBlur={() => blurPersonal('whatsapp_number')}
              error={!!personalErrors.whatsapp_number}
              placeholder="Con prefijo internacional (+34...)"
            />
          </Field>
        )}
      </FormCard>

      {/* ===== Card 3: Idioma y zona horaria ===== */}
      <FormCard icon={Globe} iconAccent="blue" title="Idioma y zona horaria">
        <div className="pf-field-row">
          <Field label="Idioma">
            <SelectInput
              value={personalForm.language}
              onChange={(v) => onChangeSelectPersonal('language', v)}
              options={LANGUAGE_OPTIONS}
            />
          </Field>
          <Field label="Zona horaria">
            <SelectInput
              value={personalForm.timezone}
              onChange={(v) => onChangeSelectPersonal('timezone', v)}
              options={TIMEZONE_OPTIONS}
            />
          </Field>
        </div>

        <Field
          label="Fecha de nacimiento"
          hint={personalErrors.birth_date}
          hintState={personalErrors.birth_date ? 'error' : undefined}
        >
          <TextInput
            type="date"
            value={personalForm.birth_date}
            onChange={(v) => setPersonal('birth_date', v)}
            onBlur={() => blurPersonal('birth_date')}
            error={!!personalErrors.birth_date}
          />
        </Field>
      </FormCard>

      {/* ===== Card 4: Dirección personal ===== */}
      <FormCard
        icon={MapPin}
        iconAccent="cyan"
        title="Dirección personal"
        subtitle="Tu dirección física"
      >
        <div className="pf-field-row">
          <Field
            label="País"
            hint={addressErrors.country}
            hintState={addressErrors.country ? 'error' : undefined}
          >
            <TextInput
              value={addressForm.country}
              onChange={(v) => setAddress('country', v)}
              onBlur={() => blurAddress('country')}
              error={!!addressErrors.country}
              autoComplete="country-name"
              placeholder="España"
            />
          </Field>
          <Field
            label="Provincia / Región"
            hint={addressErrors.region}
            hintState={addressErrors.region ? 'error' : undefined}
          >
            <TextInput
              value={addressForm.region}
              onChange={(v) => setAddress('region', v)}
              onBlur={() => blurAddress('region')}
              error={!!addressErrors.region}
              autoComplete="address-level1"
            />
          </Field>
        </div>

        <div className="pf-field-row">
          <Field
            label="Ciudad"
            hint={addressErrors.city}
            hintState={addressErrors.city ? 'error' : undefined}
          >
            <TextInput
              value={addressForm.city}
              onChange={(v) => setAddress('city', v)}
              onBlur={() => blurAddress('city')}
              error={!!addressErrors.city}
              autoComplete="address-level2"
            />
          </Field>
          <Field
            label="Código postal"
            hint={addressErrors.postal_code}
            hintState={addressErrors.postal_code ? 'error' : undefined}
          >
            <TextInput
              value={addressForm.postal_code}
              onChange={(v) => setAddress('postal_code', v)}
              onBlur={() => blurAddress('postal_code')}
              error={!!addressErrors.postal_code}
              autoComplete="postal-code"
            />
          </Field>
        </div>

        <Field
          label="Calle"
          hint={addressErrors.street_address}
          hintState={addressErrors.street_address ? 'error' : undefined}
        >
          <TextInput
            value={addressForm.street_address}
            onChange={(v) => setAddress('street_address', v)}
            onBlur={() => blurAddress('street_address')}
            error={!!addressErrors.street_address}
            autoComplete="street-address"
            placeholder="Calle y número"
          />
        </Field>

        <Field
          label="Piso / Departamento"
          hint={addressErrors.apartment}
          hintState={addressErrors.apartment ? 'error' : undefined}
        >
          <TextInput
            value={addressForm.apartment}
            onChange={(v) => setAddress('apartment', v)}
            onBlur={() => blurAddress('apartment')}
            error={!!addressErrors.apartment}
            placeholder="Opcional"
          />
        </Field>

        <ToggleRow
          icon={MapPin}
          color="cyan"
          title="Usar también para facturación"
          sub="Si la dirección fiscal coincide con la personal"
          value={addressForm.use_for_billing}
          onChange={onChangeUseForBilling}
        />
      </FormCard>

      {/* ===== Card 5: Redes y enlaces ===== */}
      <FormCard icon={LinkIcon} iconAccent="cyan" title="Redes y enlaces">
        {SOCIAL_PLATFORMS.map((p) => {
          const Icon = p.icon
          return (
            <Field key={p.key} label={p.key.charAt(0).toUpperCase() + p.key.slice(1)}>
              <TextInput
                value={socialForm[p.key] || ''}
                onChange={(v) => setSocial(p.key, v)}
                onBlur={() => blurSocial(p.key)}
                placeholder={p.placeholder}
                prefixIcon={<Icon size={14} />}
              />
            </Field>
          )
        })}
      </FormCard>
    </div>
  )
}
