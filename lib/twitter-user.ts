import { getTwitterClient } from '@/lib/twitter'

export async function getTwitterUserId(userId: string): Promise<string> {
  const client = await getTwitterClient(userId)
  const { data } = await client.readWrite.v2.me()
  return data.id
}
