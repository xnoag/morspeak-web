import fs from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';import vm from 'node:vm';import crypto from 'node:crypto';
import {buildUsageDay} from '../lib/skhappiness/shared-usage.mjs';import {isRestDay,ACTIVITY_PATTERNS} from '../lib/skhappiness/activity-pattern.mjs';
const file='share-report/data.json.gz',data=JSON.parse(gunzipSync(fs.readFileSync(file))),seed=JSON.parse(fs.readFileSync('share-report/usage-seed.json'));
if(data.meta.dataVersion!=='v11-summary')throw Error('Expected preserved v11 baseline; do not run twice');
const raw=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):null;
function category(row){if(row.communicationClass==='unclear')return'expression';const text=(row.intendedText||row.text||'').replace(/\s/g,'');if(/^(응|응응|네|네네|예|아니|아니야|아니요|맞아|맞아요|그래|그래요|알겠어|알았어|됐어|괜찮아|고마워|감사합니다|좋아|싫어|몰라|맞|웅|넵)[.!?]*$/.test(text))return'response';if(row.communicationClass==='basicCare'||/(줘|주세요|달라|해라|하자|할래|싶어|꺼|켜|틀어|가져|올려|내려|좀|어디|언제|누구|뭐|왜|어때)/.test(text))return'request';return'expression';}
const create=vm.runInNewContext(fs.readFileSync('share-report/replay.js','utf8')+';createRecordReplay;');create(data).prepare(Date.parse('2026-11-05T23:59:59+09:00')/1000);
const dayNumber=date=>Date.parse(date+'T00:00:00Z')/86400000;
for(const p of data.patients){
 const original=raw?.patients.find(x=>x.id===p.id),byId=new Map((original?.speaks||[]).map(e=>[e.id,category(e)])),byKey=new Map((original?.speaks||[]).map(e=>[crypto.createHash('sha256').update(e.intendedText).digest('hex').slice(0,20),category(e)]));
 for(const e of p.speaks)e.utteranceCategory=byId.get(e.id)||(e.communicationClass==='basicCare'?'request':'expression');
 for(const t of seed.people.find(x=>x.id===p.id).templates)t.utteranceCategory=byKey.get(t.templateKey)||(t.communicationClass==='basicCare'?'request':'expression');
 const restWithUse=p.daily.filter(d=>isRestDay(p.id,d.date)&&d.sessionSeconds>0),emptyActive=p.daily.filter(d=>!isRestDay(p.id,d.date)&&d.sessionSeconds===0);
 for(const from of restWithUse){
  emptyActive.sort((a,b)=>Math.abs(dayNumber(a.date)-dayNumber(from.date))-Math.abs(dayNumber(b.date)-dayNumber(from.date))||a.date.localeCompare(b.date));const target=emptyActive.shift();if(!target)throw Error('Not enough activity dates');
  const before=from.date,after=target.date,delta=(dayNumber(after)-dayNumber(before))*86400;
  function shift(v){if(!v||typeof v!=='object')return;if(typeof v.seconds==='number')v.seconds+=delta;for(const[k,x]of Object.entries(v)){if(k==='date'&&x===before)v[k]=after;else if(typeof x==='object')shift(x);}}
  for(const rows of [p.speaks,p.sessions,p.featureTelemetry.youtube.sessions,p.featureTelemetry.iot.events,p.featureTelemetry.messaging.events,p.featureTelemetry.caregiverCalls.events])for(const row of rows)if(row.date===before)shift(row);
  Object.assign(target,structuredClone(from),{date:after});for(const[k,v]of Object.entries(from))if(typeof v==='number')from[k]=0;from.dailyExpressionShare=null;
 }
}
seed.revision='shared-usage-v3';seed.baseVersion='v12-categories';data.meta.dataVersion='v12-categories';
const engine=create(data);const dates=data.patients[0].daily.map(d=>d.date);
for(const date of dates){const missing=new Set(data.patients.filter(p=>!isRestDay(p.id,date)&&p.daily.find(d=>d.date===date).sessionSeconds===0).map(p=>p.id));if(missing.size)for(const event of buildUsageDay(seed,date))if(missing.has(event.personId))engine.apply(event);}
for(const p of data.patients){
 p.speaks.sort((a,b)=>a.timestamp.seconds-b.timestamp.seconds);p.sessions.sort((a,b)=>a.start.seconds-b.start.seconds);
 for(const e of p.featureTelemetry.messaging.events.filter(e=>e.direction==='sent')){let n=0;for(const c of e.id)n=(n+c.charCodeAt(0))%17;e.utteranceCategory||=['response','expression','request'][n%3];e.expressionCategory||=['family','routine','feelings'][n%3];}
 for(const d of p.daily){d.spokenCount=d.speakCount;d.totalUtteranceCount=d.speakCount+d.messageSentCount;}
 p.activeDays=p.daily.filter(d=>d.sessionSeconds>0).length;const s=p.usageStats;s.spokenCount=s.speakCount;s.totalUtteranceCount=s.speakCount+s.messageSentCount;s.dailySpeakAverage=s.totalUtteranceCount/p.activeDays;s.speakAverageDays=p.activeDays;
 s.lastUpdated={seconds:Math.max(...p.sessions.map(s=>s.end.seconds)),nanoseconds:0};
}
data.meta.activityPatterns=ACTIVITY_PATTERNS;data.meta.dailyUtteranceDefinition='(spokenCount + messageSentCount) / appUsedDays';delete data.meta.sharedUsage;
fs.writeFileSync(file,gzipSync(JSON.stringify(data),{mtime:0}));fs.writeFileSync('share-report/usage-seed.json',JSON.stringify(seed));
console.log(data.patients.map(p=>({name:p.name,days:p.activeDays,spoken:p.usageStats.speakCount,sent:p.usageStats.messageSentCount,dailyAverage:p.usageStats.dailySpeakAverage.toFixed(1)})));
