import test from 'node:test'
import assert from 'node:assert/strict'
import { readingIndex } from '../src/lib/reading.ts'
const mixed=[{id:'photo-a',photo_path:'a.jpg',body:''},{id:'text',photo_path:null,body:'text reply'},{id:'photo-b',photo_path:'b.jpg',body:''}]
test('reading order includes text between photo replies',()=>{
  assert.equal(readingIndex(mixed,'photo-a'),0)
  assert.equal(readingIndex(mixed,'text'),1)
  assert.equal(readingIndex(mixed,'photo-b'),2)
})
test('direct reply links and previous-letter last reply resolve safely',()=>{
  assert.equal(readingIndex(mixed,null,true),2)
  assert.equal(readingIndex(mixed,'missing'),0)
  assert.equal(readingIndex([],null,true),0)
})
