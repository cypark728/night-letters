import test from 'node:test'
import assert from 'node:assert/strict'
import { ReplyCache } from '../src/lib/replyCache.ts'

test('list and reader share replies and concurrent next-letter prefetch',async()=>{
  const cache=new ReplyCache();let calls=0
  const load=async()=>{calls++;return [{id:'text',photo_path:null},{id:'photo',photo_path:'p.jpg'}]}
  const [prefetched,reader]=await Promise.all([cache.get('next',load),cache.get('next',load)])
  assert.equal(calls,1);assert.equal(prefetched,reader)
  assert.equal(await cache.get('next',load),reader);assert.equal(calls,1)
})
test('saving, deleting or logout invalidation prevents in-flight stale data returning to cache',async()=>{
  const cache=new ReplyCache();let finish
  const stale=cache.get('day',()=>new Promise(r=>{finish=r}))
  await Promise.resolve();cache.clear();finish('old');await stale
  assert.equal(await cache.get('day',async()=>'fresh'),'fresh')
})
test('cache expires on next access without polling or automatic reload',async()=>{
  let now=0,calls=0;const cache=new ReplyCache(()=>now)
  const load=async()=>++calls
  assert.equal(await cache.get('day',load),1)
  now=300001;assert.equal(calls,1)
  assert.equal(await cache.get('day',load),2)
})
test('prefetch failure allows a normal reader retry',async()=>{
  const cache=new ReplyCache()
  await assert.rejects(cache.get('day',async()=>{throw Error('offline')}))
  assert.equal(await cache.get('day',async()=>'ok'),'ok')
})
