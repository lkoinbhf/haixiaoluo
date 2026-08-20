import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { hashPassphrase, createAccessToken, getClientIp } from '@/lib/sms-auth'

const MAX_FAIL = 3
const LOCK_MS = 60 * 60 * 1000 // 60 分钟

export async function POST(request: Request) {
  try {
    const { passphrase } = await request.json()
    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json({ error: '请输入口令' }, { status: 400 })
    }

    const ip = getClientIp(request)
    const supabase = createServerSupabase()

    // 查 IP 锁定
    const { data: lock } = await supabase
      .from('sms_ip_locks')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle()

    if (lock?.locked_until && new Date(lock.locked_until).getTime() > Date.now()) {
      return NextResponse.json(
        { error: '尝试次数过多，请 60 分钟后再试' },
        { status: 429 }
      )
    }

    const passphraseHash = hashPassphrase(passphrase)

    const { data: group } = await supabase
      .from('sms_groups')
      .select('id, name')
      .eq('passphrase_hash', passphraseHash)
      .eq('is_active', true)
      .maybeSingle()

    if (!group) {
      const failedCount = (lock?.failed_count || 0) + 1
      const lockedUntil =
        failedCount >= MAX_FAIL
          ? new Date(Date.now() + LOCK_MS).toISOString()
          : null

      await supabase.from('sms_ip_locks').upsert(
        {
          ip_address: ip,
          failed_count: failedCount,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ip_address' }
      )

      const left = Math.max(0, MAX_FAIL - failedCount)
      return NextResponse.json(
        {
          error:
            failedCount >= MAX_FAIL
              ? '口令错误次数过多，已锁定 60 分钟'
              : `口令错误，还可尝试 ${left} 次`,
        },
        { status: 401 }
      )
    }

    // 成功：清零失败计数
    await supabase.from('sms_ip_locks').upsert(
      {
        ip_address: ip,
        failed_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ip_address' }
    )

    const { data: numbers, error: numErr } = await supabase
      .from('sms_numbers')
      .select('id, phone_number, label')
      .eq('group_id', group.id)
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (numErr) {
      return NextResponse.json({ error: '读取号码失败' }, { status: 500 })
    }

    const token = createAccessToken(group.id)

    return NextResponse.json({
      token,
      groupName: group.name,
      numbers: numbers || [],
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}