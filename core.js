/* Núcleo sem tela: união de pedidos e sincronização com o GitHub. Usado pelo app e pelo teste. */
(function(g){
  const API='https://api.github.com/repos/';
  // une listas de pedidos: para cada id vale a versão com "upd" mais recente
  function mesclar(local,remotos){
    let mudou=false; const mapa=new Map(local.map(p=>[p.id,p]));
    for(const r of remotos||[]){
      if(!r||!r.id||!Array.isArray(r.itens)) continue;
      const l=mapa.get(r.id);
      if(!l||String(r.upd||'')>String(l.upd||'')){mapa.set(r.id,r);mudou=true}
    }
    return {pedidos:mudou?[...mapa.values()]:local,mudou};
  }
  function b64(s){const b=new TextEncoder().encode(s);let o='';for(let i=0;i<b.length;i+=0x8000)o+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(o)}
  async function gh(st,path,opt={}){
    const c=new AbortController(), t=setTimeout(()=>c.abort(),20000);
    try{return await fetch(API+st.repo+'/contents/'+path,{...opt,signal:c.signal,cache:'no-store',
      headers:{'Authorization':'Bearer '+st.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opt.headers||{})}})}
    finally{clearTimeout(t)}
  }
  const falha=r=>new Error(r.status===401||r.status===403?'token':r.status===404?'repo':'http'+r.status);
  /* st: {repo, token, dev, dir, pedidos, shas, sujo}. Altera st.pedidos e st.shas. Devolve {mudou, enviou}. */
  async function sincronizar(st){
    const dir=st.dir||'dados';
    const r=await gh(st,dir);
    let lista=[];
    if(r.status===404){const chk=await fetch(API+st.repo,{headers:{'Authorization':'Bearer '+st.token}});if(!chk.ok)throw falha(chk)}
    else if(!r.ok) throw falha(r);
    else lista=await r.json();
    let mudou=false;
    for(const f of lista){
      if(!f.name.endsWith('.json')||st.shas[f.name]===f.sha) continue;
      const rr=await gh(st,dir+'/'+f.name,{headers:{'Accept':'application/vnd.github.raw+json'}});
      if(!rr.ok) throw falha(rr);
      const j=await rr.json(), m=mesclar(st.pedidos,j.pedidos);
      if(m.mudou){st.pedidos=m.pedidos;mudou=true}
      st.shas[f.name]=f.sha;
    }
    const meu=st.dev+'.json', atual=lista.find(f=>f.name===meu);
    let enviou=false;
    if(st.sujo||(!atual&&st.pedidos.length)){
      const corpo={message:'sinc '+st.dev,content:b64(JSON.stringify({dev:st.dev,em:new Date().toISOString(),pedidos:st.pedidos}))};
      if(atual) corpo.sha=atual.sha;
      const w=await gh(st,dir+'/'+meu,{method:'PUT',body:JSON.stringify(corpo)});
      if(!w.ok) throw (w.status===409||w.status===422)?new Error('conflito'):falha(w);
      st.shas[meu]=(await w.json()).content.sha; enviou=true;
    }
    return {mudou,enviou};
  }
  g.Nucleo={mesclar,sincronizar,b64};
})(typeof self!=='undefined'?self:globalThis);
