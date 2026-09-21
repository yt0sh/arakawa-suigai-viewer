const CONFIG={areaCode:'1311800',center:{lat:35.7277,lon:139.7708},radarZoom:12};
const STATIONS=[
  {key:'kumagaya',name:'熊谷',location:'熊谷市・荒川上流',id:'303041283308030',riverUrl:'https://www.river.go.jp/kawabou/pcfull/tm?itmkndCd=4&ofcCd=21280&obsCd=7&isCurrent=true&fld=0',cameraUrl:'https://www.ktr.mlit.go.jp/arajo/live/camera23.html'},
  {key:'chisuibashi',name:'治水橋',location:'さいたま市西区・荒川上流',id:'303041283308060',riverUrl:'https://www.river.go.jp/kawabou/pcfull/tm?itmkndCd=4&ofcCd=21280&obsCd=9&isCurrent=true&fld=0',cameraUrl:'https://www.ktr.mlit.go.jp/arajo/live/camera02.html'},
  {key:'iwabuchi',name:'岩淵水門',location:'東京都北区・荒川下流',id:'303041283309040',riverUrl:'https://www.river.go.jp/kawabou/pcfull/tm?itmkndCd=4&ofcCd=21281&obsCd=6&isCurrent=true&fld=0',cameraUrl:'https://www.ktr.mlit.go.jp/arage/arage00563.html'}
];
const WARNING_DEFINITIONS={
  '02':['暴風雪警報',3],'03':['大雨警報',3],'04':['洪水警報',3],'05':['暴風警報',3],'06':['大雪警報',3],'07':['波浪警報',3],'08':['高潮警報',3],'09':['土砂災害警報',3],
  '10':['大雨注意報',2],'12':['大雪注意報',2],'13':['風雪注意報',2],'14':['雷注意報',2],'15':['強風注意報',2],'16':['波浪注意報',2],'17':['融雪注意報',2],'18':['洪水注意報',2],'19':['高潮注意報',2],'20':['濃霧注意報',2],'21':['乾燥注意報',2],'22':['なだれ注意報',2],'23':['低温注意報',2],'24':['霜注意報',2],'25':['着氷注意報',2],'26':['着雪注意報',2],'29':['土砂災害注意報',2],
  '32':['暴風雪特別警報',5],'33':['大雨特別警報',5],'35':['暴風特別警報',5],'36':['大雪特別警報',5],'37':['波浪特別警報',5],'38':['高潮特別警報',5],'39':['土砂災害特別警報',5],
  '43':['大雨危険警報',4],'48':['高潮危険警報',4],'49':['土砂災害危険警報',4]
};
const COLORS={normal:'#d9efff',standby:'#dff3e4',advisory:'#fff2b8',evacuation:'#ffd9d6',danger:'#eadcff'};
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const fmt=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tokyo'}).format(d):'時刻不明'};
function dot(id,kind=''){const el=q(id);if(el)el.className='dot '+kind}
function statusTimestamp(retrievedAt,reportDatetime){
  const valid=t=>t&&Number.isFinite(new Date(t).getTime());
  return (valid(retrievedAt)?'確認 '+fmt(retrievedAt):'確認時刻不明')+(valid(reportDatetime)?'｜発表 '+fmt(reportDatetime):'');
}
async function jsonFetch(url,timeout=12000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
function stationCard(st){
  const a=document.createElement('article');a.className='station-card';a.dataset.station=st.key;
  a.innerHTML=`<div class="station-head"><div><h3></h3><div class="station-loc"></div></div><div class="station-id"></div></div>
  <div class="water-top"><div><div class="water-value"><span data-value>--</span><small>m</small></div><div class="micro" data-time>観測データ取得中</div></div><div class="trend" data-trend>取得中</div></div>
  <div class="gauge" data-gauge><span class="gauge-marker" data-marker></span></div>
  <div class="thresholds" data-thresholds></div>
  <div class="micro" data-delta>10分・1時間の変化を取得中</div>
  <div class="chart" data-chart><div class="chart-placeholder">水位データ取得中</div></div>
  <div class="micro" data-chart-note></div>
  <div class="camera-panel"><div class="camera-head"><b>ライブカメラ</b><small data-camera-meta>画像取得中</small></div><div class="camera-box" data-camera>画像取得中</div><div class="station-links"><a data-river target="_blank" rel="noopener noreferrer">観測所情報</a><a data-camera-link target="_blank" rel="noopener noreferrer">カメラ原典</a></div></div>`;
  a.querySelector('h3').textContent=st.name;a.querySelector('.station-loc').textContent=st.location;a.querySelector('.station-id').textContent='観測所 '+st.id;
  a.querySelector('[data-river]').href=st.riverUrl;a.querySelector('[data-camera-link]').href=st.cameraUrl;
  return a
}
function initStations(){q('#waterStations').replaceChildren(...STATIONS.map(stationCard))}
let chartHours=120;
const waterData=new Map();
function bandFor(v,t){return v>=t.danger?'danger':v>=t.evacuation?'evacuation':v>=t.advisory?'advisory':v>=t.standby?'standby':'normal'}
function bandName(k){return {normal:'平常',standby:'水防団待機',advisory:'氾濫注意',evacuation:'避難判断',danger:'氾濫危険'}[k]}
function deltaText(v){return v==null||!Number.isFinite(Number(v))?'比較値なし':(Number(v)>=0?'+':'')+Number(v).toFixed(2)+'m'}
function setupGauge(card,d){
  const t=d.thresholds,m=d.chartMax||Math.max(8,t.plan||t.danger+1),pct=v=>Math.max(0,Math.min(100,v/m*100));
  const stops=[0,pct(t.standby),pct(t.advisory),pct(t.evacuation),pct(t.danger),100];
  card.querySelector('[data-gauge]').style.background=`linear-gradient(90deg,${COLORS.normal} ${stops[0]}%,${COLORS.normal} ${stops[1]}%,${COLORS.standby} ${stops[1]}%,${COLORS.standby} ${stops[2]}%,${COLORS.advisory} ${stops[2]}%,${COLORS.advisory} ${stops[3]}%,${COLORS.evacuation} ${stops[3]}%,${COLORS.evacuation} ${stops[4]}%,${COLORS.danger} ${stops[4]}%,${COLORS.danger} 100%)`;
  card.querySelector('[data-marker]').style.left=pct(d.latest.value)+'%';
  const labels=[['待機',t.standby],['注意',t.advisory],['判断',t.evacuation],['危険',t.danger]];
  card.querySelector('[data-thresholds]').replaceChildren(...labels.map(([n,v])=>{const x=document.createElement('div');x.className='threshold';x.innerHTML=`<b>${Number(v).toFixed(2)}m</b>${n}`;return x}));
}
function svgEl(tag,attrs={},text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n}
function drawChart(card,d){
  const box=card.querySelector('[data-chart]');box.replaceChildren();
  const all=Array.isArray(d.history)?d.history:[],end=Date.parse(d.latest?.timestamp),start=end-chartHours*3600000,pts=all.filter(p=>Number.isFinite(Date.parse(p.timestamp))&&Number.isFinite(p.value)&&Date.parse(p.timestamp)>=start&&Date.parse(p.timestamp)<=end).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  if(!Number.isFinite(end)||!pts.length){box.innerHTML='<div class="chart-placeholder">指定期間の観測データを確認できません</div>';return}
  const yMax=Number(d.chartMax)||8,w=620,h=270,p={l:40,r:14,t:14,b:34},pw=w-p.l-p.r,ph=h-p.t-p.b;
  const x=t=>p.l+(t-start)/(end-start||1)*pw,y=v=>p.t+(yMax-Math.max(0,Math.min(yMax,v)))/yMax*ph;
  const svg=svgEl('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':`${d.station.name} ${chartHours===120?'5日間':'12時間'}の水位`});
  svg.append(svgEl('title',{},`${d.station.name}。${fmt(pts[0].timestamp)}から${fmt(pts.at(-1).timestamp)}まで。最新${pts.at(-1).value.toFixed(2)}メートル。`));
  const t=d.thresholds,bounds=[{a:0,b:t.standby,c:COLORS.normal},{a:t.standby,b:t.advisory,c:COLORS.standby},{a:t.advisory,b:t.evacuation,c:COLORS.advisory},{a:t.evacuation,b:t.danger,c:COLORS.evacuation},{a:t.danger,b:yMax,c:COLORS.danger}];
  for(const b of bounds){const lo=Math.max(0,Math.min(yMax,b.a)),hi=Math.max(0,Math.min(yMax,b.b));if(hi>lo)svg.append(svgEl('rect',{x:p.l,y:y(hi),width:pw,height:y(lo)-y(hi),fill:b.c}))}
  for(let i=0;i<=4;i++){const v=yMax*i/4,yy=y(v);svg.append(svgEl('line',{x1:p.l,x2:w-p.r,y1:yy,y2:yy,class:'grid'}),svgEl('text',{x:p.l-6,y:yy+3,'text-anchor':'end',class:'axis'},Number.isInteger(v)?v:v.toFixed(1)))}
  for(const v of [t.standby,t.advisory,t.evacuation,t.danger])if(v>=0&&v<=yMax)svg.append(svgEl('line',{x1:p.l,x2:w-p.r,y1:y(v),y2:y(v),stroke:'#a89048','stroke-width':1,'stroke-dasharray':'4 4'}));
  const ticks=chartHours===120?5:6;for(let i=0;i<=ticks;i++){const tt=start+(end-start)*i/ticks;const label=chartHours===120?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',timeZone:'Asia/Tokyo'}).format(tt):new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tokyo'}).format(tt);svg.append(svgEl('text',{x:x(tt),y:h-10,'text-anchor':i===0?'start':i===ticks?'end':'middle',class:'axis'},label))}
  let seg=[],segments=[];for(const pt of pts){const tt=Date.parse(pt.timestamp);if(seg.length&&tt-Date.parse(seg.at(-1).timestamp)>11*60000){segments.push(seg);seg=[]}seg.push(pt)}if(seg.length)segments.push(seg);
  for(const s of segments){if(s.length<2)continue;svg.append(svgEl('path',{d:s.map((pt,i)=>(i?'L':'M')+x(Date.parse(pt.timestamp)).toFixed(2)+' '+y(pt.value).toFixed(2)).join(' '),class:'series'}))}
  const last=pts.at(-1);svg.append(svgEl('circle',{cx:x(Date.parse(last.timestamp)),cy:y(last.value),r:4,class:'lastpoint'}));box.append(svg);
  const note=card.querySelector('[data-chart-note]');note.textContent=`表示 ${fmt(pts[0].timestamp)}〜${fmt(last.timestamp)}｜${pts.length}観測値｜縦軸 0〜${yMax}m 固定`;
  if(pts.some(p=>p.value<0||p.value>yMax))note.textContent+='｜範囲外の値は端に表示';
}
async function loadWater(st){
  const card=q(`[data-station="${st.key}"]`);
  try{
    const d=await jsonFetch(`/api/water?station=${encodeURIComponent(st.key)}`,16000);
    if(d.state!=='ok'||!d.latest||!Number.isFinite(d.latest.value))throw Error('invalid water');
    waterData.set(st.key,d);card.querySelector('[data-value]').textContent=d.latest.value.toFixed(2);
    card.querySelector('[data-time]').textContent=fmt(d.latest.timestamp)+' 観測'+(d.ageMinutes>30?'｜更新遅延に注意':'');
    const k=bandFor(d.latest.value,d.thresholds),tr=card.querySelector('[data-trend]');tr.textContent=bandName(k);tr.className='trend '+k;
    card.querySelector('[data-delta]').textContent=`10分 ${deltaText(d.delta10)} / 1時間 ${deltaText(d.delta60)}`;
    setupGauge(card,d);drawChart(card,d)
  }catch{
    waterData.delete(st.key);card.querySelector('[data-value]').textContent='--';card.querySelector('[data-time]').textContent='水位を取得できません';
    const tr=card.querySelector('[data-trend]');tr.textContent='取得不能';tr.className='trend';
    card.querySelector('[data-delta]').textContent='川の防災情報で確認してください';
    card.querySelector('[data-chart]').innerHTML='<div class="chart-placeholder">観測データを取得できません。公式情報を確認してください。</div>';
  }
}
function loadCamera(st){
  const card=q(`[data-station="${st.key}"]`),box=card.querySelector('[data-camera]'),meta=card.querySelector('[data-camera-meta]'),img=document.createElement('img');
  img.alt=`${st.name} ライブカメラ。国土交通省提供`;img.loading='lazy';img.decoding='async';img.src=`/api/camera?station=${encodeURIComponent(st.key)}&at=${Math.floor(Date.now()/60000)}`;
  img.onload=()=>meta.textContent='画像取得 '+fmt(Date.now())+' JST';
  img.onerror=()=>{box.textContent='画像を取得できません。カメラ原典を確認してください。';meta.textContent='取得失敗'};
  box.replaceChildren(img);meta.textContent='画像取得中'
}
async function loadEvacuation(){
  try{
    const d=await jsonFetch('/api/evacuation');if(d.state==='error')throw Error();
    let label,kind,detail=d.summary||'公式発表を確認してください';
    if(d.state==='active'){label=({3:'高齢者等避難 発令中',4:'避難指示 発令中',5:'緊急安全確保 発令中'})[d.highest]||'避難情報 発令中';kind=d.highest>=5?'lv5':d.highest>=4?'lv4':'warn'}
    else if(d.state==='none'){label='避難指示なし';kind='ok';detail='高齢者等避難・緊急安全確保も発令なし'}
    else{label='一部を確認できません';kind=''}
    q('#evacStatus').textContent=label;q('#evacDetail').textContent=detail;dot('#evacDot',kind);q('#evacTime').textContent=statusTimestamp(d.retrievedAt,d.reportDatetime);
  }catch{q('#evacStatus').textContent='取得できません';q('#evacDetail').textContent='荒川区公式で発令状況を確認してください。';dot('#evacDot');q('#evacTime').textContent='取得失敗 '+fmt(Date.now())}
}
function updateWarning(w,retrievedAt){
  if(!w||w.state!=='ok'){q('#weatherStatus').textContent='取得できません';q('#weatherDetail').textContent='気象庁の公式画面を確認してください。';dot('#weatherDot');q('#weatherTime').textContent='取得失敗 '+fmt(Date.now());return}
  const active=(w.warnings||[]).filter(x=>x.code&&!String(x.status||'').includes('解除')).map(x=>{const def=WARNING_DEFINITIONS[x.code];return{...x,name:x.name||def?.[0]||null,level:Number(x.level||def?.[1])||null}}).sort((a,b)=>(b.level||0)-(a.level||0));
  const unknown=active.filter(x=>!x.name||!x.level),highest=active.reduce((n,x)=>Math.max(n,x.level||0),0);let label,detail,kind;
  if(!active.length){label='警報・注意報なし';detail='';kind='ok'}else{
    label=highest>=5?'特別警報発表中':highest>=4?'レベル4相当 発表中':highest>=3?'警報発表中':highest>=2?'注意報発表中':'気象情報発表中';
    detail=active.map(x=>x.name?`レベル${x.level}相当｜${x.name}`:`未対応の気象情報（コード ${x.code}）`).join(' ／ ');
    if(unknown.length)detail+='｜詳細は気象庁で確認してください';
    kind=highest>=5?'lv5':highest>=4?'lv4':highest>=3?'warn':'adv';
  }
  q('#weatherStatus').textContent=label;q('#weatherDetail').textContent=detail;dot('#weatherDot',kind);q('#weatherTime').textContent=statusTimestamp(retrievedAt,w.reportDatetime)
}
function updateForecast(f){
  if(!f||f.state!=='ok'){q('#forecastText').textContent='予報を取得できません';q('#forecastPop').textContent='気象庁の荒川区ページを確認してください。';return}
  q('#forecastText').textContent=f.weather||'予報文を確認できません';
  q('#forecastPop').textContent=(f.pops||[]).length?'降水確率　'+f.pops.slice(0,5).map(x=>`${new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',hour12:false,timeZone:'Asia/Tokyo'}).format(new Date(x.time))}時 ${x.pop}%`).join(' / '):'降水確率を確認できません'
}
function tileXY(lat,lon,z){const n=2**z,r=lat*Math.PI/180;return{x:(lon+180)/360*n,y:(1-Math.asinh(Math.tan(r))/Math.PI)/2*n}}
function tile(parent,src,dx,dy,cls){const im=document.createElement('img');im.className='tile '+cls;im.alt='';im.loading='eager';im.style.left=((dx+1)*33.3334)+'%';im.style.top=((dy+1)*33.3334)+'%';im.src=src;parent.append(im);return im}
async function updateRadar(r){
  const box=q('#radar'),err=q('#radarError');
  if(!r||r.state!=='ok'){err.style.display='flex';q('#radarLabel').textContent='雨雲の時刻を取得できません';return}
  const z=CONFIG.radarZoom,p=tileXY(CONFIG.center.lat,CONFIG.center.lon,z),cx=Math.floor(p.x),cy=Math.floor(p.y),old=qa('#radar .tile'),added=[];let radarFail=0,baseFail=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;
    const base=tile(box,`https://cyberjapandata.gsi.go.jp/xyz/std/${z}/${x}/${y}.png`,dx,dy,'base-tile');
    const rain=tile(box,`/api/radar-tile?z=${z}&x=${x}&y=${y}&b=${r.basetime}&v=${r.validtime}`,dx,dy,'radar-tile');added.push([base,'base'],[rain,'radar'])
  }
  await Promise.all(added.map(([im,kind])=>new Promise(resolve=>{let done=false;const finish=ok=>{if(done)return;done=true;if(!ok){if(kind==='radar')radarFail++;else baseFail++}resolve()};im.onload=()=>finish(true);im.onerror=()=>finish(false);setTimeout(()=>finish(!!im.naturalWidth),8000)})));
  old.forEach(x=>x.remove());err.style.display=radarFail===9?'flex':'none';q('#radarMarker').style.left=((1+p.x-cx)/3*100)+'%';q('#radarMarker').style.top=((1+p.y-cy)/3*100)+'%';
  q('#radarLabel').textContent=radarFail===9?'雨雲画像を取得できません':(r.timestamp&&Number.isFinite(new Date(r.timestamp).getTime())?fmt(r.timestamp)+' 時点の雨雲（気象庁）':'雨雲の時刻不明')+(radarFail?'｜一部取得失敗':'')+(baseFail?'｜地図 一部取得失敗':'')
}
async function loadJma(){
  try{const d=await jsonFetch('/api/jma',15000);updateWarning(d.warning,d.retrievedAt);updateForecast(d.forecast);await updateRadar(d.radar)}catch{updateWarning(null);updateForecast(null);await updateRadar(null)}
}
function loadX(){const s=document.createElement('script');s.async=true;s.src='https://platform.x.com/widgets.js';s.charset='utf-8';s.onerror=()=>{const p=q('#xFeed > p');if(p)p.textContent='Xの埋め込みを読み込めませんでした。直接リンクから確認してください。'};document.head.append(s)}
function initRange(){qa('[data-range]').forEach(b=>b.addEventListener('click',()=>{chartHours=Number(b.dataset.range);qa('[data-range]').forEach(x=>x.classList.toggle('active',x===b));for(const st of STATIONS){const d=waterData.get(st.key),card=q(`[data-station="${st.key}"]`);if(d)drawChart(card,d)}}))}
let busy=false;
async function refresh(){if(busy)return;busy=true;q('#updated').textContent='更新確認中…';await Promise.allSettled([loadJma(),loadEvacuation(),...STATIONS.map(loadWater)]);STATIONS.forEach(loadCamera);q('#updated').textContent='画面の取得試行 '+fmt(Date.now())+'｜5分ごと自動更新';busy=false}
initStations();initRange();loadX();refresh();setInterval(refresh,300000);
