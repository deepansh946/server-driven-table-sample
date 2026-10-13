/**
 * SchemaTable.tsx — a complete list page for any table the server describes.
 *
 *   <SchemaTable tableKey='products' />
 *
 * Filtering, sorting and paging all happen on the server. This component
 * only holds that state and turns it into query params.
 */
import { useMemo, useState } from 'react'
import { Alert, Spin, Table, Typography } from 'antd'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchRows, fetchSchema, resolveRemoteFilters } from './api'
import { buildColumns } from './buildColumns'
import type { FilterState } from './buildColumns'
import type { Row } from './schema'

type Sort = { field: string; order: 'asc' | 'desc' }
type Paging = { current: number; pageSize: number }

export function useTableSchema (tableKey: string) {
  return useQuery({
    queryKey: ['table-schema', tableKey],
    queryFn: async () => resolveRemoteFilters(await fetchSchema(tableKey)),
    // Schemas change when the backend deploys, not from one request to the next.
    staleTime: 5 * 60_000
  })
}

/**
 * ?page=2&pageSize=25&filter[category]=hardware&filter[price]=10&filter[price]=500&sort=price:desc
 * The server reads the schema too, so it knows filter[price] is a [min, max]
 * range and filter[category] is a list of choices.
 */
function toSearchParams (filters: FilterState, paging: Paging, sort?: Sort) {
  const params = new URLSearchParams({
    page: String(paging.current),
    pageSize: String(paging.pageSize)
  })
  for (const [field, values] of Object.entries(filters)) {
    for (const value of values ?? []) params.append(`filter[${field}]`, String(value))
  }
  if (sort) params.set('sort', `${sort.field}:${sort.order}`)
  return params
}

export function SchemaTable ({ tableKey }: { tableKey: string }) {
  const schemaQuery = useTableSchema(tableKey)
  const [filters, setFilters] = useState<FilterState>({})
  const [paging, setPaging] = useState<Paging>({ current: 1, pageSize: 25 })
  const [sort, setSort] = useState<Sort>()

  const params = toSearchParams(filters, paging, sort)
  const rowsQuery = useQuery({
    queryKey: ['table-rows', tableKey, params.toString()],
    queryFn: () => fetchRows(tableKey, params),
    enabled: schemaQuery.isSuccess,
    // Keep the current page on screen while the next one loads (no flash of empty table).
    placeholderData: keepPreviousData
  })

  const columns = useMemo(
    () => (schemaQuery.data ? buildColumns(schemaQuery.data, filters) : []),
    [schemaQuery.data, filters]
  )

  if (schemaQuery.isPending) return <Spin size='large' />
  if (schemaQuery.isError) {
    return <Alert type='error' message='Could not load this table' description={schemaQuery.error.message} />
  }

  const { title, description } = schemaQuery.data

  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      {description && <Typography.Paragraph type='secondary'>{description}</Typography.Paragraph>}
      {rowsQuery.isError && (
        <Alert type='error' message='Could not load rows' description={rowsQuery.error.message} />
      )}
      <Table<Row>
        rowKey='id'
        columns={columns}
        dataSource={rowsQuery.data?.rows}
        loading={rowsQuery.isFetching}
        pagination={{ ...paging, total: rowsQuery.data?.total }}
        onChange={(pagination: { current: any; pageSize: any }, nextFilters: any, sorter: any[], { action }: any) => {
          setFilters(nextFilters)
          setPaging((prev: { pageSize: any }) => ({
            // A new filter or sort makes the old page number meaningless.
            current: action === 'paginate' ? pagination.current ?? 1 : 1,
            pageSize: pagination.pageSize ?? prev.pageSize
          }))
          const s = Array.isArray(sorter) ? sorter[0] : sorter
          setSort(
            s?.order
              ? { field: String(s.columnKey ?? s.field), order: s.order === 'ascend' ? 'asc' : 'desc' }
              : undefined
          )
        }}
      />
    </div>
  )
}
