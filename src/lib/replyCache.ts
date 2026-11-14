// Shared by the letter list, reader and next-letter prefetch. No background refresh.
export class ReplyCache<T> {
  private values=new Map<string,{value:T;expires:number}>()
  private pending=new Map<string,Promise<T>>()
  private generation=0
  private now:()=>number
  constructor(now:()=>number=Date.now){this.now=now}
  clear(){this.generation++;this.values.clear();this.pending.clear()}
  get(key:string,load:()=>Promise<T>):Promise<T>{
    const cached=this.values.get(key)
    if(cached && cached.expires>this.now()) return Promise.resolve(cached.value)
    const pending=this.pending.get(key)
    if(pending) return pending
    const generation=this.generation
    const request=Promise.resolve().then(load).then(value=>{
      if(generation===this.generation){
        this.values.set(key,{value,expires:this.now()+5*60*1000})
        while(this.values.size>30) this.values.delete(this.values.keys().next().value!)
      }
      return value
    }).finally(()=>{if(this.pending.get(key)===request)this.pending.delete(key)})
    this.pending.set(key,request)
    return request
  }
}
