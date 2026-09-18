import { runBrowserScan } from './browser-scanner/runner.mjs'

try{
  const results=await runBrowserScan()
  const deals=results.reduce((n,x)=>n+(x.deals||0),0)
  const checked=results.reduce((n,x)=>n+(x.checked||0),0)
  console.log(`\nFor Hollie browser scan complete: ${checked} product pages checked, ${deals} qualifying exact-size deals.`)
}catch(e){
  console.error(e?.stack||e)
  process.exitCode=1
}
