import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {buildUsageDay,readUsageFeed} from '../lib/skhappiness/shared-usage.mjs';
const seed=JSON.parse(fs.readFileSync('share-report/usage-seed.json')),baseline=JSON.parse(gunzipSync(fs.readFileSync('share-report/data.json.gz')));
const create=vm.runInNewContext(fs.readFileSync('share-report/replay.js','utf8')+';createRecordReplay;');
const summarize=vm.runInNewContext(fs.readFileSync('share-report/feature-metrics.js','utf8')+';featureSummary;');
const data=structuredClone(baseline),engine=create(data),events=['2026-11-06','2026-11-07'].flatMap(d=>buildUsageDay(seed,d));
for(const event of events){assert(engine.apply(event));assert(!engine.apply(event));}
for(const p of data.patients){const s=p.usageStats,f=summarize(p);assert.equal(s.speakCount,p.speaks.length);assert.equal(p.daily.reduce((n,d)=>n+d.speakCount,0),s.speakCount);assert.equal(f.caregiverCalls.count,s.callCount);assert.equal(f.messaging.sent,s.messageSentCount);assert.equal(f.messaging.received,s.messageReceivedCount);assert.equal(f.iot.totalCount,s.iotCount);assert.equal(f.youtube.watchSeconds,s.youtubeWatchSeconds);assert.equal(p.sessions.reduce((n,x)=>n+x.duration,0),s.totalSessionSeconds);for(const d of p.daily){assert.equal(d.speakCount,d.dailyExpressionCount+d.basicCareExpressionCount+d.unclearExpressionCount);assert.equal(d.modeSeconds_keyboard+d.modeSeconds_shortcut+d.modeSeconds_function+d.modeSeconds_youtubePlay+d.modeSeconds_youtubeSurf,d.sessionSeconds);}for(const v of p.featureTelemetry.youtube.sessions.filter(v=>v.recordOrigin==='generated-usage')){assert.equal(v.watchSeconds+v.pausedSeconds,v.end.seconds-v.start.seconds);assert(!p.speaks.some(e=>e.sessionId===v.sessionId&&e.timestamp.seconds>=v.start.seconds&&e.timestamp.seconds<=v.end.seconds));}}
const restored=structuredClone(baseline),second=create(restored);second.restore(engine.snapshot());assert.equal(JSON.stringify(restored),JSON.stringify(data));second.restore(engine.snapshot());assert.equal(JSON.stringify(restored),JSON.stringify(data));
let cursor='',seen=[];do{const f=readUsageFeed(seed,{now:Date.parse('2026-11-07T23:59:59+09:00'),after:cursor,limit:13});seen.push(...f.events);cursor=f.cursor;if(!f.hasMore)break;}while(true);assert.deepEqual(seen,events);
const frozen=readUsageFeed(seed,{now:Date.parse('2026-11-06T10:00:00+09:00')});assert.deepEqual(frozen,readUsageFeed(seed,{now:Date.parse('2026-11-06T10:00:00+09:00')}));assert(frozen.events.every(e=>e.timestamp<=Date.parse(frozen.serverTime)/1000));
assert.throws(()=>readUsageFeed(seed,{after:'bad'}));console.log(JSON.stringify({events:events.length,aggregates:true,idempotent:true,restore:true,pagination:true,commonServerClock:true,noVideoSpeechOverlap:true}));

const forbidden=new Set(['text','intendedText','draftText','shortcuts','expressionTopic']);function scan(value){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){assert(!forbidden.has(key),'sentence field '+key);scan(child);}}scan(data);scan(events);scan(seed);
for(const p of baseline.patients)for(const d of p.daily.filter(d=>d.sessionSeconds>0))for(const key of ['youtubeWatchSeconds','youtubeSelectCount','iotCount','messageContactCount','messageSentCount','messageReceivedCount','callCount'])assert(d[key]>0,p.id+'/'+d.date+'/'+key);
for(const p of data.patients){assert(p.name.endsWith('(가명)'));const d=p.daily.find(d=>d.date==='2026-11-06');assert(d.youtubeWatchSeconds>0);}
console.log('Sentence privacy, aliases, and active-day coverage verified');
const {isRestDay}=await import('../lib/skhappiness/activity-pattern.mjs');
const kstDate=seconds=>new Date((seconds+32400)*1000).toISOString().slice(0,10);
for(const p of data.patients){
 const s=p.usageStats;assert.equal(s.totalUtteranceCount,s.speakCount+s.messageSentCount);assert.equal(s.dailySpeakAverage,s.totalUtteranceCount/p.activeDays);assert.equal(p.speaks.length+p.featureTelemetry.messaging.events.filter(e=>e.direction==='sent').length,s.totalUtteranceCount);
 let absent=0;for(const d of p.daily){absent=d.sessionSeconds?0:absent+1;assert(absent<=1,p.id+' consecutive absent days');assert.equal(d.sessionSeconds===0,isRestDay(p.id,d.date),p.id+'/'+d.date);assert.equal(d.totalUtteranceCount,d.speakCount+d.messageSentCount);}
 for(const e of p.speaks){assert(['expression','request','response'].includes(e.utteranceCategory));assert.equal(kstDate(e.timestamp.seconds),e.date);const session=p.sessions.find(s=>s.id===e.sessionId);assert(session&&e.timestamp.seconds>=session.start.seconds&&e.timestamp.seconds<=session.end.seconds);}
 for(const e of p.featureTelemetry.messaging.events){assert.equal(kstDate(e.timestamp.seconds),e.date);if(e.direction==='sent')assert(['expression','request','response'].includes(e.utteranceCategory));}
}
let absence=new Map(seed.people.map(p=>[p.id,0]));for(let i=0;i<90;i++){const date=new Date(Date.UTC(2026,10,6+i)).toISOString().slice(0,10),rows=buildUsageDay(seed,date);assert.deepEqual(rows,buildUsageDay(seed,date));for(const p of seed.people){const used=rows.some(e=>e.personId===p.id);assert.equal(!used,isRestDay(p.id,date));absence.set(p.id,used?0:absence.get(p.id)+1);assert(absence.get(p.id)<=1);}}
console.log('Combined daily average, category records, weekly patterns and maximum 1-day absence verified');

for(const p of baseline.patients){assert.equal(p.periodStart,p.id==='SYN004'?'2026-05-17':'2026-08-01');assert.equal(p.daily[0].date,p.periodStart);assert.equal(p.speaks[0].date,p.periodStart);}
assert.equal(baseline.meta.demoPeriod.start,'2026-05-17');console.log('Youngsu starts May 17; other profiles keep August 1');
