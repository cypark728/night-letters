export type ReplyShareData = { text: string; files?: never } | { files: File[]; text?: never }

export function replyShareData(body: string, file?: File): ReplyShareData {
  return file ? { files: [file] } : { text: body }
}

type ShareTarget = {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

// Call directly from the click handler; file preparation happens beforehand.
export async function shareReply(data: ReplyShareData, target: ShareTarget = navigator): Promise<'closed' | 'cancelled' | 'unsupported'> {
  if (!target.share || (data.files && (!target.canShare || !target.canShare({ files: data.files })))) return 'unsupported'
  try {
    await target.share(data)
    return 'closed' // Does not prove delivery to a KakaoTalk chat.
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
