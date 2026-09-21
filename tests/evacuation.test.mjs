import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEvacuationData} from '../lib/arakawa.mjs';

const feature=name=>({type:'Feature',properties:{attr:{name}}});
const data=overrides=>({
  Update_At:'2026/09/21 16:20',
  Hinan_Anzenkakuho:{area:{features:[]}},
  Hinan_Shiji:{area:{features:[]}},
  Hinan_Zyunbi:{area:{features:[]}},
  ...overrides
});

test('level 4 evacuation order lists every active district',()=>{
  const result=parseEvacuationData(data({Hinan_Shiji:{area:{features:[feature('西日暮里３丁目 *'),feature('西日暮里４丁目 *')]}}}));
  assert.equal(result.state,'active');
  assert.equal(result.highest,4);
  assert.equal(result.levels[5].state,'none');
  assert.equal(result.levels[4].state,'active');
  assert.equal(result.levels[3].state,'none');
  assert.deepEqual(result.levels[4].areas,['西日暮里３丁目 *','西日暮里４丁目 *']);
  assert.equal(result.summary,'レベル4：西日暮里３丁目 * ／ 西日暮里４丁目 *');
  assert.equal(result.reportDatetime,'2026-09-21T07:20:00.000Z');
});

test('simultaneous levels are all summarized and the highest controls severity',()=>{
  const result=parseEvacuationData(data({
    Hinan_Anzenkakuho:{area:{features:[feature('町屋一丁目')]}},
    Hinan_Shiji:{area:{features:[feature('西日暮里三丁目')]}},
    Hinan_Zyunbi:{area:{features:[feature('東日暮里一丁目')]}}
  }));
  assert.equal(result.highest,5);
  assert.equal(result.summary,'レベル5：町屋一丁目 ／ レベル4：西日暮里三丁目 ／ レベル3：東日暮里一丁目');
});

test('valid empty feature arrays mean no evacuation information',()=>{
  const result=parseEvacuationData(data({}));
  assert.equal(result.state,'none');
  assert.equal(result.active,false);
});

test('missing or malformed sections never become no evacuation information',()=>{
  const missing=parseEvacuationData({Update_At:'2026/09/21 16:20',Hinan_Shiji:{area:{features:[]}}});
  assert.equal(missing.state,'unknown');
  assert.equal(missing.active,null);
  const malformed=parseEvacuationData(data({Hinan_Shiji:{area:{features:'対象地区なし'}}}));
  assert.equal(malformed.state,'unknown');
  assert.equal(malformed.levels[4].state,'unknown');
});

test('a feature without a readable name remains active',()=>{
  const result=parseEvacuationData(data({Hinan_Shiji:{area:{features:[{type:'Feature',properties:{}}]}}}));
  assert.equal(result.state,'active');
  assert.equal(result.highest,4);
  assert.match(result.summary,/対象地区あり/);
});
