/**
 * demo/data.ts — made-up records for the in-browser mock API.
 */
import type { Row, TableSchema } from '../schema'

export const suppliers = [
  { id: 's1', name: 'Northwind Supply', country: 'US', rating: 4.6, website: 'https://example.com/northwind' },
  { id: 's2', name: 'Blue Fern Labs', country: 'DE', rating: 4.1, website: 'https://example.com/bluefern' },
  { id: 's3', name: 'Kestrel Systems', country: 'IN', rating: 4.8, website: 'https://example.com/kestrel' },
  { id: 's4', name: 'Harbor & Pine', country: 'CA', rating: 3.9, website: 'https://example.com/harbor' }
]

const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? ''

const product = (
  id: number,
  name: string,
  category: string,
  price: number,
  tags: string[],
  inStock: boolean,
  supplierId: string
): Row => ({ id, name, category, price, tags, inStock, supplierId, supplierName: supplierName(supplierId) })

export const products: Row[] = [
  product(1, 'Mechanical keyboard', 'hardware', 129, ['peripherals'], true, 's1'),
  product(2, '4K monitor', 'hardware', 449, ['display'], false, 's3'),
  product(3, 'Ergonomic mouse', 'hardware', 79, ['peripherals'], true, 's1'),
  product(4, 'USB-C dock', 'hardware', 189, ['peripherals', 'office'], true, 's4'),
  product(5, 'Noise-cancelling headset', 'hardware', 249, ['audio'], false, 's2'),
  product(6, 'Standing desk', 'hardware', 699, ['office'], true, 's4'),
  product(7, 'Password manager (annual)', 'software', 36, ['security'], true, 's2'),
  product(8, 'Design suite licence', 'software', 599, ['creative'], true, 's3'),
  product(9, 'Backup service', 'software', 120, ['security', 'cloud'], true, 's2'),
  product(10, 'IDE licence', 'software', 249, ['developer'], false, 's3'),
  product(11, 'Video calling plan', 'software', 180, ['cloud'], true, 's1'),
  product(12, 'Laptop setup', 'services', 150, ['onboarding'], true, 's4'),
  product(13, 'Security audit', 'services', 4_500, ['security'], true, 's3'),
  product(14, 'Office move', 'services', 2_200, ['office'], false, 's4'),
  product(15, 'Training workshop', 'services', 950, ['onboarding'], true, 's1')
]

/**
 * A second table, to show the same <SchemaTable> rendering a completely
 * different list with no frontend changes.
 */
export const suppliersSchema: TableSchema = {
  key: 'suppliers',
  title: 'Suppliers',
  description: 'Who we buy from.',
  columns: {
    name: { label: 'Supplier', type: 'text', sortable: true, filter: { kind: 'text' } },
    country: {
      label: 'Country',
      type: 'text',
      filter: { kind: 'remoteOptions', endpoint: '/countries', multiple: true }
    },
    rating: { label: 'Rating', type: 'number', sortable: true, filter: { kind: 'range', min: 0, max: 5 } },
    website: { label: 'Website', type: 'link', props: { href: '{website}' } }
  }
}
