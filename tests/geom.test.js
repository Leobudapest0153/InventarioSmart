import test from 'node:test'
import assert from 'node:assert/strict'
import { polygonArea, pointInPolygon } from '../src/utils/geom.js'

test('polygonArea calculates square area', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]
  assert.strictEqual(polygonArea(square), 100)
})

test('pointInPolygon detects point containment', () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]
  assert.equal(pointInPolygon({ x: 5, y: 5 }, poly), true)
  assert.equal(pointInPolygon({ x: 15, y: 5 }, poly), false)
})
