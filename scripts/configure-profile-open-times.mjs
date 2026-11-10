import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import usage from '../lib/skhappiness/usage-time.cjs';
import {isLowUseDay} from '../lib/skhappiness/activity-pattern.mjs';

const file='share-report/data.json.gz',data=JSON.parse(gunzipSync(fs.readFileSync(file))),before=structuredClone(data);
if(data.meta.openProfileRevision===1)throw Error('Already applied');
for(const p of data.patients)for(const d of p.daily.filter(d=>d.sessionSeconds>0)){
 const plan=usage.planUsageDay(p.id,d.date,usage.inputTimes(p,d.date),{shortDay:isLowUseDay(p.id,d.date)});
 p.featureTelemetry.activity.days[d.date].openIntervals=plan.openIntervals;
}
usage.refreshUsageTimes(data,Date.parse(data.meta.demoPeriod.end+'T23:59:59+09:00')/1000);
for(const original of before.patients){
 const p=data.patients.find(p=>p.id===original.id);
 assert.deepEqual(p.speaks,original.speaks);
 assert.deepEqual(p.sessions,original.sessions);
 assert.deepEqual(p.featureTelemetry.messaging,original.featureTelemetry.messaging);
 assert.deepEqual(p.featureTelemetry.activity.events,original.featureTelemetry.activity.events);
 assert.equal(p.usageStats.totalUtteranceCount,original.usageStats.totalUtteranceCount);
 for(const d of p.daily)assert.equal(d.activeUseSeconds,original.daily.find(x=>x.date===d.date).activeUseSeconds);
}
data.meta.openProfileRevision=1;
data.meta.openProfileTargetsHours={SYN001:8,SYN002:12,SYN003:14,SYN004:10};
data.meta.dataVersion='v16-open-profiles';delete data.meta.sharedUsage;
const seed=JSON.parse(fs.readFileSync('share-report/usage-seed.json'));
seed.revision='shared-usage-v7';seed.baseVersion=data.meta.dataVersion;
fs.writeFileSync(file,gzipSync(JSON.stringify(data),{mtime:0}));
fs.writeFileSync('share-report/usage-seed.json',JSON.stringify(seed));
console.log(JSON.stringify(data.patients.map(p=>({id:p.id,name:p.name,openAverageHours:p.usageStats.appOpenDailyAverageSeconds/3600,activeAverageHours:p.usageStats.activeDailyAverageSeconds/3600,utterances:p.usageStats.totalUtteranceCount,minHours:Math.min(...p.daily.filter(d=>d.sessionSeconds>0).map(d=>d.appOpenSeconds))/3600,maxHours:Math.max(...p.daily.map(d=>d.appOpenSeconds))/3600})),null,2));
