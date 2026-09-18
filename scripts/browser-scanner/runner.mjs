import { chromium } from 'playwright'
import { getRetailerConfig } from './config.mjs'
import { collectProductLinks, extractProduct } from './extract.mjs'
import { adminClient, loadRetailers, loadSizeContext, desiredSizes, startRetailerScan, finishRetailerScan, saveVerifiedProduct, deactivateStaleRetailerDeals } from './db.mjs'
import { inferCategory, sizeMatchesBrowser, humanError, sameRetailerHost, sleep, validMarkdown } from './utils.mjs'

const challengeRx=/captcha|access denied|verify you are human|unusual traffic|robot check|akamai|perimeterx|datadome/i
const unwantedRx=/\bmen'?s\b|big\s*&?\s*tall|king\s*size|kingsize|swim\s*trunks?|board\s*shorts?|woman\s+within|roaman'?s|jessica\s+london/i

async function openPage(page,url,{timeout=45000}={}){
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout})
  await page.waitForTimeout(900)
  await page.waitForLoadState('networkidle',{timeout:3500}).catch(()=>{})
  const status=response?.status()||0
  const body=await page.locator('body').innerText({timeout:2500}).catch(()=> '')
  if(status===403||status===429||challengeRx.test(body.slice(0,6000)))throw new Error(`Browser blocked/challenge (${status||'page'})`)
  return {status,body}
}

function prioritize(urls){
  const score=u=>/jean|denim/.test(u.toLowerCase())?0:/cardigan|sweater|jacket|layer/.test(u.toLowerCase())?1:2
  return [...urls].sort((a,b)=>score(a)-score(b))
}

async function discover(page,retailer,config){
  const out=[];const errs=[]
  for(const categoryUrl of config.priority){
    try{
      await openPage(page,categoryUrl)
      const links=await collectProductLinks(page,{baseUrl:retailer.base_url,pattern:config.productPattern,limit:120})
      out.push(...links)
    }catch(e){errs.push({url:categoryUrl,error:humanError(e)})}
  }
  return {urls:[...new Set(prioritize(out))],errors:errs}
}

function pickMatchingSize(product,desired,retailer,category){
  const nodes=product.sizes||[]
  const matches=[]
  for(const n of nodes){for(const d of desired){if(sizeMatchesBrowser(n.size,d,retailer.slug,category)){matches.push(n);break}}}
  const exactInStock=matches.find(n=>!n.disabled)
  return {matches,chosen:exactInStock||null}
}

async function scanRetailer(browser,admin,sizeCtx,retailer){
  const scan=await startRetailerScan(admin,retailer)
  const stats={discovered:0,checked:0,parsed:0,saleCandidates:0,sizeMatches:0,sizeVerified:0,deals:0,images:0,adapterVariants:0,stockTrue:0,stockFalse:0,stockUnknown:0,saleSizeOverlap:0,dealThresholdPass:0,dealThresholdFail:0,rejectedNoMarkdown:0,rejectedValue:0,rejectedRelevance:0,rateLimited:0}
  const errors=[]
  const config=getRetailerConfig(retailer.slug,retailer.base_url)
  const context=await browser.newContext({locale:'en-US',timezoneId:'America/Chicago',viewport:{width:1365,height:900},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'})
  await context.route(/\.(?:png|jpe?g|gif|webp|woff2?|ttf)(?:\?|$)/i,r=>r.abort()).catch(()=>{})
  const page=await context.newPage()
  try{
    const discovery=await discover(page,retailer,config);errors.push(...discovery.errors);stats.discovered=discovery.urls.length
    const urls=discovery.urls.slice(0,config.cap||20)
    for(const url of urls){
      try{
        const nav=await openPage(page,url)
        stats.checked++
        const product=await extractProduct(page)
        if(!product?.title||!sameRetailerHost(retailer.base_url,product.canonical||url)){stats.rejectedRelevance++;continue}
        const hay=`${product.title} ${product.brand||''} ${product.description||''} ${product.canonical||url}`
        if(unwantedRx.test(hay)){stats.rejectedRelevance++;continue}
        stats.parsed++; if(product.image)stats.images++
        const category=inferCategory(`${product.title} ${product.canonical||url}`)
        const desired=desiredSizes(sizeCtx,retailer,category)
        const found=pickMatchingSize(product,desired,retailer,category)
        stats.adapterVariants+=product.sizes?.length||0
        stats.sizeMatches+=found.matches.length
        stats.stockTrue+=found.matches.filter(x=>!x.disabled).length
        stats.stockFalse+=found.matches.filter(x=>x.disabled).length
        if(!found.chosen)continue
        stats.sizeVerified++
        const sale=Number(product.sale),regular=Number(product.regular||product.sale)
        if(validMarkdown(sale,regular,category)){stats.saleCandidates++;stats.saleSizeOverlap++}else stats.rejectedNoMarkdown++
        const saved=await saveVerifiedProduct(admin,{retailer,product,sizeNode:found.chosen,category,scanStarted:scan.started_at})
        if(saved.deal){stats.deals++;stats.dealThresholdPass++}else if(validMarkdown(sale,regular,category)){stats.dealThresholdFail++;stats.rejectedValue++}
      }catch(e){
        const msg=humanError(e); if(/429/.test(msg))stats.rateLimited++
        errors.push({url,error:msg})
      }
      await sleep(250)
    }
    if(stats.checked>=3)await deactivateStaleRetailerDeals(admin,retailer,scan.started_at)
    await finishRetailerScan(admin,retailer,scan,stats,errors,'success')
  }catch(e){
    errors.push({error:humanError(e)});await finishRetailerScan(admin,retailer,scan,stats,errors,'error')
  }finally{await context.close()}
  return {retailer:retailer.name,...stats,errors:errors.length}
}

export async function runBrowserScan(){
  const admin=adminClient(),retailers=await loadRetailers(admin),sizeCtx=await loadSizeContext(admin)
  const browser=await chromium.launch({headless:true})
  const results=[]
  try{
    for(const retailer of retailers){
      console.log(`\n=== ${retailer.name} ===`)
      const r=await scanRetailer(browser,admin,sizeCtx,retailer);results.push(r);console.log(JSON.stringify(r))
    }
  }finally{await browser.close()}
  return results
}
