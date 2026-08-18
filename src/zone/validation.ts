import type { ZoneParams } from '../types'
import { validate } from './utils.ts'

/** 校验当前配置（供保存前调用）；未启用返回空错误表。 */
export function validateZone(value: ZoneParams | null): Record<string, string> {
  return value ? validate(value) : {}
}
