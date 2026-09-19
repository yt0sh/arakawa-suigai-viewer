import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {STATIONS,summarizeWater,normalizeObservations} from '../lib/water.mjs';
import {createContext,runInContext} from 'node:vm';
test('status cards distinguish no alerts, active alerts, unknown data and fetch failures',async()=>{
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',className:''});return nodes.get(id)};
  let payload={},failed=false;
  const context=createContext({document:{querySelector:node},Intl,Date,AbortController,setTimeout,clearTimeout,
    fetch:async()=>{if(failed)throw Error('offline');return {ok:true,json:async()=>payload}}});
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  runInContext(app.slice(0,app.lastIndexOf('initStations();initRange();')),context);
  const stamp='2026-09-19T03:04:00Z';
  context.warning={state:'ok',warnings:[],reportDatetime:null};context.stamp=stamp;
  runInContext('updateWarning(warning,stamp)',context);
  assert.equal(node('#weatherStatus').textContent,'警報・注意報なし');
  assert.match(node('#weatherTime').textContent,/確認 9\/19 12:04/);
  assert.equal(node('#weatherDetail').textContent,'');
  context.warning={state:'ok',warnings:[{code:'03',status:'発表'}],reportDatetime:stamp};
  runInContext('updateWarning(warning,stamp)',context);
  assert.equal(node('#weatherDot').className,'dot warn');
  assert.match(node('#weatherDetail').textContent,/大雨警報/);
  assert.match(node('#weatherTime').textContent,/確認 .*｜発表 /);
  runInContext('updateWarning(null)',context);
  assert.equal(node('#weatherStatus').textContent,'取得できません');
  assert.match(node('#weatherTime').textContent,/取得失敗 /);
  assert.equal(runInContext('statusTimestamp(null)',context),'確認時刻不明');
  payload={state:'none',retrievedAt:stamp};await runInContext('loadEvacuation()',context);
  assert.equal(node('#evacStatus').textContent,'避難指示なし');
  assert.match(node('#evacTime').textContent,/確認 9\/19 12:04/);
  for(const [highest,label] of [[3,'高齢者等避難'],[4,'避難指示'],[5,'緊急安全確保']]){
    payload={state:'active',highest,summary:'対象地域',retrievedAt:stamp};await runInContext('loadEvacuation()',context);
    assert.equal(node('#evacStatus').textContent,label+' 発令中');
  }
  payload={state:'unknown',retrievedAt:stamp};await runInContext('loadEvacuation()',context);
  assert.equal(node('#evacStatus').textContent,'一部を確認できません');
  failed=true;await runInContext('loadEvacuation()',context);
  assert.equal(node('#evacStatus').textContent,'取得できません');
  assert.match(node('#evacTime').textContent,/取得失敗 /);
  const flood=readFileSync(new URL('../public/flood-forecast.js',import.meta.url),'utf8').replace('load();setInterval(load,300000);','return load();');
  failed=false;payload={state:'none',retrievedAt:stamp};await runInContext(flood,context);
  assert.equal(node('#floodStatus').textContent,'荒川の氾濫情報なし');
  assert.match(node('#floodTime').textContent,/確認 9\/19 12:04/);
  payload={state:'active',level:4,label:'氾濫危険情報',headline:'対象地域',retrievedAt:stamp,reportDatetime:stamp};await runInContext(flood,context);
  assert.equal(node('#floodDot').className,'dot lv4');
  assert.match(node('#floodTime').textContent,/確認 .*｜発表 /);
  payload={state:'unknown'};await runInContext(flood,context);
  assert.equal(node('#floodStatus').textContent,'取得できません');
  failed=true;await runInContext(flood,context);
  assert.match(node('#floodTime').textContent,/取得失敗 /);
});
test('preview link styling and understated history stay consistent',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../dist/v08-ui.css',import.meta.url),'utf8');
  assert.doesNotMatch(html,/<span class="version">/);
  assert.doesNotMatch(html,/status-card-source">[^<]*→/);
  assert.doesNotMatch(html,/class="(?:btn )?primary"/);
  assert.match(app,/data-river[^>]*>観測所情報<\/a>/);
  assert.doesNotMatch(app,/class="primary"/);
  const history=html.slice(html.indexOf('<section class="section-block secondary-section history-section">'),html.indexOf('<footer'));
  assert.doesNotMatch(history,/<h3>/);
  for(const date of ['2019-10','2021-08','2026-09'])assert.ok(history.includes(date));
  assert.match(ui,/:is\(\.status-card-link,\.link-grid a,\.social-profile-card,\.live-search-card,\.source-strip a,\.station-links a,\.btn\):hover\{background:#f1f5f8;border-color:#aab9c7;text-decoration:none\}/);
  assert.doesNotMatch(ui,/translateY\(-1px\)/);
});
test('three requested river stations are configured with exact IDs and public links',()=>{
  assert.equal(STATIONS.iwabuchi.id,'303041283309040');assert.equal(STATIONS.chisuibashi.id,'303041283308060');assert.equal(STATIONS.kumagaya.id,'303041283308030');
  assert.equal(STATIONS.iwabuchi.name,'岩淵水門');
  assert.match(STATIONS.chisuibashi.cameraImage,/cam02\.jpg$/);assert.match(STATIONS.kumagaya.cameraImage,/cam23\.jpg$/);
  assert.match(STATIONS.iwabuchi.riverUrl,/obsCd=6/);assert.match(STATIONS.chisuibashi.riverUrl,/obsCd=9/);assert.match(STATIONS.kumagaya.riverUrl,/obsCd=7/)
});
test('station-specific thresholds and requested chart ranges remain distinct',()=>{
  assert.deepEqual(STATIONS.chisuibashi.thresholds,{standby:7,advisory:7.5,evacuation:12.8,danger:13.3,plan:14.6});
  assert.deepEqual(STATIONS.kumagaya.thresholds,{standby:3,advisory:3.5,evacuation:5,danger:5.5,plan:7.51});
  assert.equal(STATIONS.iwabuchi.chartMax,8);assert.equal(STATIONS.chisuibashi.chartMax,14);assert.equal(STATIONS.kumagaya.chartMax,6)
});
test('water summary returns selected station metadata and exact deltas',()=>{
  const rows=normalizeObservations([{date:'2026/09/10',time:'08:00',value:'2.00'},{date:'2026/09/10',time:'08:50',value:'2.20'},{date:'2026/09/10',time:'09:00',value:'2.30'}]);
  const now=Date.parse('2026-09-10T00:05:00Z'),d=summarizeWater(rows,STATIONS.kumagaya,now);
  assert.equal(d.station.key,'kumagaya');assert.equal(d.latest.value,2.3);assert.equal(d.delta10,.1);assert.equal(d.delta60,.3);assert.equal(d.chartMax,6)
});
test('v0.8 frontend has ordered alerts, Tokyo live cameras, profile SNS cards and visual link cards',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8'),ui=readFileSync(new URL('../dist/v08-ui.css',import.meta.url),'utf8'),flood=readFileSync(new URL('../dist/flood-forecast.js',import.meta.url),'utf8'),api=readFileSync(new URL('../api/flood-forecast.js',import.meta.url),'utf8'),icons=readFileSync(new URL('../dist/card-icons.js',import.meta.url),'utf8'),iconCss=readFileSync(new URL('../dist/card-icons.css',import.meta.url),'utf8'),evacSvg=readFileSync(new URL('../dist/evacuation-area-symbol.svg',import.meta.url),'utf8');
  assert.match(html,/<title>日暮里・荒川 水害情報ビューア<\/title>/);assert.match(html,/地域の水害関連情報をまとめています。最新情報は各リンク先をご確認ください。/);
  assert.doesNotMatch(html,/class="notice"|status-card-source/);
  assert.equal((html.match(/class="status-external"/g)||[]).length,3);
  assert.match(html,/bosai\/warning\/#area_type=class20s&amp;area_code=1311800/);
  assert.match(html,/pattern=default&amp;area_type=class20s&amp;area_code=1311800/);
  assert.match(html,/risk\/#zoom:12\/lat:35\.732021\/lon:139\.785919\/colordepth:normal\/elements:flood/);
  assert.match(html,/洪水キキクル/);
  assert.match(html,/表示期間切り替え/);assert.match(html,/data-range="120" class="active"/);
  assert.match(html,/arajo\/index\.html/);assert.match(html,/arage\/index\.html/);assert.match(html,/river\.go\.jp\/index\/twninfo/);assert.match(html,/kasen-suibo\.metro\.tokyo\.lg\.jp/);
  assert.match(html,/<h2>天気・雨雲<\/h2>/);
  assert.match(html,/<h2>荒川区の避難情報<\/h2>/);
  for(const subtitle of ['熊谷・治水橋・岩淵水門の水位推移とライブ映像','荒川区周辺の降水域と雨雲の動き','避難所の開設状況・水害時の避難先・浸水想定','電車の運行状況と停電・断水などのライフライン情報'])assert.match(html,new RegExp(subtitle));
  const sectionSubtitles=[...html.matchAll(/<div class="section-heading">[\s\S]*?<p>([^<]+)<\/p>/g)].map(x=>x[1]);
  assert.equal(sectionSubtitles.filter(x=>/を確認$/.test(x)).length,0);
  assert.match(html,/<h3><a class="radar-title-link"[^>]*>荒川区周辺の雨雲<\/a><\/h3>/);
  assert.equal((html.match(/id="radarLabel"/g)||[]).length,1);
  assert.doesNotMatch(html,/グレースケール・薄表示|60%表示|背景地図は|気象庁｜荒川区の天気 →/);
  assert.match(ui,/mask:url\('\/external-link\.svg'\)/);
  assert.match(html,/id="floodStatus"/);assert.match(html,/気象庁｜荒川の氾濫情報/);assert.match(html,/flood-forecast\.js/);
  const weatherPos=html.indexOf('id="weatherStatus"'),floodPos=html.indexOf('id="floodStatus"'),evacPos=html.indexOf('id="evacStatus"');
  assert.ok(weatherPos>=0&&weatherPos<floodPos&&floodPos<evacPos);
  assert.equal((html.match(/class="status-card status-visual status-card-link/g)||[]).length,3);
  assert.equal((html.match(/class="status-watermark/g)||[]).length,3);
  assert.match(html,/M10\.363 3\.591l-8\.106 13\.534/);assert.match(html,/M3 20\.75a2\.4 2\.4/);
  assert.match(ui,/evacuation-area-symbol\.svg/);assert.match(ui,/status-watermark-image img\{display:none\}/);
  assert.equal((evacSvg.match(/<path /g)||[]).length,3);assert.match(evacSvg,/viewBox="0 0 48\.364933 48\.374404"/);assert.match(evacSvg,/fill="#6d7d8c"/);assert(!evacSvg.includes('<clipPath'));assert(!evacSvg.includes('#000000'));
  assert.match(ui,/\.status-weather \.status-watermark\{color:#6d7d8c/);assert.match(ui,/\.status-flood \.status-watermark\{color:#6d7d8c/);assert.match(ui,/\.status-evacuation \.status-watermark\{color:#6d7d8c/);
  for(const id of ['_dA2jB2NEZw','ec8nY1JZ6zA','pmTFyDvr4l4'])assert.match(html,new RegExp(id));
  for(const tgid of ['226001','226008','203001'])assert.match(html,new RegExp('tgid='+tgid));
  assert.equal((html.match(/youtube-nocookie\.com\/embed\//g)||[]).length,3);assert.equal((html.match(/camera-only-card/g)||[]).length,3);
  for(const handle of ['Kantei_Saigai','tokyo_bousai','arakawakukoho','mlit_arakawa_ka'])assert.match(html,new RegExp('x\\.com/'+handle));
  assert.equal((html.match(/class="social-profile-card"/g)||[]).length,4);assert.equal((html.match(/https:\/\/unavatar\.io\/x\//g)||[]).length,4);
  assert.match(html,/地域名を含むつぶやき/);assert.doesNotMatch(html,/Xの地域関連投稿|地域のリアルタイム投稿|リアルタイム検索|live-search-badge/);
  assert.match(html,/<strong>LINE オープンチャット<\/strong>/);assert.doesNotMatch(html,/community-service|LINE OPENCHAT|2019年10月、巨大台風の接近時に/);
  assert.match(html,/荒川区災害情報サイト　避難場所・避難所/);assert.match(html,/荒川区 &gt; 防災 &gt; 水害に備えて/);
  assert.match(html,/documentsarakawasuigai-omote\.pdf/);assert.match(html,/荒川区防災地図\(水害版\) \(PDF\)/);
  for(const appName of ['東京都防災アプリ','荒川防災アプリ','NHK ONE ニュース・防災アプリ','Yahoo! 防災アプリ','特務機関 NERV防災アプリ'])assert.match(html,new RegExp(appName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/bousai\.metro\.tokyo\.lg\.jp\/1028747\/index\.html/);assert.match(html,/dentatsushudan\/bousaiapuri\.html/);
  assert.doesNotMatch(html,/東京都｜公式配布ページ|荒川区｜公式配布ページ|NHK｜公式案内|Yahoo!防災速報｜公式案内|ゲヒルン｜公式案内/);
  assert.match(html,/style\.css\?v=0\.8\.1/);assert.match(html,/v08-ui\.css\?v=0\.8\.1/);
  assert.match(html,/class="link-grid five"/);assert.match(ui,/\.link-grid\.five/);assert.match(ui,/top:13px;right:13px/);
  assert(!html.includes('twitter-timeline'));assert(!html.includes('platform.x.com/widgets.js'));
  assert.match(html,/card-icons\.css/);assert.match(html,/card-icons\.js/);assert.match(html,/v08-ui\.css/);
  for(const mark of ['mark-jr','mark-metro','mark-keisei','mark-toei','mark-electric','mark-gas','mark-water','mark-sewer'])assert.match(icons,new RegExp(mark));
  assert.match(icons,/JR_East_logo\.svg/);assert.match(icons,/Tokyo_Metro_logo\.svg/);assert.match(icons,/Keisei_Electric_Railway_logo\.svg/);assert.match(icons,/Toei_Transportation_combined_logo\.svg/);
  assert.match(icons,/host\.endsWith\(`\.\$\{domain\}`\)/);assert.match(icons,/'jreast\.co\.jp'/);assert.match(icons,/fallbackTried/);
  assert.match(iconCss,/--mark-opacity/);assert.match(iconCss,/--mark-scale/);assert.match(iconCss,/mark-sewer/);
  assert.match(ui,/camera-only-card/);assert.match(ui,/social-profile-card/);assert.match(ui,/filter:grayscale\(1\)/);assert.match(ui,/opacity:\.30/);assert.match(ui,/\.tile\.radar-tile\{opacity:\.60\}/);
  assert.match(html,/keisei\.co\.jp\/traininfo\/index\.php/);assert.match(html,/kotsu\.metro\.tokyo\.jp\/subway\//);
  assert.ok(app.indexOf("key:'kumagaya'")<app.indexOf("key:'chisuibashi'")&&app.indexOf("key:'chisuibashi'")<app.indexOf("key:'iwabuchi'"));
  assert.match(app,/let chartHours=120/);assert.match(app,/radarZoom:8/);assert.match(app,/\/api\/radar-tile/);
  assert.match(flood,/\/api\/flood-forecast/);assert.match(api,/8303040001/);assert.match(api,/flood_xml\.json/);
  assert(!html.includes('id="shelters"'));assert(!html.includes('id="utilities"'))
});
