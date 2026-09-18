export const RETAILER_CONFIGS = {
  torrid: {
    priority: [
      'https://www.torrid.com/clothing/jeans/',
      'https://www.torrid.com/clothing/tops/sweaters/cardigans/',
      'https://www.torrid.com/sale/clearance/'
    ],
    productPattern: /\/product\//i,
    cap: 24
  },
  'lane-bryant': {
    priority: [
      'https://www.lanebryant.com/clothing/jeans',
      'https://www.lanebryant.com/clothing/sweaters-cardigans',
      'https://www.lanebryant.com/clearance'
    ],
    productPattern: /\/product\//i,
    cap: 24
  },
  maurices: {
    priority: [
      'https://www.maurices.com/category/plus-size/plus-size-jeans',
      'https://www.maurices.com/category/plus-size/plus-size-cardigans',
      'https://www.maurices.com/sale'
    ],
    productPattern: /\/product\//i,
    cap: 24
  },
  eloquii: {
    priority: [
      'https://www.eloquii.com/zq/denim/',
      'https://www.eloquii.com/zq/sweaters/',
      'https://www.eloquii.com/zq/clearance/'
    ],
    productPattern: /\/products?\//i,
    cap: 20
  },
  'lands-end': {
    priority: [
      'https://www.landsend.com/shop/womens-plus-size/S-xez-y5c-xh4-xec',
      'https://www.landsend.com/shop/womens-sweaters-cardigans/S-xfe-xez-y5c-xh4-xec',
      'https://www.landsend.com/shop/womens-jeans/S-xff-xez-y5c-xh4-xec'
    ],
    productPattern: /\/products?\//i,
    cap: 20
  },
  'universal-standard': {
    priority: [
      'https://www.universalstandard.com/collections/denim',
      'https://www.universalstandard.com/collections/sweaters',
      'https://www.universalstandard.com/collections/sale'
    ],
    productPattern: /\/products?\//i,
    cap: 20
  },
  'old-navy': {
    priority: [
      'https://oldnavy.gap.com/browse/category.do?cid=85729',
      'https://oldnavy.gap.com/browse/category.do?cid=20408',
      'https://oldnavy.gap.com/browse/category.do?cid=26190'
    ],
    productPattern: /product\.do\?[^#]*\bpid=/i,
    cap: 24
  },
  kohls: {
    priority: [
      'https://www.kohls.com/catalog/womens-plus-jeans-bottoms-clothing.jsp?CN=Gender:Womens+SizeRange:Plus+Product:Jeans+Department:Clothing',
      'https://www.kohls.com/catalog/womens-plus-cardigans-tops-clothing.jsp?CN=Gender:Womens+SizeRange:Plus+Product:Cardigans+Department:Clothing',
      'https://www.kohls.com/catalog/clearance.jsp'
    ],
    productPattern: /\/product\/prd-/i,
    cap: 18
  },
  jcpenney: {
    priority: [
      'https://www.jcpenney.com/g/women?product_type=jeans&womens_size_range=plus',
      'https://www.jcpenney.com/g/women?product_type=cardigans&womens_size_range=plus',
      'https://www.jcpenney.com/g/clearance?department=women'
    ],
    productPattern: /\/p\//i,
    cap: 20
  },
  bloomchic: {
    priority: [
      'https://bloomchic.com/collections/plus-size-jeans',
      'https://bloomchic.com/collections/cardigans',
      'https://bloomchic.com/collections/sale'
    ],
    productPattern: /\/products?\//i,
    cap: 22
  },
  glamorise: {
    priority: [
      'https://glamorise.com/collections/sports-bras',
      'https://glamorise.com/collections/wire-free-bras',
      'https://glamorise.com/collections/sale'
    ],
    productPattern: /\/products?\//i,
    cap: 10
  }
}

export function getRetailerConfig(slug, baseUrl) {
  const base = RETAILER_CONFIGS[slug] || { priority: [baseUrl], productPattern: /\/product\/|\/p\/|\/products?\/|product\.do\?[^#]*\bpid=/i, cap: 18 }
  return { ...base, priority: [...new Set([...(base.priority || []), baseUrl].filter(Boolean))] }
}
