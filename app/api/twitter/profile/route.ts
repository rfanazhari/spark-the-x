import { NextRequest, NextResponse } from 'next/server'
import type { UserV2 } from 'twitter-api-v2'
import { getAuthUser } from '@/lib/auth'
import { getTwitterClient } from '@/lib/twitter'

const USER_FIELDS: (keyof UserV2)[] = [
  'name',
  'username',
  'description',
  'profile_image_url',
  'location',
  'url',
  'public_metrics',
  'verified',
]

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const client = await getTwitterClient(user.id)
    const me = await client.readWrite.v2.me({ 'user.fields': USER_FIELDS })

    return NextResponse.json({ success: true, data: me.data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterProfile][GET] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      name?: string
      description?: string
      location?: string
      url?: string
    }

    const client = await getTwitterClient(user.id)
    await client.readWrite.v1.updateAccountProfile({
      name: body.name,
      description: body.description,
      location: body.location,
      url: body.url,
    })

    const me = await client.readWrite.v2.me({ 'user.fields': USER_FIELDS })
    return NextResponse.json({ success: true, data: me.data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[TwitterProfile][PATCH] Error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
