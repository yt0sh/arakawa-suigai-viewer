import test from 'node:test';
import assert from 'node:assert/strict';
import {WARNING_DEFINITIONS,warningPart} from '../api/jma.js';

const report=(reportDatetime,kinds)=>({reportDatetime,warning:{class20Items:[{areaCode:'1311800',kinds}]}});

test('current JMA r8 reports are combined across report entries',()=>{
  const d=warningPart([
    report('2026-09-21T00:30:00+09:00',[{code:'03',status:'発表',properties:[]}]),
    report('2026-09-20T20:42:00+09:00',[{code:'29',status:'継続',properties:[]}])
  ]);
  assert.deepEqual(d.warnings.map(x=>[x.code,x.level,x.name]),[['03',3,'大雨警報'],['29',2,'土砂災害注意報']]);
  assert.equal(d.reportDatetime,'2026-09-21T00:30:00+09:00');
});

test('all supported codes have a level and are not dropped',()=>{
  const kinds=Object.keys(WARNING_DEFINITIONS).map(code=>({code,status:'発表'}));
  const d=warningPart([report('2026-09-21T01:00:00+09:00',kinds)]);
  assert.equal(d.warnings.length,Object.keys(WARNING_DEFINITIONS).length);
  assert.ok(d.warnings.every(x=>x.name&&[2,3,4,5].includes(x.level)));
});

test('release, unknown code and malformed data fail safely',()=>{
  const released=warningPart([report('2026-09-21T01:00:00+09:00',[{code:'03',status:'解除'}])]);
  assert.equal(released.warnings.length,0);
  const unknown=warningPart([report('2026-09-21T01:00:00+09:00',[{code:'99',status:'発表'}])]);
  assert.deepEqual(unknown.warnings.map(x=>[x.code,x.name,x.level]),[['99',null,null]]);
  assert.throws(()=>warningPart({}),/データ形式/);
  assert.throws(()=>warningPart([{warning:{class20Items:[]}}]),/荒川区/);
});
