import { z } from 'zod'

const tenDigitPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')

const optionalTenDigitPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  },
  tenDigitPhoneSchema.optional()
)

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  planId: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().min(1, 'Please select a subscription plan')
  ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ─── Tenant ──────────────────────────────────────────────────────────────────

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  status: z.enum(['active', 'suspended']).default('active'),
  subscriptionPlan: z.string().optional().nullable(),
})

export const updateTenantSchema = createTenantSchema.partial()

export const createTenantWithAdminSchema = createTenantSchema.extend({
  subscriptionPlan: z.string().min(1, 'Please select a subscription plan'),
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm the password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const createTenantFromSASchema = createTenantSchema.extend({
  adminName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasAnyAdminField = !!(data.adminName || data.email || data.password)

  if (!hasAnyAdminField) return

  if (!data.adminName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Admin name is required', path: ['adminName'] })
  }
  if (!data.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Admin email is required', path: ['email'] })
  }
  if (!data.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Admin password is required', path: ['password'] })
  }

  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] })
  }
})

// ─── Subscription Plan ───────────────────────────────────────────────────────

export const planSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  maxShipments: z.number().int().positive('Must be a positive integer'),
  maxAgents: z.number().int().positive('Must be a positive integer'),
  maxHubs: z.number().int().positive('Must be a positive integer'),
  features: z.array(z.string()).default([]),
})

// ─── Hub ─────────────────────────────────────────────────────────────────────

export const hubSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  isActive: z.boolean().default(true),
})

// ─── Agent ───────────────────────────────────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  phone: optionalTenDigitPhoneSchema,
  isAvailable: z.boolean().default(true),
})

export const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: optionalTenDigitPhoneSchema,
  isAvailable: z.boolean().optional(),
})

// ─── Shipment ────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: tenDigitPhoneSchema,
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
})

const receiverContactSchema = contactSchema.extend({
  email: z.string().trim().email('Receiver email is required'),
})

export const createShipmentSchema = z.object({
  sender: contactSchema,
  receiver: receiverContactSchema,
  description: z.string().max(500).optional().default(''),
  weight: z.number().positive('Weight must be greater than 0'),
})

export const updateShipmentSchema = createShipmentSchema.partial()

// ─── Status Update (Agent) ───────────────────────────────────────────────────

export const statusUpdateSchema = z.object({
  status: z.enum([
    'Picked Up',
    'At Sorting Facility',
    'In Transit',
    'Out for Delivery',
    'Delivered',
    'Failed',
    'Retry',
    'Returned',
  ]),
  note: z.string().max(300).optional().default(''),
  location: z
    .object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    })
    .optional()
    .nullable(),
})

// ─── Assign Hub / Agent ──────────────────────────────────────────────────────

export const assignHubSchema = z.object({
  hubId: z.string().min(1, 'Hub is required'),
})

export const assignAgentSchema = z.object({
  agentId: z.string().min(1, 'Agent is required'),
})

// ─── Location ────────────────────────────────────────────────────────────────

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
