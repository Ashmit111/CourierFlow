import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

export function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET)
}

export function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET)
}
