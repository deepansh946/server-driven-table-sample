/**
 * cellRegistry.tsx — maps each schema `type` to a React component.
 *
 * Adding a renderer is two steps: add the name to `CellType` in schema.ts and
 * add one line here. The registry is typed `Record<CellType, ...>`, so the
 * compiler won't let you do the first step without the second.
 */
import type { ComponentType } from 'react'
import { Tag } from 'antd'

import type { CellType, Row } from './schema'

export type CellProps = {
  value: unknown
  row: Row
  /** The column's `props` from the schema. */
  options: Record<string, unknown>
}

const display = (value: unknown) => (value == null ? '' : String(value))

const TextCell = ({ value }: CellProps) => <span>{display(value)}</span>

const NumberCell = ({ value }: CellProps) => (
  <span>{typeof value === 'number' ? value.toLocaleString() : '—'}</span>
)

const CurrencyCell = ({ value, options }: CellProps) => {
  if (typeof value !== 'number') return <span>—</span>
  const currency = typeof options.currency === 'string' ? options.currency : 'USD'
  return <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)}</span>
}

const TagsCell = ({ value }: CellProps) =>
  Array.isArray(value)
    ? (
      <>
        {value.map(tag => (
          <Tag key={String(tag)}>{String(tag)}</Tag>
        ))}
      </>
      )
    : null

/** `options.colors` / `options.labels` map a value to an antd colour / display label. */
const BadgeCell = ({ value, options }: CellProps) => {
  const colors = (options.colors ?? {}) as Record<string, string>
  const labels = (options.labels ?? {}) as Record<string, string>
  const key = display(value)
  return <Tag color={colors[key]}>{labels[key] ?? key}</Tag>
}

/**
 * `options.href` is a template filled from the row, e.g. "/suppliers/{supplierId}".
 * Only relative or http(s) links are allowed, so a bad schema can never
 * produce a `javascript:` URL.
 */
const LinkCell = ({ value, row, options }: CellProps) => {
  const template = typeof options.href === 'string' ? options.href : ''
  const href = template.replace(/\{(\w+)\}/g, (_, field: string) =>
    encodeURIComponent(display(row[field]))
  )
  const isSafe = href.startsWith('/') || /^https?:\/\//i.test(href)
  return isSafe ? <a href={href}>{display(value)}</a> : <span>{display(value)}</span>
}

/**
 * Used when the server sends a type this client build doesn't know yet (for
 * example, a newer backend deployed before the frontend). The table still renders.
 */
export const UnknownCell = ({ value }: CellProps) => (
  <span title='Unsupported cell type'>{display(value)}</span>
)

export const cellRegistry: Record<CellType, ComponentType<CellProps>> = {
  text: TextCell,
  number: NumberCell,
  currency: CurrencyCell,
  tags: TagsCell,
  badge: BadgeCell,
  link: LinkCell
}

export function getCell (type: string): ComponentType<CellProps> {
  // Own-property check, so a type like "constructor" can't reach Object.prototype.
  return Object.prototype.hasOwnProperty.call(cellRegistry, type)
    ? cellRegistry[type as CellType]
    : UnknownCell
}
