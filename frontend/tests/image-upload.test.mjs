import assert from 'node:assert/strict'
import test from 'node:test'
import { imageContentType } from '../src/lib/imageUpload.ts'

const jpeg = [0xff, 0xd8, 0xff, 0xe0]
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const webp = [0x52, 0x49, 0x46, 0x46, 20, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]

for (const [name, header, expected] of [
  ['JPG', jpeg, 'image/jpeg'], ['JPEG', jpeg, 'image/jpeg'],
  ['PNG', png, 'image/png'], ['WebP', webp, 'image/webp'],
]) {
  test(`${name} is detected independently of the browser MIME type`, async () => {
    for (const type of ['', 'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream']) {
      assert.equal(await imageContentType(new Blob([new Uint8Array(header)], { type })), expected)
    }
  })
}

test('a WebP renamed to .jpg is uploaded with WebP MIME type', async () => {
  const file = new File([new Uint8Array(webp)], 'paper-bags-500x500.jpg', { type: 'image/jpeg' })
  assert.equal(await imageContentType(file), 'image/webp')
})

test('invalid content, SVG and GIF cannot pass by using a JPEG MIME type', async () => {
  for (const body of ['hello', '<svg/>', 'GIF89a', 'RIFF1234WAVE', '\xff\xd8']) {
    await assert.rejects(imageContentType(new Blob([body], { type: 'image/jpeg' })), /not a JPG/)
  }
})

test('empty and oversized files fail before reading their contents', async () => {
  await assert.rejects(imageContentType(new Blob([])), /up to 10 MB/)
  await assert.rejects(imageContentType(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)])), /up to 10 MB/)
})
