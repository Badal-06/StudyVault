import assert from 'node:assert/strict'
import test from 'node:test'
import { extractMaterialText } from './documentExtraction.js'
import {
  chunkMaterialText,
  chunkText,
  cosineSimilarity,
  mergeConversationContext,
} from './ragUtils.js'

test('extractMaterialText reads plain-text study files', async () => {
  const file = new Blob(['Unit 1\n\nPhotosynthesis basics'], { type: 'text/plain' })

  assert.equal(await extractMaterialText(file, 'biology-notes.txt'), 'Unit 1\n\nPhotosynthesis basics')
})

test('extractMaterialText clearly rejects legacy Word documents', async () => {
  const file = new Blob(['legacy document'], { type: 'application/msword' })

  await assert.rejects(
    extractMaterialText(file, 'notes.doc'),
    /Legacy \.doc files are not supported/,
  )
})

test('chunkText returns no chunks for empty input', () => {
  assert.deepEqual(chunkText(' \n '), [])
})

test('chunkText preserves overlapping passages within the configured size', () => {
  const chunks = chunkText('biology '.repeat(100), 100, 20)

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.length <= 100))
  assert.equal(chunks[0].slice(-20), chunks[1].slice(0, 20))
})

test('chunkMaterialText keeps PDF page numbers with their passages', () => {
  const chunks = chunkMaterialText({
    text: 'First page text\n\nSecond page text',
    pages: [
      { pageNumber: 1, text: 'First page text' },
      { pageNumber: 2, text: 'Second page text' },
    ],
  })

  assert.deepEqual(chunks, [
    { text: 'First page text', page: 1 },
    { text: 'Second page text', page: 2 },
  ])
})

test('mergeConversationContext carries recent source chunks into follow-up turns', () => {
  const previousContext = Array.from({ length: 5 }, (_, index) => ({
    id: `previous-${index + 1}`,
  }))
  const retrievedChunks = [
    previousContext[4],
    ...Array.from({ length: 4 }, (_, index) => ({ id: `current-${index + 1}` })),
  ]
  const messages = [{ role: 'model', context: previousContext }]

  assert.deepEqual(
    mergeConversationContext(messages, retrievedChunks).map((chunk) => chunk.id),
    ['previous-2', 'previous-3', 'previous-4', 'previous-5', 'current-1', 'current-2', 'current-3'],
  )
})

test('cosineSimilarity ranks identical and orthogonal vectors correctly', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
  assert.equal(cosineSimilarity([1], [1, 0]), 0)
})
