import test from 'node:test'
import assert from 'node:assert/strict'
import { PhotoUrlCache } from '../src/lib/photoUrlCache.ts'

test('returning to the same photographs reuses identical links without another request',async()=>{
  const cache=new PhotoUrlCache();let calls=0
  const fetcher=async paths=>{calls++;return Object.fromEntries(paths.map(p=>[p,`signed:${p}:${calls}`]))}
  const first=await cache.get(['a','b'],fetcher)
  assert.deepEqual(await cache.get(['b','a'],fetcher),{b:first.b,a:first.a})
  assert.equal(calls,1)
})
test('overlapping concurrent requests share pending links',async()=>{
  const cache=new PhotoUrlCache();const calls=[]
  const fetcher=async paths=>{calls.push(paths);return Object.fromEntries(paths.map(p=>[p,p]))}
  const [one,two]=await Promise.all([cache.get(['a','b'],fetcher),cache.get(['b','c'],fetcher)])
  assert.deepEqual(calls,[['a','b'],['c']]);assert.equal(one.b,two.b)
})
test('expiry and explicit retry request fresh links',async()=>{
  let now=0,calls=0;const cache=new PhotoUrlCache(()=>now,100)
  const fetcher=async()=>({a:`url-${++calls}`})
  assert.equal((await cache.get(['a'],fetcher)).a,'url-1')
  now=101
  assert.equal((await cache.get(['a'],fetcher)).a,'url-2')
  assert.equal((await cache.get(['a'],fetcher,true)).a,'url-3')
})
test('failed requests do not poison retries',async()=>{
  const cache=new PhotoUrlCache()
  await assert.rejects(cache.get(['a'],async()=>{throw Error('offline')}))
  assert.deepEqual(await cache.get(['a'],async()=>({a:'recovered'})),{a:'recovered'})
})
test('logout clears links and prevents an earlier request from repopulating cache',async()=>{
  const cache=new PhotoUrlCache();let resolve
  const before=cache.get(['a'],()=>new Promise(r=>{resolve=r}))
  await Promise.resolve();cache.clear();resolve({a:'old-user'})
  await before
  assert.deepEqual(await cache.get(['a'],async()=>({a:'new-user'})),{a:'new-user'})
})
