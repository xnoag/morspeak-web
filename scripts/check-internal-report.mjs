import fs from'node:fs';import{gunzipSync}from'node:zlib';import assert from'node:assert/strict';import vm from'node:vm';
import usage from'../lib/skhappiness/usage-time.cjs';import{buildInternalUsageDay,readInternalUsageFeed}from'../lib/tracking-internal/shared-usage.mjs';
const manifest=JSON.parse(fs.readFileSync('internal-report/manifest.json')),seed=JSON.parse(fs.readFileSync('internal-report/usage-seed.json'));
const create=vm.runInNewContext(fs.readFileSync('share-report/replay.js','utf8')+';createRecordReplay;');
const forbidden=new Set(['text','intendedText','draftText','shortcuts','expressionTopic']);function scan(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert(!forbidden.has(k),k);scan(x);}}
assert.equal(manifest.patients.length,36);assert.equal(new Set(manifest.patients.map(p=>p.name)).size,36);scan(seed);scan(manifest);
let total=0;const means=[];
for(const summary of manifest.patients){
 const p=JSON.parse(gunzipSync(fs.readFileSync(`internal-report/${summary.id}.json.gz`)));scan(p);assert(p.name.endsWith('(가명)'));assert(p.detailLoaded);assert(!summary.detailLoaded);assert.equal(summary.speaks.length,0);
 const combined=p.speaks.length+p.featureTelemetry.messaging.events.filter(e=>e.direction==='sent').length;assert.equal(p.usageStats.totalUtteranceCount,combined);assert.equal(p.usageStats.speakCount,p.speaks.length);assert.equal(p.usageStats.totalSessionSeconds,p.sessions.reduce((n,s)=>n+s.duration,0));
 assert.equal(p.usageStats.dailySpeakAverage,combined/p.activeDays);assert(combined>1000);assert.equal(p.featureTelemetry.iot.devices.length,3);means.push(p.usageStats.appOpenDailyAverageSeconds/3600);total+=combined;
 const arrays=[p.speaks,p.sessions,p.featureTelemetry.messaging.events,p.featureTelemetry.iot.events,p.featureTelemetry.caregiverCalls.events,p.featureTelemetry.youtube.sessions,p.featureTelemetry.activity.events];for(const rows of arrays)assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,p.id+' unique record IDs');
 const sessions=new Map(p.sessions.map(s=>[s.id,s]));for(const e of p.speaks){const s=sessions.get(e.sessionId);assert(s&&e.timestamp.seconds>=s.start.seconds&&e.timestamp.seconds<=s.end.seconds);assert.equal(new Date((e.timestamp.seconds+32400)*1000).toISOString().slice(0,10),e.date);}
 let absent=0;for(const d of p.daily){absent=d.sessionSeconds?0:absent+1;assert(absent<=1);assert.equal(d.totalUtteranceCount,p.speaks.filter(e=>e.date===d.date).length+p.featureTelemetry.messaging.events.filter(e=>e.date===d.date&&e.direction==='sent').length);assert(d.activeUseSeconds<=d.appOpenSeconds);assert((p.featureTelemetry.activity.days[d.date]?.openIntervals.length||0)<=3);}
 assert(p.daily.filter(d=>!d.sessionSeconds).length/p.daily.length<.05);assert(p.daily.some(d=>d.appOpenSeconds>0&&d.appOpenSeconds<6*3600));
 const filtered={...seed,people:seed.people.filter(x=>x.id===p.id)},data={meta:structuredClone(manifest.meta),patients:[p]},engine=create(data),events=['2026-11-11','2026-11-12'].flatMap(d=>buildInternalUsageDay(filtered,d));
 for(const e of events){assert.equal(e.personId,p.id);assert.equal(new Date((e.timestamp+32400)*1000).toISOString().slice(0,10),e.date);assert(engine.apply(e));assert(!engine.apply(e));}engine.prepare(Date.parse('2026-11-12T23:59:59+09:00')/1000);usage.refreshUsageTimes(data,Date.parse('2026-11-12T23:59:59+09:00')/1000);assert.equal(p.usageStats.totalUtteranceCount,p.speaks.length+p.featureTelemetry.messaging.events.filter(e=>e.direction==='sent').length);
 const feed=readInternalUsageFeed(filtered,{now:Date.parse('2026-11-11T12:00:00+09:00'),limit:500});assert(feed.events.every(e=>e.personId===p.id&&e.timestamp<=Date.parse(feed.serverTime)/1000));scan(feed);
}
assert(new Set(means.map(h=>h.toFixed(2))).size>25);assert(Math.max(...means)-Math.min(...means)>5);
const index=fs.readFileSync('internal-report/index.html','utf8');assert(!index.includes('partner-logo'));assert(!index.includes('곧장기부'));assert(!index.includes('/ Tracking'));
console.log(JSON.stringify({profiles:36,totalUtterances:total,uniqueNames:true,allProfilesOver1000:true,countsAndSessionsMatch:true,uniqueRecords:true,privacy:true,maximumAbsenceDays:1,maximumMiddleGaps:2,profileOpenMeanRange:[Math.min(...means),Math.max(...means)],independentFeedAndIdempotency:true,partnerRemoved:true}));
