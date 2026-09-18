export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

export function normalizeUrl(raw){
  try{
    const u=new URL(raw); u.hash=''
    for(const key of [...u.searchParams.keys()]) if(/^utm_|^fbclid$|^gclid$|^source$|^cmpid$/i.test(key))u.searchParams.delete(key)
    return u.href
  }catch{return raw}
}

export function sameRetailerHost(baseUrl, candidate){
  try{
    const a=new URL(baseUrl).hostname.toLowerCase().replace(/^www\./,'')
    const b=new URL(candidate).hostname.toLowerCase().replace(/^www\./,'')
    if(a.includes('oldnavy.gap.com')) return b==='oldnavy.gap.com'
    return b===a || b.endsWith(`.${a}`)
  }catch{return false}
}

export function inferCategory(text=''){
  const s=String(text).toLowerCase()
  if(/bra|bralette|panty|intimate|lingerie/.test(s))return'Intimates'
  if(/jean|denim|pant|legging|trouser|skirt|short/.test(s))return'Bottoms'
  if(/cardigan|jacket|coat|blazer|sweater|shacket|duster|wrap/.test(s))return'Layers'
  if(/dress|gown|jumpsuit|romper/.test(s))return'Dresses'
  if(/sneaker|shoe|boot|flat|loafer|sandal|slipper/.test(s))return'Shoes'
  if(/pajama|sleep|robe|lounge/.test(s))return'Lounge'
  if(/active|workout|yoga|performance|sport/.test(s))return'Active'
  if(/swim|swimsuit|tankini|bikini/.test(s))return'Swim'
  if(/bag|handbag|crossbody|belt|earring|necklace|bracelet|scarf|tights|hair/.test(s))return'Accessories'
  return'Tops'
}

export function discountPct(sale,regular){
  sale=Number(sale);regular=Number(regular)
  return Number.isFinite(sale)&&Number.isFinite(regular)&&regular>sale?Math.round((1-sale/regular)*10000)/100:0
}

function pricePolicy(category){
  return ({Tops:{maxRegular:250,maxRatio:6},Layers:{maxRegular:600,maxRatio:7},Bottoms:{maxRegular:350,maxRatio:6},Dresses:{maxRegular:400,maxRatio:7},Intimates:{maxRegular:200,maxRatio:6},Lounge:{maxRegular:250,maxRatio:6},Shoes:{maxRegular:300,maxRatio:6},Active:{maxRegular:300,maxRatio:6},Swim:{maxRegular:300,maxRatio:6},Accessories:{maxRegular:500,maxRatio:8}})[category]||{maxRegular:500,maxRatio:8}
}
export function validMarkdown(sale,regular,category){
  sale=Number(sale);regular=Number(regular)
  if(!Number.isFinite(sale)||!Number.isFinite(regular)||sale<=0||regular<=sale)return false
  const p=pricePolicy(category)
  return regular<=p.maxRegular && regular/sale<=p.maxRatio && discountPct(sale,regular)<=90
}
export function qualifies(sale,regular,category){
  const d=discountPct(sale,regular)
  const caps={Tops:35,Layers:45,Bottoms:45,Dresses:50,Intimates:45,Lounge:35,Shoes:50,Active:40,Swim:40,Accessories:35}
  const targets={Tops:25,Layers:35,Bottoms:45,Dresses:45,Intimates:40,Lounge:35,Shoes:50,Active:35,Swim:35,Accessories:30}
  const priority=new Set(['Bottoms','Layers','Intimates','Shoes'])
  const cap=caps[category]||35,target=targets[category]||35
  if(!validMarkdown(sale,regular,category)||d<20)return false
  if(d>=50)return true
  if(d>=35&&sale<=cap)return true
  if(d>=25&&priority.has(category)&&sale<=cap)return true
  if(d>=25&&sale<=target)return true
  return d>=20&&sale<=target*.78
}
export function quality(d){return d>=70?'exceptional':d>=50?'strong_buy':d>=35?'good_deal':'wildcard'}

export function parseMoney(value){
  if(value==null)return null
  const m=String(value).replace(/,/g,'').match(/(?:\$|USD\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i)
  return m?Number(m[1]):null
}

export function cleanSize(raw=''){
  return String(raw).trim().replace(/\s+/g,' ').replace(/^size\s*/i,'').replace(/\(.*?\)/g,'').trim()
}
export function normalizeSize(raw=''){
  return cleanSize(raw).toUpperCase().replace(/EXTRA LARGE/g,'XL').replace(/XXX LARGE|3X LARGE/g,'3X').replace(/XXXL/g,'3X').replace(/3XL/g,'3X').replace(/WOMEN'?S/g,'').replace(/\s+/g,'')
}
export function sizeMatchesBrowser(candidate, desired, retailerSlug, category){
  const c=normalizeSize(candidate), d=normalizeSize(desired)
  if(!c||!d)return false
  if(category==='Bottoms'){
    const cNum=c.match(/^(\d{1,2})(?:W|R|REGULAR|S|SHORT|L|LONG)?$/)?.[1]
    const dNum=d.match(/^(\d{1,2})(?:W|R|REGULAR|S|SHORT|L|LONG)?$/)?.[1]
    return Boolean(cNum&&dNum&&cNum===dNum)
  }
  if(retailerSlug==='torrid' && /^(TOPS|LAYERS|DRESSES)$/i.test(category) && c==='3' && /^(3X|3XL|24-26|24\/26|24|26|3)$/.test(d))return true
  if(c===d)return true
  if((c==='3X'&&['24-26','24/26','24','26','3X'].includes(d))||(d==='3X'&&['24-26','24/26','24','26','3X'].includes(c)))return true
  if(category==='Shoes'){
    const cn=Number(c.replace(/[^0-9.]/g,'')),dn=Number(d.replace(/[^0-9.]/g,''));return Number.isFinite(cn)&&Number.isFinite(dn)&&Math.abs(cn-dn)<.01
  }
  if(category==='Intimates') return c.replace(/[^A-Z0-9]/g,'')===d.replace(/[^A-Z0-9]/g,'')
  return false
}

export function humanError(e){return String(e?.message||e||'Unknown error').replace(/\s+/g,' ').slice(0,300)}
