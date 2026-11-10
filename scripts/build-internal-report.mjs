import fs from 'node:fs';import {gunzipSync,gzipSync}from'node:zlib';
import usage from'../lib/skhappiness/usage-time.cjs';import{isRestDay,isLowUseDay}from'../lib/skhappiness/activity-pattern.mjs';

const source=JSON.parse(gunzipSync(fs.readFileSync('share-report/data.json.gz'))),sourceSeed=JSON.parse(fs.readFileSync('share-report/usage-seed.json'));
const names='박정순 윤경자 박성호 정영수 김영희 이정자 최영수 강순자 조명희 장성수 한영자 임정숙 오정호 서순희 신영호 권명숙 황정남 안순애 송영식 유경희 홍정식 전명자 고영철 문정희 양성진 손경숙 배영자 백성일 허정임 남기수 심순옥 노영수 하정자 곽영호 성경자 차정호'.split(' ');
const end='2026-11-10',version='internal-v1',directory='internal-report';fs.mkdirSync(directory,{recursive:true});
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const shiftDate=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const seed={revision:'internal-usage-v1',baseVersion:version,startDate:'2026-11-11',scheduleSeed:'internal-pattern-v1',people:[]};
const meta={...source.meta,dataVersion:version,demoPeriod:{start:'2026-05-17',end},profileCount:36};delete meta.activityPatterns;delete meta.openProfileTargetsHours;delete meta.sharedUsage;
const summaries=[];
for(let i=0;i<36;i++){
 const original=source.patients[i%4],id='INT'+String(i+1).padStart(3,'0'),patternId=original.id,dayOffset=i<4?0:hash(id)%7;
 const normalOpenHours=[7.9,13.15,14.6,10.7][i%4]+(i<4?0:((hash(id+'open')%141)-70)/100);
 const config={...structuredClone(sourceSeed.people[i%4]),id,patternId,dayOffset,normalOpenHours};
 config.speechPerDay=43+hash(id+'speech')%24;config.sentPerDay=7+hash(id+'sent')%14;config.receivedPerDay=9+hash(id+'received')%16;config.callPerDay=10+hash(id+'call')%5;
 seed.people.push(config);
 const p=structuredClone(original),start=i<4?original.periodStart:shiftDate('2026-08-01',hash(id+'start')%31);
 Object.assign(p,{id,name:names[i]+'(가명)',shortName:names[i]+'(가명)',periodStart:start,periodEnd:end,detailLoaded:true});p.usageStats.userCode=id;p.usageStats.userName=names[i];
 const groups=[original.speaks,original.sessions,original.featureTelemetry.youtube.sessions,original.featureTelemetry.iot.events,original.featureTelemetry.messaging.events,original.featureTelemetry.caregiverCalls.events,original.featureTelemetry.activity.events];
 const indexed=groups.map(rows=>{const m=new Map();for(const r of rows){if(!m.has(r.date))m.set(r.date,[]);m.get(r.date).push(r);}return m;});
 const output=groups.map(()=>[]),daily=[],activityDays={};
 const short=original.daily.filter(d=>d.sessionSeconds>0&&d.appOpenSeconds<6*3600),normal=original.daily.filter(d=>d.appOpenSeconds>=6*3600);
 for(let date=start;date<=end;date=shiftDate(date,1)){
  const patternDate=shiftDate(date,-dayOffset),rest=isRestDay(patternId,patternDate),low=isLowUseDay(patternId,patternDate);
  const candidates=low?short:normal,from=candidates[hash(id+'/'+date)%candidates.length],delta=(Date.parse(date+'T00:00:00Z')-Date.parse(from.date+'T00:00:00Z'))/1000;
  function remap(value,key=''){
   if(typeof value==='string'){const mapped=value.replaceAll(patternId,id).replaceAll(from.date,date);return ['id','sessionId'].includes(key)?`${id}-${date}-${mapped}`:mapped;}
   if(typeof value==='number'&&key==='seconds')return value+delta;
   if(Array.isArray(value))return value.map(v=>remap(v));
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,k)]));return value;
  }
  const d=remap(from);d.date=date;
  if(rest){for(const[k,v]of Object.entries(d))if(typeof v==='number')d[k]=0;d.dailyExpressionShare=null;}
  else for(let g=0;g<groups.length;g++)output[g].push(...(indexed[g].get(from.date)||[]).map(r=>remap(r)));
  daily.push(d);activityDays[date]={openIntervals:[],isSynthetic:true,sourceType:'synthetic'};
 }
 [p.speaks,p.sessions,p.featureTelemetry.youtube.sessions,p.featureTelemetry.iot.events,p.featureTelemetry.messaging.events,p.featureTelemetry.caregiverCalls.events,p.featureTelemetry.activity.events]=output;
 p.daily=daily;p.featureTelemetry.activity.days=activityDays;
 p.featureTelemetry.messaging.contacts=JSON.parse(JSON.stringify(p.featureTelemetry.messaging.contacts).replaceAll(patternId,id));
 for(const d of daily.filter(d=>d.sessionSeconds>0)){
  const plan=usage.planUsageDay(id,d.date,usage.inputTimes(p,d.date),{shortDay:d.appOpenSeconds<6*3600,normalOpenHours});activityDays[d.date].openIntervals=plan.openIntervals;
  for(let j=0;j<plan.extraActions.length;j++)p.featureTelemetry.activity.events.push({id:`${id}-${d.date}-extra-${j}`,date:d.date,timestamp:{seconds:plan.extraActions[j],nanoseconds:0},action:'app_interaction',isSynthetic:true,sourceType:'synthetic'});
 }
 const s=p.usageStats;for(const k of Object.keys(s))if(typeof s[k]==='number'&&daily.some(d=>typeof d[k]==='number'))s[k]=daily.reduce((n,d)=>n+(d[k]||0),0);
 s.totalSessionSeconds=daily.reduce((n,d)=>n+d.sessionSeconds,0);p.activeDays=daily.filter(d=>d.sessionSeconds>0).length;s.callAverageDays=p.activeDays;s.speakAverageDays=p.activeDays;s.callDailyAverage=s.callCount/p.activeDays;s.dailyExpressionShare=s.dailyExpressionCount/s.speakCount;s.messageContactCount=new Set(p.featureTelemetry.messaging.events.map(e=>e.counterpartyId)).size;
 const complete=p.speaks.filter(e=>e.errorClass!=='incomplete');Object.assign(p.errorStats,{residualTypoUtteranceRate:complete.filter(e=>e.hasResidualTypo).length/complete.length,characterErrorRate:complete.reduce((n,e)=>n+e.editDistance,0)/complete.reduce((n,e)=>n+e.intendedCharacterCount,0),incompleteUtteranceRate:(p.speaks.length-complete.length)/p.speaks.length,correctedUtterances:p.speaks.filter(e=>e.hadCorrection).length});
 usage.refreshUsageTimes({patients:[p]},Date.parse(end+'T23:59:59+09:00')/1000);
 fs.writeFileSync(`${directory}/${id}.json.gz`,gzipSync(JSON.stringify(p),{mtime:0}));
 summaries.push({...p,detailLoaded:false,daily:[],speaks:[],sessions:[],featureTelemetry:{}});
}
fs.writeFileSync(directory+'/manifest.json',JSON.stringify({meta,patients:summaries}));fs.writeFileSync(directory+'/usage-seed.json',JSON.stringify(seed));

let index=fs.readFileSync('share-report/index.html','utf8');index=index.replace(/<span class="brand-divider"[^>]*><\/span><span class="partner-logo">.*?<\/span>/,'').replaceAll('?v=19','?v=internal1');fs.writeFileSync(directory+'/index.html',index);
let app=fs.readFileSync('share-report/app.js','utf8');
app=app.replace('return p.speaks.length+p.featureTelemetry.messaging.events.filter(r=>r.direction===\'sent\').length;','return p.detailLoaded?p.speaks.length+p.featureTelemetry.messaging.events.filter(r=>r.direction===\'sent\').length:p.usageStats.totalUtteranceCount;');
app=app.replace("person=data.patients.find(p=>p.id===el.dataset.person);page=0;", "if(!data.patients.find(p=>p.id===el.dataset.person)?.detailLoaded){location.hash=el.dataset.person+'/'+view;location.reload();return;}person=data.patients.find(p=>p.id===el.dataset.person);page=0;");
app=app.replace("readHash();page=0;renderPeople();render();", "readHash();if(!person.detailLoaded){location.reload();return;}page=0;renderPeople();render();");
app=app.replace("fetch(REPORT_BASE+'/data.json',", "fetch(REPORT_BASE+'/data.json?person='+encodeURIComponent(location.hash.slice(1).split('/')[0]||'INT001'),");
fs.writeFileSync(directory+'/app.js',app);
let ui=fs.readFileSync('share-report/shared-usage-ui.js','utf8');ui=ui.replace("const engine=createRecordReplay(data),storageKey='morspeak-shared-summary-v7';", "const selected=data.patients.find(p=>p.detailLoaded),engine=createRecordReplay({meta:data.meta,patients:[selected]}),storageKey='morspeak-internal-v1-'+selected.id;");ui=ui.replaceAll('shared-usage-v7','internal-usage-v1').replace("'/usage?after='+encodeURIComponent(cursor)","'/usage?person='+selected.id+'&after='+encodeURIComponent(cursor)");
// The shared helper updates all detailed profiles only; unloaded summaries stay intact.
ui=ui.replace('refreshUsageTimes(data,','refreshUsageTimes({patients:[selected]},');
fs.writeFileSync(directory+'/shared-usage-ui.js',ui);
console.log(JSON.stringify({profiles:summaries.length,version,compressedBytes:fs.readdirSync(directory).filter(f=>f.endsWith('.gz')).reduce((n,f)=>n+fs.statSync(directory+'/'+f).size,0),averages:summaries.map(p=>({id:p.id,utterances:p.usageStats.totalUtteranceCount,openHours:+(p.usageStats.appOpenDailyAverageSeconds/3600).toFixed(2)}))},null,2));
