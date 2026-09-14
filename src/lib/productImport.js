export async function importRetailerProduct(url) {
  const response = await fetch('/api/product-metadata', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not import that retailer page.')
  return data
}

export function proxiedProductImage(url) {
  if (!url) return ''
  if (url.startsWith('/')) return url
  return `/api/product-image?url=${encodeURIComponent(url)}`
}