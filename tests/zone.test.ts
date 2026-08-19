import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildExportPages, signSchedule, signScheduleDouble } from '../src/zone/export.ts'
import {
  buildZones,
  defaults,
  mirrorZones,
  parseStake,
  parseZoneParams,
  speedLimits,
  stake,
  validate,
  zoneExtent,
} from '../src/zone/utils.ts'
import { validateZone } from '../src/zone/validation.ts'
import { validateZoneObject, validateZoneParamsText } from '../functions/api/[[path]].ts'

describe('桩号工具', () => {
  it('解析常见桩号格式', () => {
    assert.equal(parseStake('K123+800'), 123800)
    assert.equal(parseStake('123＋050'), 123050)
    assert.equal(parseStake(' K0 + 005 '), 5)
    assert.equal(parseStake('100800'), 100800)
    assert.equal(parseStake('K12+1000'), null)
    assert.equal(parseStake('12.5+100'), null)
  })

  it('将米数格式化为标准桩号', () => {
    assert.equal(stake(123800), 'K123+800')
    assert.equal(stake(50), 'K0+050')
    assert.equal(stake(123800.6), 'K123+801')
  })
})

describe('分区计算', () => {
  it('上行严格使用用户输入长度，不做整百米对齐', () => {
    const zones = buildZones({ ...defaults, start: 'K123+800' })
    assert.deepEqual(zones.map((zone) => zone.length), [1600, 200, 150, 1000, 30, 30])
    assert.deepEqual(zones.map((zone) => [zone.start, zone.end]), [
      [121850, 123450],
      [123450, 123650],
      [123650, 123800],
      [123800, 124800],
      [124800, 124830],
      [124830, 124860],
    ])
    assert.equal(zones.reduce((sum, zone) => sum + zone.length, 0), 3010)
  })

  it('下行桩号按行车方向递减', () => {
    const zones = buildZones({ ...defaults, start: 'K123+800', direction: 'down' })
    assert.deepEqual(zones.map((zone) => [zone.start, zone.end]), [
      [125750, 124150],
      [124150, 123950],
      [123950, 123800],
      [123800, 122800],
      [122800, 122770],
      [122770, 122740],
    ])
  })

  it('双侧占路时两侧作业区范围重合、方向相反', () => {
    const zones = buildZones({ ...defaults, start: 'K123+800', workSide: 'median', doubleSide: true })
    const mirrored = mirrorZones(zones, 'up')
    assert.deepEqual([zones[3]!.start, zones[3]!.end], [123800, 124800])
    assert.deepEqual([mirrored[3]!.start, mirrored[3]!.end], [124800, 123800])
    assert.deepEqual(mirrored.map((zone) => zone.length), zones.map((zone) => zone.length))
    assert.deepEqual(zoneExtent(zones, mirrored), { min: 121850, max: 126750, span: 4900 })
  })
})

describe('参数校验', () => {
  it('默认模板合法，未启用布置不报错', () => {
    assert.deepEqual(validate(defaults), {})
    assert.deepEqual(validateZone(null), {})
  })

  it('拦截当前模板的长度、间距和速度边界', () => {
    const cases: [string, number][] = [
      ['work', 9], ['work', 4001], ['warning', 1599], ['warning', 1601],
      ['taper', 119], ['taper', 201], ['buffer', 99], ['buffer', 151],
      ['downstream', 29], ['terminal', 29], ['coneGap', 0], ['coneGap', 5],
      ['speed', 60], ['speed', 120],
    ]
    for (const [key, value] of cases) {
      assert.ok(validate({ ...defaults, [key]: value })[key], `应拦截 ${key}=${value}`)
    }
  })

  it('仅允许 80/100 两档设计速度', () => {
    assert.equal(validate({ ...defaults, speed: 80 }).speed, undefined)
    assert.equal(validate({ ...defaults, speed: 100 }).speed, undefined)
  })

  it('拦截会产生负桩号的上行、下行和双侧布置', () => {
    assert.ok(validate({ ...defaults, start: 'K1+949' }).start)
    assert.equal(validate({ ...defaults, start: 'K1+950' }).start, undefined)
    assert.ok(validate({ ...defaults, start: 'K1+059', direction: 'down' }).start)
    assert.equal(validate({ ...defaults, start: 'K1+060', direction: 'down' }).start, undefined)
    const doubleDown = { ...defaults, workSide: 'median' as const, doubleSide: true, direction: 'down' as const }
    assert.ok(validate({ ...doubleDown, start: 'K2+949' }).start)
    assert.equal(validate({ ...doubleDown, start: 'K2+950' }).start, undefined)
  })

  it('双侧占路仅允许中央分隔带施工', () => {
    assert.ok(validate({ ...defaults, doubleSide: true, workSide: 'roadside' }).workSide)
  })
})

describe('参数序列化兼容', () => {
  it('解析有效参数并为旧数据补默认 doubleSide', () => {
    const legacy = { ...defaults } as Record<string, unknown>
    delete legacy.doubleSide
    const parsed = parseZoneParams(JSON.stringify(legacy))
    assert.ok(parsed)
    assert.equal(parsed.doubleSide, false)
  })

  it('拒绝非法 JSON 和缺失必填字段', () => {
    assert.equal(parseZoneParams('{'), null)
    const incomplete = { ...defaults } as Record<string, unknown>
    delete incomplete.start
    assert.equal(parseZoneParams(JSON.stringify(incomplete)), null)
  })
})

describe('后端数据边界', () => {
  it('校验并规范化布置对象', () => {
    const result = validateZoneObject({ ...defaults, extra: '不应持久化' })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const saved = JSON.parse(result.params) as Record<string, unknown>
    assert.equal(saved.extra, undefined)
    assert.equal(saved.doubleSide, false)
    assert.equal(saved.speed, 100)
  })

  it('拒绝类型错误和超出模板范围的数值', () => {
    assert.equal(validateZoneObject({ ...defaults, work: '1000' }).ok, false)
    assert.equal(validateZoneObject({ ...defaults, downstream: 29 }).ok, false)
    assert.equal(validateZoneObject({ ...defaults, speed: 120 }).ok, false)
    assert.equal(validateZoneObject({ ...defaults, doubleSide: true, workSide: 'roadside' }).ok, false)
  })

  it('记录接口的 zone_params 支持 null，并拒绝非法 JSON', () => {
    assert.deepEqual(validateZoneParamsText(null), { ok: true, params: null })
    assert.equal(validateZoneParamsText('{').ok, false)
    assert.equal(validateZoneParamsText(JSON.stringify({ ...defaults, coneGap: 5 })).ok, false)
    assert.equal(validateZoneParamsText(JSON.stringify(defaults)).ok, true)
  })
})

describe('限速牌与标志位置', () => {
  it('按设计速度切换逐级限速', () => {
    assert.deepEqual(speedLimits(100), { first: 80, final: 60 })
    assert.deepEqual(speedLimits(80), { first: 60, final: 40 })
  })

  it('100km/h 模板输出 80→60，80km/h 模板输出 60→40', () => {
    const zones = buildZones(defaults)
    const rows100 = signSchedule(zones, 'up', 100)
    const rows80 = signSchedule(zones, 'up', 80)
    assert.equal(rows100[2]![1], '限速 80')
    assert.equal(rows100[4]![1], '限速 60')
    assert.match(rows100.at(-1)![1], /解除限速 60/)
    assert.equal(rows80[2]![1], '限速 60')
    assert.equal(rows80[4]![1], '限速 40')
    assert.match(rows80.at(-1)![1], /解除限速 40/)
  })

  it('标志桩号随上下行方向正确增减', () => {
    const upRows = signSchedule(buildZones(defaults), 'up', 100)
    const downParams = { ...defaults, direction: 'down' as const }
    const downRows = signSchedule(buildZones(downParams), 'down', 100)
    assert.equal(upRows[0]![2], 'K121+850')
    assert.equal(upRows[2]![2], 'K122+450')
    assert.equal(downRows[0]![2], 'K125+750')
    assert.equal(downRows[2]![2], 'K125+150')
  })

  it('双侧布置输出两个方向的完整标志表', () => {
    const zones = buildZones({ ...defaults, workSide: 'median', doubleSide: true })
    const rows = signScheduleDouble(zones, 'up', 100)
    assert.equal(rows.length, 18)
    assert.match(rows[0]![3], /^上行/)
    assert.match(rows[9]![3], /^下行/)
  })
})

describe('A4 两页导出', () => {
  function pages(doubleSide = false) {
    const params = { ...defaults, doubleSide, workSide: doubleSide ? 'median' as const : defaults.workSide }
    const zones = buildZones(params)
    return buildExportPages({
      diagrams: doubleSide
        ? [
            { svgViewBox: '0 0 400 1000', svgInner: '<g id="road-up"/>', caption: '上行' },
            { svgViewBox: '0 0 400 1000', svgInner: '<g id="road-down"/>', caption: '下行' },
          ]
        : [{ svgViewBox: '0 0 400 1000', svgInner: '<g id="road-fixture"/>' }],
      params,
      zones,
      signRows: signSchedule(zones, params.direction, params.speed),
      total: zones.reduce((sum, zone) => sum + zone.length, 0),
      doubleSide,
      orientation: 'portrait',
    })
  }

  it('拆成布置图与一览表两页，均为 A4 纵向', () => {
    const { diagramPages, tablePage } = pages()
    const diagramPage = diagramPages[0]!
    assert.equal(diagramPages.length, 1)
    assert.match(diagramPage, /width="210mm"/)
    assert.match(diagramPage, /height="297mm"/)
    assert.match(diagramPage, /viewBox="0 0 794 1123"/)
    assert.match(tablePage, /viewBox="0 0 794 1123"/)
    assert.match(diagramPage, /高速公路作业区布置图/)
    assert.match(diagramPage, /图 1　共 2 页/)
    assert.match(diagramPage, /id="road-fixture"/)
    assert.doesNotMatch(diagramPage, /各区域起止点/)
    assert.match(tablePage, /高速公路作业区一览表/)
    assert.match(tablePage, /图 2　共 2 页/)
    assert.match(tablePage, /表 1　各区域起止点/)
    assert.match(tablePage, /表 2　各标志牌位置/)
    assert.doesNotMatch(tablePage, /id="road-fixture"/)
  })

  it('布置图占用标题栏与页脚之间的整块图框', () => {
    const { diagramPages } = pages()
    assert.match(diagramPages[0]!, /<svg x="34" y="102" width="726" height="955"/)
  })

  it('一览表两张表拉高铺满图框', () => {
    const { tablePage } = pages()
    const heights = [...tablePage.matchAll(/stroke-width="1\.1"\/>/g)]
    assert.equal(heights.length, 2)
    const tableHeights = [...tablePage.matchAll(/<rect x="34" y="[\d.]+" width="726" height="([\d.]+)" fill="none" stroke="#1d1d1f" stroke-width="1\.1"\/>/g)]
      .map((match) => Number(match[1]))
    assert.equal(tableHeights.length, 2)
    const filled = (tableHeights[0] ?? 0) + (tableHeights[1] ?? 0) + 16
    assert.ok(Math.abs(filled - 955) < 1, `tables should fill 955px content, got ${filled}`)
    assert.ok((tableHeights[0] ?? 0) > 250, 'zone table should be stretched')
    assert.ok((tableHeights[1] ?? 0) > 350, 'sign table should be stretched')
  })

  it('双侧占路一览表并排上下行桩号，不翻倍行数', () => {
    const { tablePage } = pages(true)
    assert.match(tablePage, /上行起点/)
    assert.match(tablePage, /下行桩号/)
    assert.doesNotMatch(tablePage, /上行 · /)
  })

  it('双侧占路导出三页：上行图、下行图、一览表', () => {
    const { diagramPages, tablePage } = pages(true)
    assert.equal(diagramPages.length, 2)
    assert.match(diagramPages[0]!, /布置图（上行）/)
    assert.match(diagramPages[0]!, /图 1　共 3 页/)
    assert.match(diagramPages[0]!, /id="road-up"/)
    assert.doesNotMatch(diagramPages[0]!, /id="road-down"/)
    assert.match(diagramPages[1]!, /布置图（下行）/)
    assert.match(diagramPages[1]!, /图 2　共 3 页/)
    assert.match(diagramPages[1]!, /id="road-down"/)
    assert.match(tablePage, /图 3　共 3 页/)
  })
})
