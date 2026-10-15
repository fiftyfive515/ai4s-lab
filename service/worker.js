const pages = new Set(['overview','monitor','data','models','experiment','trace','efficiency','about','realtime','carriers']);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const enc = new TextEncoder();
const day = 86400000;

function reply(status, data, extra = {}) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'X-Frame-Options':'DENY',
      ...extra
    }
  });
}
async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}
async function equal(a,b) {
  const [aa,bb] = await Promise.all([digest(a),digest(b)]);
  let difference=0;
  for (let i=0; i<aa.length; i++) difference |= aa[i]^bb[i];
  return difference === 0;
}
async function signature(value, secret) {
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)));
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
async function authorized(request, env) {
  const cookie=request.headers.get('Cookie')||'';
  const value=cookie.match(/(?:^|;\s*)atlas_owner=([^;]+)/)?.[1];
  if(!value || value.length>250) return false;
  const [expires,nonce,sig]=value.split('.');
  if(!/^\d+$/.test(expires)||!uuid.test(nonce||'')||!sig||Number(expires)<Date.now())return false;
  return equal(sig,await signature(expires+'.'+nonce,env.OWNER_KEY));
}
function cookie(value, maxAge) {
  return 'atlas_owner='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/__lab/; Max-Age='+maxAge;
}
async function body(request) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('format');
  // Enforce the limit even when Content-Length is absent.
  const reader=request.body?.getReader();
  if(!reader)throw new Error('body');
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error('size');}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;
  for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
  const parsed=JSON.parse(new TextDecoder().decode(bytes));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('body');
  return parsed;
}
async function cleanup(env) {
  await env.DB.prepare('DELETE FROM visits WHERE at < ?').bind(new Date(Date.now()-30*day).toISOString()).run();
}

export default {
  async fetch(request, env) {
    const url=new URL(request.url),path=url.pathname,origin=request.headers.get('Origin');
    if(!env.OWNER_KEY || env.OWNER_KEY.length<32)return reply(503,{error:'Service not configured'});
    const ownOrigin=url.origin;
    const cors=origin===env.PUBLIC_ORIGIN?{'Access-Control-Allow-Origin':env.PUBLIC_ORIGIN,'Vary':'Origin'}:{};
    if(request.method==='OPTIONS' && path==='/__lab/visit' && origin===env.PUBLIC_ORIGIN){
      return reply(204,null,{...cors,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});
    }
    if(request.method==='GET'){
      if(path==='/__lab/stats'){
        if(!await authorized(request,env))return reply(401,{error:'需要站主登录'});
        const days=Number(url.searchParams.get('days')||7);
        if(![1,7,30].includes(days))return reply(400,{error:'时间范围无效'});
        await cleanup(env);
        const cutoff=new Date(Date.now()-days*day).toISOString();
        const [total,hot,records]=await env.DB.batch([
          env.DB.prepare('SELECT COUNT(*) AS views, COUNT(DISTINCT session) AS sessions FROM visits WHERE at >= ?').bind(cutoff),
          env.DB.prepare('SELECT page, COUNT(*) AS views FROM visits WHERE at >= ? GROUP BY page ORDER BY views DESC').bind(cutoff),
          env.DB.prepare('SELECT at,session,page,device,referrer FROM visits WHERE at >= ? ORDER BY at DESC,rowid DESC LIMIT 200').bind(cutoff)
        ]);
        return reply(200,{...total.results[0],days,pages:hot.results,records:records.results,retention_days:30});
      }
      const assets={'/owner':'/owner.html','/owner/':'/owner.html','/owner.js':'/owner.js','/styles.css':'/styles.css','/favicon.svg':'/favicon.svg'};
      if(assets[path]){
        const assetURL=new URL(assets[path],url);
        const response=await env.ASSETS.fetch(new Request(assetURL,request));
        const headers=new Headers(response.headers);
        headers.set('Cache-Control','no-store');
        headers.set('X-Robots-Tag','noindex, nofollow');
        headers.set('X-Content-Type-Options','nosniff');
        headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        return new Response(response.body,{status:response.status,headers});
      }
      return reply(404,{error:'Not found'});
    }
    if(request.method!=='POST')return reply(405,{error:'Method not allowed'});
    const isVisit=path==='/__lab/visit';
    if(origin!==(isVisit?env.PUBLIC_ORIGIN:ownOrigin))return reply(403,{error:'请求来源无效'});
    const address=request.headers.get('CF-Connecting-IP')||'unknown';
    const limiter=isVisit?env.EVENT_LIMIT:env.LOGIN_LIMIT;
    if((isVisit||path==='/__lab/login') && !(await limiter.limit({key:address})).success)return reply(429,{error:'请求过多，请稍后再试'},cors);
    let data;
    try{data=await body(request);}catch{return reply(400,{error:'请求无效'},cors);}
    if(isVisit){
      if(!uuid.test(data.id||'')||!uuid.test(data.session||'')||!pages.has(data.page)||!['small-screen','large-screen'].includes(data.device)||typeof data.referrer!=='string'||data.referrer.length>253||(data.referrer&&!/^[a-z0-9.-]+$/.test(data.referrer)))return reply(400,{error:'事件无效'},cors);
      const now=new Date().toISOString();
      const cutoff=new Date(Date.now()-day).toISOString();
      await env.DB.prepare('INSERT OR IGNORE INTO visits (id,session,at,page,device,referrer) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM visits WHERE session=? AND at>=?)<100').bind(data.id,data.session,now,data.page,data.device,data.referrer,data.session,cutoff).run();
      return reply(204,null,cors);
    }
    if(path==='/__lab/login'){
      if(typeof data.key!=='string'||!await equal(data.key,env.OWNER_KEY))return reply(401,{error:'访问口令无效'});
      const token=(Date.now()+8*3600000)+'.'+crypto.randomUUID();
      return reply(200,{ok:true},{'Set-Cookie':cookie(token+'.'+await signature(token,env.OWNER_KEY),28800)});
    }
    if(path==='/__lab/logout')return reply(200,{ok:true},{'Set-Cookie':cookie('',0)});
    return reply(404,{error:'Not found'});
  },
  async scheduled(event,env,ctx){ctx.waitUntil(cleanup(env));}
};
