import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {STATIONS,summarizeWater,normalizeObservations} from '../lib/water.mjs';
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
  assert.match(html,/<title>日暮里・荒川 水害情報ビューア<\/title>/);assert.match(html,/荒川の水位推移・雨雲・避難所・交通情報をひとまとめに/);
  assert.match(html,/bosai\/warning\/#area_type=class20s&amp;area_code=1311800/);
  assert.match(html,/pattern=default&amp;area_type=class20s&amp;area_code=1311800/);
  assert.match(html,/risk\/#zoom:12\/lat:35\.732021\/lon:139\.785919\/colordepth:normal\/elements:flood/);
  assert.match(html,/洪水キキクル/);
  assert.match(html,/表示期間切り替え/);assert.match(html,/data-range="120" class="active"/);
  assert.match(html,/arajo\/index\.html/);assert.match(html,/arage\/index\.html/);assert.match(html,/river\.go\.jp\/index\/twninfo/);assert.match(html,/kasen-suibo\.metro\.tokyo\.lg\.jp/);
  assert.match(html,/国土地理院（グレースケール・薄表示）/);assert.match(html,/60%表示/);
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
