import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import usage from '../lib/skhappiness/usage-time.cjs';
import {buildUsageDay,readUsageFeed} from '../lib/skhappiness/shared-usage.mjs';
const seed=JSON.parse(fs.readFileSync('share-report/usage-seed.json')),baseline=JSON.parse(gunzipSync(fs.readFileSync('share-report/data.json.gz')));
const create=vm.runInNewContext(fs.readFileSync('share-report/usage-time.js','utf8')+fs.readFileSync('share-report/replay.js','utf8')+';createRecordReplay;');
const summarize=vm.runInNewContext(fs.readFileSync('share-report/feature-metrics.js','utf8')+';featureSummary;');
const data=structuredClone(baseline),engine=create(data),events=['2026-11-06','2026-11-07'].flatMap(d=>buildUsageDay(seed,d));
for(const event of events){assert(engine.apply(event));assert(!engine.apply(event));}
usage.refreshUsageTimes(data,Date.parse('2026-11-07T23:59:59+09:00')/1000);
for(const p of data.patients){const s=p.usageStats,f=summarize(p);assert.equal(s.speakCount,p.speaks.length);assert.equal(p.daily.reduce((n,d)=>n+d.speakCount,0),s.speakCount);assert.equal(f.caregiverCalls.count,s.callCount);assert.equal(f.messaging.sent,s.messageSentCount);assert.equal(f.messaging.received,s.messageReceivedCount);assert.equal(f.iot.totalCount,s.iotCount);assert.equal(f.youtube.watchSeconds,s.youtubeWatchSeconds);assert.equal(p.sessions.reduce((n,x)=>n+x.duration,0),s.totalSessionSeconds);for(const d of p.daily){assert.equal(d.speakCount,d.dailyExpressionCount+d.basicCareExpressionCount+d.unclearExpressionCount);assert.equal(d.modeSeconds_keyboard+d.modeSeconds_shortcut+d.modeSeconds_function+d.modeSeconds_youtubePlay+d.modeSeconds_youtubeSurf,d.sessionSeconds);}for(const v of p.featureTelemetry.youtube.sessions.filter(v=>v.recordOrigin==='generated-usage')){assert.equal(v.watchSeconds+v.pausedSeconds,v.end.seconds-v.start.seconds);assert(!p.speaks.some(e=>e.sessionId===v.sessionId&&e.timestamp.seconds>=v.start.seconds&&e.timestamp.seconds<=v.end.seconds));}}
const restored=structuredClone(baseline),second=create(restored);second.restore(engine.snapshot());usage.refreshUsageTimes(restored,Date.parse('2026-11-07T23:59:59+09:00')/1000);assert.equal(JSON.stringify(restored),JSON.stringify(data));second.restore(engine.snapshot());usage.refreshUsageTimes(restored,Date.parse('2026-11-07T23:59:59+09:00')/1000);assert.equal(JSON.stringify(restored),JSON.stringify(data));
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

assert.deepEqual(usage.actionIntervals([1000,1300],0,86400),[[580,1720]]);assert.equal(usage.intervalSeconds(usage.actionIntervals([1000,1300],0,86400)),1140);
const openTargets={SYN001:8,SYN002:12,SYN003:14,SYN004:10};
assert.equal(fs.readFileSync('lib/skhappiness/usage-time.cjs','utf8'),fs.readFileSync('share-report/usage-time.js','utf8'));
for(const p of baseline.patients){assert(Math.abs(p.usageStats.appOpenDailyAverageSeconds/3600-openTargets[p.id])<.5,p.id+' profile open mean');assert(p.usageStats.activeDailyAverageSeconds>=5*3600&&p.usageStats.activeDailyAverageSeconds<=6*3600);const normal=p.daily.filter(d=>d.appOpenSeconds>6*3600).map(d=>d.appOpenSeconds/3600),mean=normal.reduce((a,b)=>a+b,0)/normal.length;assert(Math.sqrt(normal.reduce((n,h)=>n+(h-mean)**2,0)/normal.length)>.5,p.id+' normal-day variation');for(const d of p.daily){assert(d.activeUseSeconds<=d.appOpenSeconds);assert.equal(d.totalUtteranceCount,p.speaks.filter(e=>e.date===d.date).length+p.featureTelemetry.messaging.events.filter(e=>e.date===d.date&&e.direction==='sent').length);}}
console.log('7-minute windows merge once; open/active time separate; record rows equal every daily and total count');
for(const p of baseline.patients)for(const day of Object.values(p.featureTelemetry.activity.days))assert(day.openIntervals.length<=3,'At most two middle gaps');
const futureOpen=new Map(seed.people.map(p=>[p.id,[]]));
for(let i=0;i<90;i++){const date=new Date(Date.UTC(2026,10,6+i)).toISOString().slice(0,10);for(const e of buildUsageDay(seed,date).filter(e=>e.kind==='availability')){assert(e.payload.openIntervals.length<=3);const hours=usage.intervalSeconds(e.payload.openIntervals)/3600;assert(hours<=({SYN001:12,SYN002:14.4,SYN003:15.9,SYN004:12}[e.personId]));futureOpen.get(e.personId).push(hours);}}
for(const [id,hours]of futureOpen){assert(Math.abs(hours.reduce((a,b)=>a+b,0)/hours.length-openTargets[id])<1,id+' future open mean');assert(new Set(hours.map(h=>Math.round(h*60))).size>30,id+' distinct daily durations');}
console.log('All historical and next 90 days have at most 2 middle open-time gaps');

const {isLowUseDay}=await import('../lib/skhappiness/activity-pattern.mjs');for(const p of baseline.patients){const short=p.daily.filter(d=>d.sessionSeconds>0&&isLowUseDay(p.id,d.date));assert(short.length>0);assert(p.daily.filter(d=>!d.sessionSeconds).length/p.daily.length<.05);for(const d of short){assert(d.appOpenSeconds<6*3600);assert(d.activeUseSeconds<4*3600);assert(d.speakCount>0&&d.messageSentCount>0);}}console.log('Fully unused days below 5%; recurring short days retain corresponding record rows and lower duration');
