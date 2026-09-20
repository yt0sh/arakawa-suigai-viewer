import {response} from '../lib/arakawa.mjs';
const WARNING='https://www.jma.go.jp/bosai/warning/data/r8/130000.json';
const FORECAST='https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json';
const RADAR='https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json';
async function getJson(url,timeout=10000){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'ArakawaFloodDashboard/0.9'},signal:AbortSignal.timeout(timeout),cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()}
export const WARNING_DEFINITIONS={
  '02':{name:'暴風雪警報',level:3},'03':{name:'大雨警報',level:3},'04':{name:'洪水警報',level:3},'05':{name:'暴風警報',level:3},'06':{name:'大雪警報',level:3},'07':{name:'波浪警報',level:3},'08':{name:'高潮警報',level:3},'09':{name:'土砂災害警報',level:3},
  '10':{name:'大雨注意報',level:2},'12':{name:'大雪注意報',level:2},'13':{name:'風雪注意報',level:2},'14':{name:'雷注意報',level:2},'15':{name:'強風注意報',level:2},'16':{name:'波浪注意報',level:2},'17':{name:'融雪注意報',level:2},'18':{name:'洪水注意報',level:2},'19':{name:'高潮注意報',level:2},'20':{name:'濃霧注意報',level:2},'21':{name:'乾燥注意報',level:2},'22':{name:'なだれ注意報',level:2},'23':{name:'低温注意報',level:2},'24':{name:'霜注意報',level:2},'25':{name:'着氷注意報',level:2},'26':{name:'着雪注意報',level:2},'29':{name:'土砂災害注意報',level:2},
  '32':{name:'暴風雪特別警報',level:5},'33':{name:'大雨特別警報',level:5},'35':{name:'暴風特別警報',level:5},'36':{name:'大雪特別警報',level:5},'37':{name:'波浪特別警報',level:5},'38':{name:'高潮特別警報',level:5},'39':{name:'土砂災害特別警報',level:5},
  '43':{name:'大雨危険警報',level:4},'48':{name:'高潮危険警報',level:4},'49':{name:'土砂災害危険警報',level:4}
};
const timeValue=t=>{const n=Date.parse(t||'');return Number.isFinite(n)?n:0};
export function warningPart(data){
  if(!Array.isArray(data)||!data.length)throw Error('気象庁の警報データ形式を確認できません');
  const reports=[...data].sort((a,b)=>timeValue(b?.reportDatetime)-timeValue(a?.reportDatetime));
  const latestByCode=new Map();let areaFound=false,latestAreaReport=null;
  for(const report of reports){
    const area=report?.warning?.class20Items?.find(x=>String(x?.areaCode)==='1311800');
    if(!area)continue;
    areaFound=true;
    if(!latestAreaReport||timeValue(report.reportDatetime)>timeValue(latestAreaReport))latestAreaReport=report.reportDatetime||latestAreaReport;
    if(!Array.isArray(area.kinds))throw Error('荒川区の警報一覧を確認できません');
    for(const kind of area.kinds){
      const code=kind?.code==null?'':String(kind.code).padStart(2,'0');
      if(!code||latestByCode.has(code))continue;
      const def=WARNING_DEFINITIONS[code];
      latestByCode.set(code,{code,status:String(kind.status||''),name:def?.name||null,level:def?.level||null,properties:Array.isArray(kind.properties)?kind.properties:[],reportDatetime:report.reportDatetime||null});
    }
  }
  if(!areaFound)throw Error('荒川区の警報一覧を確認できません');
  const warnings=[...latestByCode.values()].filter(x=>!x.status.includes('解除')).sort((a,b)=>(b.level||0)-(a.level||0)||timeValue(b.reportDatetime)-timeValue(a.reportDatetime)||a.code.localeCompare(b.code));
  const reportDatetime=warnings.reduce((latest,x)=>timeValue(x.reportDatetime)>timeValue(latest)?x.reportDatetime:latest,null)||latestAreaReport;
  return{state:'ok',reportDatetime,warnings};
}
function forecastPart(a){const d=a?.[0],w=d?.timeSeries?.[0],area=w?.areas?.find(x=>x.area?.code==='130010'),ps=d?.timeSeries?.[1],p=ps?.areas?.find(x=>x.area?.code==='130010');if(!area)throw Error('東京地方の予報を確認できません');return{state:'ok',reportDatetime:d.reportDatetime||null,weather:area.weathers?.[0]||'',pops:(p?.pops||[]).map((pop,i)=>({time:ps.timeDefines?.[i]||null,pop})).filter(x=>x.time)}}
function parseJmaTime(s){if(!/^\d{14}$/.test(String(s)))return NaN;return Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(8,10),+s.slice(10,12),+s.slice(12,14))}
function radarPart(a){const now=Date.now(),items=(Array.isArray(a)?a:[]).filter(x=>x?.basetime&&x?.validtime&&(x.elements||[]).includes('hrpns')).sort((x,y)=>String(y.validtime).localeCompare(String(x.validtime))),latest=items.find(x=>parseJmaTime(x.validtime)<=now+10*60000)||items[0];if(!latest)throw Error('雨雲タイル時刻を確認できません');return{state:'ok',basetime:latest.basetime,validtime:latest.validtime,timestamp:new Date(parseJmaTime(latest.validtime)).toISOString()}}
const safe=(r,fn)=>{if(r.status!=='fulfilled')return{state:'error',error:String(r.reason?.message||r.reason)};try{return fn(r.value)}catch(e){return{state:'error',error:String(e.message||e)}}};
export default async function(req,res){if(req.method!=='GET')return response(res,405,{error:'Method not allowed'});const [w,f,r]=await Promise.allSettled([getJson(WARNING,20000),getJson(FORECAST),getJson(RADAR)]);return response(res,200,{warning:safe(w,warningPart),forecast:safe(f,forecastPart),radar:safe(r,radarPart),retrievedAt:new Date().toISOString()})}
