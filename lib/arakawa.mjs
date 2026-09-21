// Parsers are deliberately conservative: an unrecognized document is UNKNOWN, never normal.
export const SOURCES = Object.freeze({
  evacuation:'https://bosai.city.arakawa.tokyo.jp/hinan/hinan-siji.html',
  evacuationData:'https://bosai.city.arakawa.tokyo.jp/apps/get_json.php?file=renkei_6_hinan_kankoku_portal.js',
  shelters:'https://bosai.city.arakawa.tokyo.jp/hinan/hinanjyo-ichiran.html',
  utilities:'https://bosai.city.arakawa.tokyo.jp/koukyou/koukyou-jouhou.html',
  flood:'https://www.jma.go.jp/bosai/flood/',
  water:'https://www1.river.go.jp/cgi-bin/DspWaterData.exe?ID=303041283309040&KIND=9',
  waterStation:'https://www1.river.go.jp/cgi-bin/SiteInfoDetail.exe?ID=303041283309040'
});
export const SHELTERS = [
  {name:'ひぐらし小学校',floor:'2階以上',address:'西日暮里2-32-5'},
  {name:'諏訪台中学校',floor:'2階以上',address:'西日暮里2-36-8'},
  {name:'諏訪台ひろば館',floor:'1階以上',address:'西日暮里3-3-12'},
  {name:'西日暮里ふれあい館',floor:'2階以上',address:'西日暮里6-24-4'},
  {name:'第六日暮里小学校',floor:'2階以上',address:'西日暮里6-35-16'}
];
export const UTILITIES = [
  {id:'jr',name:'JR東日本',heading:'JR 東日本',detail:'山手線・京浜東北線・常磐線など',url:'https://traininfo.jreast.co.jp/train_info/kanto.aspx'},
  {id:'metro',name:'東京メトロ',heading:'東京メトロ',detail:'千代田線など',url:'https://www.tokyometro.jp/'},
  {id:'keisei',name:'京成電鉄',heading:'京成電鉄',detail:'京成本線など',url:'https://www.keisei.co.jp/'},
  {id:'toei',name:'東京都交通局',heading:'東京都交通局',detail:'日暮里・舎人ライナーなど',url:'https://www.kotsu.metro.tokyo.jp/'},
  {id:'electric',name:'電気',heading:'電気',detail:'東京電力パワーグリッド',url:'https://teideninfo.tepco.co.jp/'},
  {id:'gas',name:'ガス',heading:'ガス',detail:'東京ガスネットワーク',url:'https://fmap.tokyo-gas.co.jp/'},
  {id:'water',name:'水道',heading:'水道',detail:'東京都水道局',url:'https://www.waterworks.metro.tokyo.lg.jp/'},
  {id:'sewer',name:'下水道',heading:'下水道',detail:'東京都下水道局',url:'https://www.gesui.metro.tokyo.lg.jp/'}
];
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ensp:' ',emsp:' ',hellip:'…'};
export function decode(s=''){return String(s).replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,(m,k)=>{if(k[0]==='#'){const n=k[1]?.toLowerCase()==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):m}return entities[k.toLowerCase()]??m})}
export function plain(h=''){return decode(String(h).replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div|li|tr|h[1-6]|section|dt|dd)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim()}
export function norm(s=''){return String(s).normalize('NFKC').replace(/[\s\u3000:：・、,。．.]/g,'').trim()}
export function sections(html){const re=/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,h=[...String(html).matchAll(re)].map(m=>({level:+m[1],title:plain(m[2]),start:m.index,end:m.index+m[0].length}));return h.map((x,i)=>{let end=html.length;for(let j=i+1;j<h.length;j++)if(h[j].level<=x.level){end=h[j].start;break}return {...x,body:plain(html.slice(x.end,end))}})}
const noDistrict=/対象(?:の)?地区はありません|対象地区なし|発令対象(?:の)?地区はありません/;
function levelSection(html,level){const wanted=new RegExp(`警戒レベル${level}(?:緊急安全確保|避難指示|高齢者等避難)`);const s=sections(html).find(x=>wanted.test(norm(x.title))&&!norm(x.title).includes('解除'));if(s)return s.body;const lines=plain(html).split('\n');const start=lines.findIndex(x=>wanted.test(norm(x))&&!norm(x).includes('解除'));if(start<0)return null;let end=start+1;while(end<lines.length&&!/^警戒レベル[345]/.test(norm(lines[end]))&&!/^解除区域/.test(norm(lines[end])))end++;return lines.slice(start+1,end).join('\n')}
export function parseEvacuation(html){const levels={};for(const level of [5,4,3]){const body=levelSection(html,level);if(body===null){levels[level]={state:'unknown',text:'発表区分を確認できません'};continue}const lines=body.split('\n').map(x=>x.trim()).filter(Boolean),first=lines[0]||'';if(noDistrict.test(norm(first))){levels[level]={state:'none',text:first};continue}if(!first||/^(?:現在)?(?:情報|発表)はありません/.test(norm(first))){levels[level]={state:'unknown',text:'対象地区の判定に必要な情報がありません'};continue}levels[level]={state:'active',text:lines.slice(0,4).join(' ').slice(0,350)}}const highest=[5,4,3].find(n=>levels[n].state==='active')??null;const complete=Object.values(levels).every(x=>x.state!=='unknown');return{state:highest?'active':complete?'none':'unknown',active:highest?true:complete?false:null,highest,levels,summary:highest?levels[highest].text:complete?'警戒レベル3・4・5の対象地区はありません。':'一部の発表区分を確認できません。',source:SOURCES.evacuation}}
const EVACUATION_LEVELS=Object.freeze({
  5:['Hinan_Anzenkakuho'],
  4:['Hinan_Shiji','Hinan_Kankoku'],
  3:['Hinan_Zyunbi']
});
function evacuationSection(data,names){for(const name of names)if(data&&Object.hasOwn(data,name))return data[name];return undefined}
function evacuationFeatures(section){
  if(Array.isArray(section?.area?.features))return section.area.features;
  if(Array.isArray(section?.features))return section.features;
  return null
}
function evacuationAreaName(feature){
  const p=feature?.properties??{};
  return [p.attr?.name,p.name,p.areaName,p.Area_Name].find(x=>typeof x==='string'&&x.trim())?.trim()??null
}
function evacuationDatetime(data,levels){
  const values=[data?.Update_At,...Object.values(levels).map(x=>x.updateAt)].filter(Boolean);
  for(const value of values){
    const text=String(value).trim();
    const normalized=/^\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}/.test(text)?text.replace(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}:\d{2})/,'$1-$2-$3T$4:00+09:00'):text;
    if(Number.isFinite(Date.parse(normalized)))return new Date(normalized).toISOString()
  }
  return null
}
export function parseEvacuationData(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('避難情報データの形式を確認できません');
  const levels={};
  for(const level of [5,4,3]){
    const section=evacuationSection(data,EVACUATION_LEVELS[level]),features=evacuationFeatures(section);
    if(features===null){levels[level]={state:'unknown',areas:[],text:'発表区分を確認できません',updateAt:section?.Update_At??section?.update_at??section?.updateAt??null};continue}
    const areas=[...new Set(features.map(evacuationAreaName).filter(Boolean))];
    if(features.length===0){levels[level]={state:'none',areas:[],text:'対象地区なし',updateAt:section?.Update_At??section?.update_at??section?.updateAt??null};continue}
    levels[level]={state:'active',areas,text:areas.length?areas.join(' ／ '):'対象地区あり（名称を取得できません）',updateAt:section?.Update_At??section?.update_at??section?.updateAt??null}
  }
  const activeLevels=[5,4,3].filter(level=>levels[level].state==='active'),highest=activeLevels[0]??null;
  const complete=Object.values(levels).every(x=>x.state!=='unknown');
  return{
    state:highest?'active':complete?'none':'unknown',active:highest?true:complete?false:null,highest,levels,
    summary:activeLevels.length?activeLevels.map(level=>`レベル${level}：${levels[level].text}`).join(' ／ '):complete?'警戒レベル3・4・5の対象地区はありません。':'一部の発表区分を確認できません。',
    reportDatetime:evacuationDatetime(data,levels),source:SOURCES.evacuation,dataSource:SOURCES.evacuationData
  }
}
function tableRows(html){return[...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map(c=>plain(c[1]).replace(/\n/g,' ').trim())).filter(x=>x.length)}
function shelterState(t){const s=norm(t);if(/閉鎖|未開設|開設していません/.test(s))return'closed';if(/満員|受入停止/.test(s))return'full';if(/開設準備|準備中/.test(s))return'preparing';if(/開設中|開設済|開設しています|受入中|受け入れ中/.test(s))return'open';if(s==='開設')return'open';return'unknown'}
export function parseShelters(html){const rows=tableRows(html);return SHELTERS.map(target=>{const row=rows.find(c=>c.some(x=>norm(x)===norm(target.name)||norm(x).includes(norm(target.name))));let status='';if(row){status=row.find(c=>shelterState(c)!=='unknown')||''}else{const s=sections(html).find(x=>norm(x.title)===norm(target.name));if(s)status=s.body.split('\n').find(x=>shelterState(x)!=='unknown')||''}return{...target,state:shelterState(status),status:status||'開設状況を確認できません',source:SOURCES.shelters}})}
function utilSection(html,wanted){const ss=sections(html),s=ss.find(x=>norm(x.title)===norm(wanted));return s?s.body:null}
export function parseUtilities(html){return UTILITIES.map(u=>{const body=utilSection(html,u.heading);if(body===null)return{...u,state:'unknown',status:'区の掲載情報を取得できません'};const t=norm(body);if(/現在情報はありません|現在障害情報はありません|現在運行情報はありません/.test(t))return{...u,state:'none',status:'区の掲載情報なし'};let lines=body.split('\n').map(x=>x.trim()).filter(Boolean).filter(x=>!/^より取得$/.test(x));const informative=lines.filter(x=>!/(?:ウェブサイト|ホームページ|公式サイト).*(?:より取得|にてご確認ください)|^(?:より取得|にてご確認ください)$/.test(x));if(!informative.length||informative.every(x=>/(?:ウェブサイト|ホームページ|公式サイト)/.test(x)&&!/(運休|遅延|障害|停電|断水|運転見合わせ|発生)/.test(x)))return{...u,state:'link',status:'公式サイトで確認'};return{...u,state:'notice',status:informative.join(' ').slice(0,240)}})}
export function response(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',status===200?'public, s-maxage=60, max-age=0, must-revalidate':'no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data))}
export async function fetchText(url,timeout=9000){const r=await fetch(url,{headers:{'Accept':'text/html, text/plain;q=0.9','User-Agent':'ArakawaNipporiBosaiDashboard/0.5'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error(`上流 HTTP ${r.status}`);return r.text()}
export async function fetchJson(url,timeout=9000){const r=await fetch(url,{headers:{'Accept':'application/json, text/javascript;q=0.9','User-Agent':'ArakawaNipporiBosaiDashboard/0.9'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error(`上流 HTTP ${r.status}`);return r.json()}
export function makeHandler(source,parser){return async function(req,res){if(req.method!=='GET')return response(res,405,{error:'Method not allowed'});try{const html=await fetchText(source),data=parser(html);return response(res,200,{...data,retrievedAt:new Date().toISOString()})}catch(e){return response(res,502,{state:'error',error:String(e.message||e),source,retrievedAt:new Date().toISOString()})}}}
export function makeJsonHandler(source,parser){return async function(req,res){if(req.method!=='GET')return response(res,405,{error:'Method not allowed'});try{const json=await fetchJson(source),data=parser(json);return response(res,200,{...data,retrievedAt:new Date().toISOString()})}catch(e){return response(res,502,{state:'error',error:String(e.message||e),source,retrievedAt:new Date().toISOString()})}}}
