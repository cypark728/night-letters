import test from 'node:test'
import assert from 'node:assert/strict'
import { saveWithPhotoCleanup } from '../src/lib/saveReply.ts'

test('lost save response never deletes either old or newly committed photo', async () => {
  let databasePhoto = 'old.jpg'
  const removed=[]
  await assert.rejects(saveWithPhotoCleanup({photo_path:'new.jpg'}, 'old.jpg', {
    save: async input => { databasePhoto=input.photo_path; throw Error('response disconnected') },
    remove: async path => { removed.push(path) }
  }))
  assert.equal(databasePhoto,'new.jpg')
  assert.deepEqual(removed,[])
})
test('successful replacement removes only old photo after saving', async () => {
  const events=[]
  await saveWithPhotoCleanup({photo_path:'new.jpg'},'old.jpg',{
    save:async()=>{events.push('saved')},remove:async path=>{events.push(path)}
  })
  assert.deepEqual(events,['saved','old.jpg'])
})
test('cleanup failure does not turn successful save into a failure', async () => {
  await saveWithPhotoCleanup({photo_path:'new.jpg'},'old.jpg',{
    save:async()=>{},remove:async()=>{throw Error('storage unavailable')}
  })
})
