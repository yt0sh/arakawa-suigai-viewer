import {appendFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const ROOT=new URL('../',import.meta.url);
const REGISTRY_URL=new URL('config/external-links.json',ROOT);
const VALID_PRIORITIES=new Set(['critical','high','normal','reference']);
const VALID_POLICIES=new Set(['strict','advisory']);
const TIMEOUT_MS=15_000;
const RETRIES=2;
const CONCURRENCY=5;

const normalize=value=>value.replaceAll('&amp;','&');
const escapeCell=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');

async function loadRegistry(){
  const links=JSON.parse(await readFile(REGISTRY_URL,'utf8'));
  if(!Array.isArray(links)||links.length===0)throw new Error('外部リンク台帳が空です');
  const ids=new Set(),urls=new Set();
  for(const [index,link] of links.entries()){
    for(const key of ['id','name','category','provider','priority','url','sources']){
      if(!link[key]||(key==='sources'&&!Array.isArray(link[key])))throw new Error(`${index+1}件目に ${key} がありません`);
    }
    if(ids.has(link.id))throw new Error(`idが重複しています: ${link.id}`);
    if(urls.has(link.url))throw new Error(`URLが重複しています: ${link.url}`);
    if(!VALID_PRIORITIES.has(link.priority))throw new Error(`priorityが不正です: ${link.id}`);
    if(!VALID_POLICIES.has(link.policy??'strict'))throw new Error(`policyが不正です: ${link.id}`);
    new URL(link.url);
    ids.add(link.id);urls.add(link.url);
    for(const source of link.sources){
      const sourceUrl=new URL(source,ROOT);
      if(!existsSync(sourceUrl))throw new Error(`参照元ファイルがありません: ${link.id} -> ${source}`);
      const text=normalize(await readFile(sourceUrl,'utf8'));
      if(!text.includes(link.url))throw new Error(`参照元にURLが見つかりません: ${link.id} -> ${source}`);
    }
  }
  await assertVisibleLinkCoverage(links);
  return links;
}

async function assertVisibleLinkCoverage(links){
  const html=normalize(await readFile(new URL('public/index.html',ROOT),'utf8'));
  const app=normalize(await readFile(new URL('public/app.js',ROOT),'utf8'));
  const hrefs=[...html.matchAll(/\bhref="(https:[^"]+)"/g)].map(match=>match[1]);
  const generated=[...app.matchAll(/(?:riverUrl|cameraUrl):'([^']+)'/g)].map(match=>match[1]);
  const registered=new Set(links.map(link=>link.url));
  const missing=[...new Set([...hrefs,...generated])].filter(url=>!registered.has(url));
  if(missing.length)throw new Error(`台帳未登録の公開リンクがあります:\n${missing.join('\n')}`);
}

async function request(link){
  let lastError;
  for(let attempt=1;attempt<=RETRIES;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
      const response=await fetch(link.url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'arakawa-suigai-viewer-link-check/1.0','accept':'text/html,application/json,application/pdf,*/*;q=0.8'}});
      clearTimeout(timer);
      await response.body?.cancel().catch(()=>{});
      if(response.status>=200&&response.status<400)return {state:'ok',status:response.status,finalUrl:response.url};
      lastError=new Error(`HTTP ${response.status}`);
      if(response.status<500&&response.status!==429)break;
    }catch(error){
      clearTimeout(timer);lastError=error;
    }
  }
  const message=lastError?.name==='AbortError'?`timeout ${TIMEOUT_MS/1000}s`:String(lastError?.message??lastError);
  return {state:(link.policy??'strict')==='advisory'?'warning':'error',message};
}

async function mapLimit(items,limit,worker){
  const results=new Array(items.length);let next=0;
  async function run(){while(next<items.length){const index=next++;results[index]=await worker(items[index]);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},run));
  return results;
}

function render(links,results){
  const marks={ok:'✅',warning:'⚠️',error:'❌'};
  const rows=links.map((link,index)=>({link,result:results[index]})).sort((a,b)=>a.link.category.localeCompare(b.link.category,'ja')||a.link.name.localeCompare(b.link.name,'ja'));
  const counts=results.reduce((acc,result)=>(acc[result.state]++,acc),{ok:0,warning:0,error:0});
  const lines=[
    '# 外部リンク検査',
    '',
    `検査日時: ${new Date().toISOString()}`,
    '',
    `正常 ${counts.ok}件 ／ 要目視確認 ${counts.warning}件 ／ エラー ${counts.error}件`,
    '',
    '|結果|分類|名称|提供元|重要度|応答|',
    '|---|---|---|---|---|---|'
  ];
  for(const {link,result} of rows){
    const response=result.status?`HTTP ${result.status}`:result.message;
    lines.push(`|${marks[result.state]}|${escapeCell(link.category)}|[${escapeCell(link.name)}](${link.url})|${escapeCell(link.provider)}|${escapeCell(link.priority)}|${escapeCell(response)}|`);
    if(result.state!=='ok'&&link.note)lines.push(`||||||補足: ${escapeCell(link.note)}|`);
  }
  return `${lines.join('\n')}\n`;
}

const links=await loadRegistry();
if(process.argv.includes('--validate-only')){
  console.log(`外部リンク台帳: ${links.length}件、構造・参照元・公開リンク網羅性に問題ありません。`);
  process.exit(0);
}

const results=await mapLimit(links,CONCURRENCY,request);
const report=render(links,results);
console.log(report);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
if(results.some(result=>result.state==='error'))process.exitCode=1;
