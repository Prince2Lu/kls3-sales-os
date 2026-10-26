import { revalidatePath } from 'next/cache'

export async function revalidateCrmContext() {
  // Dynamic detail pages must be invalidated too: prefetched contact pages can otherwise stay stale.
  for (const path of ['/contacts/[id]', '/companies/[id]', '/prospects/[id]', '/relationships/[id]']) {
    revalidatePath(path, 'page')
  }
  for (const path of ['/contacts', '/companies', '/prospects', '/cold-call', '/today', '/focus', '/planning']) revalidatePath(path)
}
