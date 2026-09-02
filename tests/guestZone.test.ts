import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPublicHash, safeReturnHash } from '../src/guestZone.ts'
import { isPhotoComplete, isRecordComplete, photoTotal, recordStatus } from '../src/types.ts'
import { isValidWorkDate } from '../src/util.ts'

describe('登录回跳地址', () => {
  it('缺省或仍在登录页时回到首页', () => {
    assert.equal(safeReturnHash(undefined), '#/')
    assert.equal(safeReturnHash(''), '#/')
    assert.equal(safeReturnHash('#/login'), '#/')
    assert.equal(safeReturnHash('#/login?x=1'), '#/')
  })

  it('只接受本应用 hash', () => {
    assert.equal(safeReturnHash('#/layout'), '#/layout')
    assert.equal(safeReturnHash('#/layout/view'), '#/layout/view')
    assert.equal(safeReturnHash('#/help'), '#/help')
    assert.equal(safeReturnHash('https://evil.example/'), '#/')
    assert.equal(safeReturnHash('/layout'), '#/')
  })

  it('区分公开页与需登录页', () => {
    assert.equal(isPublicHash('#/'), true)
    assert.equal(isPublicHash('#/layout'), true)
    assert.equal(isPublicHash('#/layout/view'), true)
    assert.equal(isPublicHash('#/help'), true)
    assert.equal(isPublicHash('#/signs'), true)
    assert.equal(isPublicHash('#/zones/new'), true)
    assert.equal(isPublicHash('#/calendar'), false)
    assert.equal(isPublicHash('#/record/abc'), false)
    assert.equal(isPublicHash('#/zones'), false)
  })
})

describe('施工日期', () => {
  it('接受真实日历日，拒绝非法日期', () => {
    assert.equal(isValidWorkDate('2026-08-27'), true)
    assert.equal(isValidWorkDate('2024-02-29'), true)
    assert.equal(isValidWorkDate('2026-13-45'), false)
    assert.equal(isValidWorkDate('2025-02-29'), false)
    assert.equal(isValidWorkDate('2026-8-7'), false)
  })
})

describe('照片完整度', () => {
  it('三阶段各至少 1 张才算照片齐全', () => {
    assert.equal(isPhotoComplete({ before: 1, during: 1, after: 1 }), true)
    assert.equal(isPhotoComplete({ before: 2, during: 0, after: 3 }), false)
    assert.equal(photoTotal({ before: 1, during: 2, after: 3 }), 6)
  })
})

describe('台账资料完整度', () => {
  const photos = { before: 1, during: 1, after: 1 }
  const zone = JSON.stringify({ start: 'K128+600' })

  it('已完整必须同时有布置图和三照', () => {
    assert.equal(isRecordComplete(photos, zone), true)
    assert.equal(isRecordComplete(photos, null), false)
    assert.equal(isRecordComplete({ before: 1, during: 1, after: 0 }, zone), false)
    assert.equal(recordStatus(photos, zone).label, '已完整')
  })

  it('不齐时区分缺布置图、缺照片、施工中', () => {
    assert.equal(recordStatus(photos, null).label, '缺布置图')
    assert.equal(recordStatus({ before: 1, during: 0, after: 0 }, zone).label, '缺照片')
    assert.equal(recordStatus({ before: 1, during: 1, after: 0 }, zone).label, '施工中')
    assert.equal(recordStatus({ before: 0, during: 0, after: 0 }, null).label, '缺布置图和照片')
  })
})
