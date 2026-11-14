// Read every reply, including replies containing only text.
export function readingIndex(entries: readonly {id:string}[], selected:string|null, last=false):number {
  const index=entries.findIndex(entry=>entry.id===selected)
  return index >= 0 ? index : last ? Math.max(0,entries.length-1) : 0
}
