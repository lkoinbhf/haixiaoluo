import crypto from 'crypto'

export function hashPassphrase(passphrase: string) {
  const salt = process.env.SMS_PASS_SALT
  if (!salt) throw new Error('缺少 SMS_PASS_SALT')
  return crypto.createHash('sha256').update(`${salt}:${passphrase}`).digest('hex')
}

type TokenPayload = {
  groupId: number
  exp: number
}

export function createAccessToken(groupId: number) {
  const secret = process.env.SMS_TOKEN_SECRET
  if (!secret) throw new Error('缺少 SMS_TOKEN_SECRET')

  const payload: TokenPayload = {
    groupId,
    exp: Date.now() + 120 * 60 * 1000, // 120 分钟
  }

  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyAccessToken(token: string): TokenPayload | null {
  const secret = process.env.SMS_TOKEN_SECRET
  if (!secret) return null

  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (expected !== sig) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload
    if (!payload.groupId || !payload.exp) return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}