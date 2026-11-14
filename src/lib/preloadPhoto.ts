// Keep a few recent images in memory; preload only the next photo in reading order.
const recent = new Map<string, HTMLImageElement>()
export function preloadPhoto(url:string) {
  if(recent.has(url)) return
  const image=new Image()
  image.decoding='async'
  image.fetchPriority='low'
  image.onerror=()=>{if(recent.get(url)===image) recent.delete(url)}
  image.src=url
  recent.set(url,image)
  while(recent.size>8) recent.delete(recent.keys().next().value!)
}
export function clearPreloadedPhotos() { recent.clear() }
