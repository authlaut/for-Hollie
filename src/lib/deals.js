import { supabase, supabaseConfigured } from './supabase'

function hoursAgo(dateText) {
  if (!dateText) return Infinity
  return (Date.now() - new Date(dateText).getTime()) / 36e5
}

export async function loadLiveDeals(userId) {
  if (!supabaseConfigured) return { deals: [], lastScan: null, error: null }

  const [{ data: dealRows, error: dealError }, { data: scanRows }] = await Promise.all([
    supabase.from('fh_deals').select(`
      id, sale_price, regular_price, discount_percent, deal_quality, clearance,
      first_detected_at, last_verified_at, expires_at,
      product:fh_products!inner(
        id, product_name, canonical_url, primary_image_url, primary_category, subcategory,
        color_name, active,
        retailer:fh_retailers(id,name,slug),
        tags:fh_product_tags(tag_type,tag_value)
      ),
      variant:fh_product_variants(id,size,size_normalized,color,size_verified,inventory_status,in_stock,last_verified_at)
    `).eq('qualifies_for_feed', true).order('last_verified_at', { ascending:false }).limit(500),
    supabase.from('fh_retailer_scans').select('finished_at,status').eq('status','success').order('finished_at',{ascending:false}).limit(1)
  ])

  if (dealError) return { deals: [], lastScan: scanRows?.[0]?.finished_at || null, error: dealError }

  let scores = []
  if (userId && dealRows?.length) {
    const ids = dealRows.map(d=>d.id)
    const { data } = await supabase.from('fh_deal_scores').select('deal_id,final_score,reason_summary').eq('owner_user_id',userId).in('deal_id',ids)
    scores = data || []
  }
  const scoreMap = new Map(scores.map(s=>[s.deal_id,s]))

  const productIds = [...new Set((dealRows||[]).map(d=>d.product?.id).filter(Boolean))]
  let histories=[]
  if (productIds.length) {
    const { data } = await supabase.from('fh_price_history').select('product_id,observed_price,observed_at').in('product_id',productIds).order('observed_at',{ascending:false}).limit(3000)
    histories=data||[]
  }
  const minPrice = new Map()
  for (const h of histories) {
    const p=Number(h.observed_price)
    if (!minPrice.has(h.product_id) || p<minPrice.get(h.product_id)) minPrice.set(h.product_id,p)
  }

  const deals = (dealRows||[])
    .filter(d => d.product?.active !== false && d.variant?.size_verified === true && d.variant?.inventory_status === 'verified_in_stock' && d.variant?.in_stock !== false)
    .map(d => {
      const tags=d.product?.tags||[]
      const occasion=tags.filter(t=>t.tag_type==='occasion').map(t=>t.tag_value)
      const season=tags.filter(t=>t.tag_type==='season').map(t=>t.tag_value)
      const score=scoreMap.get(d.id)
      const lowest=minPrice.get(d.product?.id)
      const quality = d.deal_quality || (Number(d.discount_percent)>=70?'exceptional':Number(d.discount_percent)>=55?'strong_buy':'good_deal')
      return {
        id:d.id,
        productId:d.product?.id,
        variantId:d.variant?.id,
        store:d.product?.retailer?.name || 'Retailer',
        retailerId:d.product?.retailer?.id,
        name:d.product?.product_name || 'Product',
        regular:Number(d.regular_price ?? d.sale_price ?? 0),
        sale:Number(d.sale_price ?? 0),
        discount:Math.round(Number(d.discount_percent ?? 0)),
        size:d.variant?.size || d.variant?.size_normalized || 'Verified size',
        match:Math.round(Number(score?.final_score ?? 0)),
        reason:score?.reason_summary || 'Verified deal in Hollie’s size',
        badge:quality==='exceptional'?'Exceptional':quality==='strong_buy'?'Strong Buy':quality==='wildcard'?'Wildcard':'Good Wardrobe Add',
        level:quality==='exceptional'?'exceptional':'strong',
        category:d.product?.primary_category || 'Other',
        subcategory:d.product?.subcategory || '',
        occasion,
        season,
        verified:true,
        newDeal:hoursAgo(d.first_detected_at) <= 24,
        priceDrop:false,
        lowestSeen:lowest != null && Number(d.sale_price) <= lowest,
        image:d.product?.primary_image_url || null,
        url:d.product?.canonical_url || null,
        lastVerified:d.variant?.last_verified_at || d.last_verified_at
      }
    })
  return { deals, lastScan: scanRows?.[0]?.finished_at || null, error:null }
}

export function formatScanTime(value) {
  if (!value) return 'Not scanned yet'
  const d=new Date(value)
  return d.toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
}
