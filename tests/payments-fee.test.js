// Run with: bun test tests/payments-fee.test.js   (from the repo root)
import { describe, expect, test } from 'bun:test'
import { computeFee } from '../node/sovereign-payments-hyperswitch/src/main.js'

describe('payments commission', () => {
  test('default 2.8% + 0.60 flat', () => {
    expect(computeFee(10000, 280, 60)).toBe(340) // 280 + 60
  })
  test('fee never exceeds gross (aionflow P0 guard)', () => {
    expect(computeFee(30, 280, 60)).toBe(30)
    expect(computeFee(100, 10000, 10000)).toBe(100)
  })
  test('0% pass-through', () => {
    expect(computeFee(10000, 0, 0)).toBe(0)
  })
})
