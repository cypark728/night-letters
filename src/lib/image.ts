export interface Compressed {
  file: File
  originalBytes: number
  bytes: number
}

/**
 * 손글씨 사진용 압축: 긴 쪽 2000px, JPEG 85%.
 * 장당 보통 300~500KB → Supabase 무료 1GB로 1년 넘게 충분합니다.
 */
export async function compressPhoto(input: File): Promise<Compressed> {
  // 사진 올릴 때만 불러오도록 지연 로딩
  const { default: imageCompression } = await import('browser-image-compression')
  const out = await imageCompression(input, {
    maxWidthOrHeight: 2000,
    initialQuality: 0.85,
    maxSizeMB: 0.8,
    fileType: 'image/jpeg',
    useWebWorker: true,
  })
  const file = new File([out], 'letter.jpg', { type: 'image/jpeg' })
  return { file, originalBytes: input.size, bytes: file.size }
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}
