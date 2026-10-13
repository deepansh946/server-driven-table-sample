/**
 * buildColumns.tsx — turns a resolved schema into antd table columns.
 *
 * A pure function: same schema + same filter state always gives the same
 * columns. That makes it trivial to unit-test without rendering anything.
 */
import { Button, Input, InputNumber, Space } from 'antd'
import type { TableColumnType, TableColumnsType } from 'antd'
import type { FilterDropdownProps, FilterValue } from 'antd/es/table/interface'

import { getCell } from './cellRegistry'
import type { ResolvedFilterSpec, ResolvedTableSchema, Row } from './schema'

/** Current filter values keyed by column, in the shape antd's Table reports them. */
export type FilterState = Record<string, FilterValue | null>

function TextFilter ({ selectedKeys, setSelectedKeys, confirm, clearFilters }: FilterDropdownProps) {
  return (
    <Space style={{ padding: 8 }}>
      <Input
        autoFocus
        placeholder='Search'
        value={String(selectedKeys[0] ?? '')}
        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
      />
      <Button type='primary' onClick={() => confirm()}>Apply</Button>
      <Button onClick={() => { clearFilters?.(); confirm() }}>Reset</Button>
    </Space>
  )
}

type RangeFilterProps = FilterDropdownProps & { min: number; max: number }

function RangeFilter ({ selectedKeys, setSelectedKeys, confirm, clearFilters, min, max }: RangeFilterProps) {
  const [low = min, high = max] = selectedKeys as number[]
  return (
    <Space style={{ padding: 8 }}>
      <InputNumber<number> min={min} max={high} value={low} onChange={v => setSelectedKeys([v ?? min, high])} />
      –
      <InputNumber<number> min={low} max={max} value={high} onChange={v => setSelectedKeys([low, v ?? max])} />
      <Button type='primary' onClick={() => confirm()}>Apply</Button>
      <Button onClick={() => { clearFilters?.(); confirm() }}>Reset</Button>
    </Space>
  )
}

/** Translate one schema filter into the antd column props that implement it. */
function filterProps (
  key: string,
  filter: ResolvedFilterSpec | undefined,
  state: FilterState
): Partial<TableColumnType<Row>> {
  if (!filter) return {}
  // Controlled: the table shows whatever the parent's filter state says.
  const filteredValue = state[key] ?? null

  switch (filter.kind) {
    case 'text':
      return { filteredValue, filterDropdown: props => <TextFilter {...props} /> }
    case 'options':
      return {
        filteredValue,
        filters: filter.options.map(o => ({ text: o.label, value: o.value })),
        filterMultiple: filter.multiple ?? false
      }
    case 'range':
      return {
        filteredValue,
        filterDropdown: props => <RangeFilter {...props} min={filter.min} max={filter.max} />
      }
    default: {
      // Adding a new filter kind to schema.ts turns this into a compile error.
      const unhandled: never = filter
      return unhandled
    }
  }
}

export function buildColumns (schema: ResolvedTableSchema, state: FilterState): TableColumnsType<Row> {
  return Object.entries(schema.columns).map(([key, spec]) => {
    const Cell = getCell(spec.type)
    const options = spec.props ?? {}
    return {
      key,
      dataIndex: key,
      title: spec.label,
      width: spec.width,
      // `true` = server-side sorting. antd only reports the requested order.
      sorter: spec.sortable ?? false,
      render: (value: unknown, row: Row) => <Cell value={value} row={row} options={options} />,
      ...filterProps(key, spec.filter, state)
    }
  })
}
