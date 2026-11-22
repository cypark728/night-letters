import test from 'node:test'
import assert from 'node:assert/strict'
import { replyShareData, shareReply } from '../src/lib/shareReply.ts'

test('text is passed verbatim with no name, link, title or announcement', async () => {
  const body = '  첫 줄\n\n두 번째 줄 🙏  '
  let received
  const result = await shareReply(replyShareData(body), {share:async value => {received=value}})
  assert.deepEqual(received,{text:body})
  assert.equal(result,'closed')
})
test('photo passes the selected file bytes only, never a URL or caption', async () => {
  const file=new File(['test image bytes'],'letter.jpg',{type:'image/jpeg'})
  let received
  await shareReply(replyShareData('hidden body',file),{canShare:()=>true,share:async value=>{received=value}})
  assert.deepEqual(Object.keys(received),['files'])
  assert.equal(received.files[0],file)
  assert.equal(await received.files[0].text(),'test image bytes')
})
test('unsupported file sharing does not invoke share or fall back to text',async()=>{
  let calls=0
  const result=await shareReply(replyShareData('body',new File(['x'],'letter.jpg')),{canShare:()=>false,share:async()=>{calls++}})
  assert.equal(result,'unsupported');assert.equal(calls,0)
  assert.equal(await shareReply(replyShareData('body'),{}),'unsupported')
})
test('share picker opens immediately in the click call stack, before awaiting',async()=>{
  let opened=false
  const pending=shareReply(replyShareData('body'),{share:async()=>{opened=true}})
  assert.equal(opened,true)
  await pending
})
test('cancelling the native picker is a normal outcome',async()=>{
  const error=new Error('cancelled');error.name='AbortError'
  assert.equal(await shareReply(replyShareData('body'),{share:async()=>{throw error}}),'cancelled')
})
test('unexpected platform failure can be retried without changing the payload',async()=>{
  const data=replyShareData('unchanged')
  await assert.rejects(shareReply(data,{share:async()=>{throw Error('platform failed')}}))
  let received
  await shareReply(data,{share:async value=>{received=value}})
  assert.deepEqual(received,{text:'unchanged'})
})
