import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { verifyAccessToken } from '@/lib/sms-auth'

export async function POST(request: Request) {
  try {
    const { token, phoneNumber } = await request.json()

    if (!token || !phoneNumber) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '凭证无效或已过期，请重新输入口令' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabase()
    const { data: numberRow } = await supabase
      .from('sms_numbers')
      .select('id, phone_number, group_id')
      .eq('phone_number', phoneNumber)
      .eq('group_id', payload.groupId)
      .eq('is_active', true)
      .maybeSingle()

    if (!numberRow) {
      return NextResponse.json({ error: '号码不存在或不属于当前分组' }, { status: 403 })
    }

    const name = process.env.QISMS_NAME
    const pwd = process.env.QISMS_PWD
    const appid = process.env.QISMS_APPID || '104'

    if (!name || !pwd) {
      return NextResponse.json({ error: '服务器未配置接码账号' }, { status: 500 })
    }

    const url = new URL('https://api.qisms.com/api')
    url.searchParams.set('name', name)
    url.searchParams.set('pwd', pwd)
    url.searchParams.set('act', 'getphone')
    url.searchParams.set('appid', appid)
    url.searchParams.set('number', phoneNumber)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    const text = (await res.text()).trim()
    const [status, ...rest] = text.split('|')
    const content = rest.join('|')

    // 0 成功
    if (status !== '0') {
      return NextResponse.json(
        {
          error: content || text || '占用号码失败',
          status,
          raw: text,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      status,
      phoneNumber: content || phoneNumber,
      raw: text,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '占用号码失败' }, { status: 500 })
  }
}