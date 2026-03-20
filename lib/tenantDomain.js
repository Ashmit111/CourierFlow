import Tenant from '@/models/Tenant'

function normalizeDomainSource(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function buildDomainFromName(name) {
  const base = normalizeDomainSource(name)
  return base || 'tenant'
}

export async function generateUniqueTenantDomain(name, excludeTenantId = null) {
  const base = buildDomainFromName(name)
  let candidate = base
  let suffix = 2

  while (true) {
    const query = { domain: candidate }
    if (excludeTenantId) query._id = { $ne: excludeTenantId }

    const existing = await Tenant.findOne(query).select('_id').lean()
    if (!existing) return candidate

    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function dropLegacySlugIndexIfExists() {
  try {
    await Tenant.collection.dropIndex('slug_1')
  } catch (err) {
    const code = typeof err?.code === 'number' ? err.code : null
    const message = String(err?.message || '').toLowerCase()
    const notFound = code === 26 || code === 27 || message.includes('index not found') || message.includes('ns not found')

    if (!notFound) throw err
  }
}
