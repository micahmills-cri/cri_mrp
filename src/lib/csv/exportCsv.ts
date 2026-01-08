/**
 * CSV Export Utilities
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCsv<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) {
    return headers.map((h) => escapeCsvValue(h.label)).join(',')
  }

  // Header row
  const headerRow = headers.map((h) => escapeCsvValue(h.label)).join(',')

  // Data rows
  const dataRows = data.map((row) => {
    return headers
      .map((h) => {
        const value = row[h.key]
        return escapeCsvValue(value)
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Create downloadable CSV file response
 */
export function createCsvResponse(csvContent: string, filename: string): Response {
  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
