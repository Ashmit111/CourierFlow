function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function extractState(contact) {
  const explicitState = normalize(contact?.state)
  if (explicitState) return explicitState

  const address = String(contact?.address || '').trim()
  if (!address) return ''

  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return ''

  // Heuristic fallback when state is not explicitly captured.
  return normalize(parts[parts.length - 1]).replace(/\d+/g, '').trim()
}

export function getLaneType(sender, receiver) {
  const senderCity = normalize(sender?.city)
  const receiverCity = normalize(receiver?.city)

  if (senderCity && receiverCity && senderCity === receiverCity) return 'same_city'

  const senderState = extractState(sender)
  const receiverState = extractState(receiver)

  if (senderState && receiverState && senderState === receiverState) return 'same_state'
  return 'cross_state'
}

function baseDaysByLane(laneType) {
  if (laneType === 'same_city') return 1
  if (laneType === 'same_state') return 2
  return 4
}

function weightPenaltyDays(weight) {
  const w = Number(weight || 0)
  if (w > 15) return 2
  if (w > 5) return 1
  return 0
}

export function calculateEstimatedDeliveryDate({ sender, receiver, weight, failedRetryCount = 0, baseDate = new Date() }) {
  const laneType = getLaneType(sender, receiver)
  const baseDays = baseDaysByLane(laneType)
  const heavyParcelPenalty = weightPenaltyDays(weight)
  const statusDelayPenalty = Math.max(0, Number(failedRetryCount || 0))

  const totalDays = baseDays + heavyParcelPenalty + statusDelayPenalty
  const eta = new Date(baseDate)
  eta.setDate(eta.getDate() + totalDays)

  return eta
}
