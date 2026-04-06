/**
 * Validation helpers — Simple schema-like validation functions
 * Alternative to Zod/Yup for form validation without extra dependencies
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationSchema {
  [field: string]: ValidationRule[]
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  message: string
  value?: any
  validate?: (val: any) => boolean
}

export function validate(data: Record<string, any>, schema: ValidationSchema): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    for (const rule of rules) {
      let isValid = true

      switch (rule.type) {
        case 'required':
          isValid = value !== null && value !== undefined && value !== ''
          break
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          isValid = !value || emailRegex.test(value)
          break
        }
        case 'minLength':
          isValid = !value || value.length >= (rule.value || 0)
          break
        case 'maxLength':
          isValid = !value || value.length <= (rule.value || 0)
          break
        case 'pattern':
          isValid = !value || (rule.value as RegExp).test(value)
          break
        case 'custom':
          isValid = !value || (rule.validate ? rule.validate(value) : true)
          break
      }

      if (!isValid) {
        errors.push({ field, message: rule.message })
        break
      }
    }
  }

  return errors
}

// Helper validators
export const validators = {
  required: (message = 'Erforderlich'): ValidationRule => ({
    type: 'required',
    message,
  }),
  email: (message = 'Ungültige E-Mail-Adresse'): ValidationRule => ({
    type: 'email',
    message,
  }),
  minLength: (min: number, message = `Mindestens ${min} Zeichen erforderlich`): ValidationRule => ({
    type: 'minLength',
    value: min,
    message,
  }),
  maxLength: (max: number, message = `Maximal ${max} Zeichen`): ValidationRule => ({
    type: 'maxLength',
    value: max,
    message,
  }),
  pattern: (pattern: RegExp, message = 'Ungültiges Format'): ValidationRule => ({
    type: 'pattern',
    value: pattern,
    message,
  }),
  custom: (validate: (val: any) => boolean, message = 'Validierung fehlgeschlagen'): ValidationRule => ({
    type: 'custom',
    message,
    validate,
  }),
}

// Common form schemas
export const formSchemas = {
  arbeitsmittel: {
    name: [validators.required('Name erforderlich'), validators.maxLength(255)],
    typ: [validators.required('Typ erforderlich')],
    seriennummer: [validators.maxLength(100)],
  },
  mangel: {
    beschreibung: [validators.required('Beschreibung erforderlich'), validators.minLength(5, 'Mindestens 5 Zeichen')],
    schweregrad: [validators.required('Schweregrad erforderlich')],
  },
  firma: {
    name: [validators.required('Firmennamen erforderlich'), validators.maxLength(255)],
    email: [validators.email(), validators.maxLength(255)],
  },
}
