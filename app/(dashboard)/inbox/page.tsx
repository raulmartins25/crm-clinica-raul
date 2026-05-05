import { getSession } from '@/lib/auth'
import { InboxClient } from './InboxClient'

export default async function InboxPage() {
  const session = await getSession()
  return <div className="flex flex-col flex-1 min-h-0 overflow-hidden"><InboxClient session={session!} /></div>
}
