// Memory only: never persist private photo links across browser sessions.
export class PhotoUrlCache {
  private values = new Map<string, {url:string; expires:number}>()
  private pending = new Map<string, Promise<string | undefined>>()
  private generation = 0
  private now:()=>number
  private ttl:number
  constructor(now:()=>number = Date.now, ttl = 55 * 60 * 1000) { this.now=now; this.ttl=ttl }
  clear() { this.generation++; this.values.clear(); this.pending.clear() }
  async get(paths:string[], fetcher:(paths:string[])=>Promise<Record<string,string>>, force=false):Promise<Record<string,string>> {
    const unique=[...new Set(paths.filter(Boolean))]
    if(force) for(const path of unique) { this.values.delete(path); this.pending.delete(path) }
    const missing=unique.filter(path=>{
      const value=this.values.get(path)
      return !(value && value.expires>this.now()) && !this.pending.has(path)
    })
    if(missing.length) {
      const generation=this.generation
      const expires=this.now()+this.ttl
      const batch=Promise.resolve().then(()=>fetcher(missing))
      for(const path of missing) {
        const pending=batch.then(result=>{
          const url=result[path]
          if(url && generation===this.generation && this.pending.get(path)===pending) {
            this.values.set(path,{url,expires})
            while(this.values.size>180) this.values.delete(this.values.keys().next().value!)
          }
          return url
        }).finally(()=>{if(this.pending.get(path)===pending) this.pending.delete(path)})
        this.pending.set(path,pending)
      }
    }
    const rows=await Promise.all(unique.map(async path=>{
      const value=this.values.get(path)
      return [path, value && value.expires>this.now() ? value.url : await this.pending.get(path)] as const
    }))
    return Object.fromEntries(rows.filter((row):row is readonly [string,string]=>!!row[1]))
  }
}
