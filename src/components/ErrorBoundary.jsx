import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null} }
  static getDerivedStateFromError(error){ return {error} }
  componentDidCatch(error, info){ console.error('For Hollie startup error', error, info) }
  render(){
    if(!this.state.error) return this.props.children
    return <main style={{minHeight:'100vh',background:'#0f1018',color:'#f7f3f6',padding:'32px 20px',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:620,margin:'80px auto',padding:24,border:'1px solid #63344f',borderRadius:20,background:'#171722'}}>
        <h1 style={{marginTop:0}}>For Hollie couldn't start</h1>
        <p>The app caught a startup error instead of showing a blank screen.</p>
        <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',opacity:.8}}>{String(this.state.error?.message || this.state.error)}</pre>
        <button onClick={()=>location.reload()} style={{padding:'12px 18px',border:0,borderRadius:12}}>Reload</button>
      </div>
    </main>
  }
}
