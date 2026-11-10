import fs from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';import vm from 'node:vm';
import {buildUsageDay} from '../lib/skhappiness/shared-usage.mjs';import {isRestDay} from '../lib/skhappiness/activity-pattern.mjs';
const file='share-report/data.json.gz',data=JSON.parse(gunzipSync(fs.readFileSync(file))),seed=JSON.parse(fs.readFileSync('share-report/usage-seed.json')),p=data.patients.find(p=>p.id==='SYN004');
if(p.periodStart!=='2026-08-01')throw Error('History already extended or unexpected start date');
const sample=p.daily[0],added=[];for(let day=Date.parse('2026-05-17T00:00:00Z');day<Date.parse('2026-08-01T00:00:00Z');day+=86400000){const row=Object.fromEntries(Object.entries(sample).map(([k,v])=>[k,typeof v==='number'?0:typeof v==='boolean'?false:v]));row.date=new Date(day).toISOString().slice(0,10);row.dailyExpressionShare=null;row.isSynthetic=true;row.sourceType='synthetic';added.push(row);}
p.daily.unshift(...added);p.periodStart='2026-05-17';data.meta.demoPeriod.start='2026-05-17';
const create=vm.runInNewContext(fs.readFileSync('share-report/replay.js','utf8')+';createRecordReplay;'),engine=create(data);
for(const day of added)if(!isRestDay(p.id,day.date))for(const event of buildUsageDay(seed,day.date))if(event.personId===p.id)engine.apply(event);
p.speaks.sort((a,b)=>a.timestamp.seconds-b.timestamp.seconds);p.sessions.sort((a,b)=>a.start.seconds-b.start.seconds);p.usageStats.lastUpdated={seconds:Math.max(...p.sessions.map(s=>s.end.seconds)),nanoseconds:0};delete data.meta.sharedUsage;
fs.writeFileSync(file,gzipSync(JSON.stringify(data),{mtime:0}));console.log({person:p.name,start:p.periodStart,days:p.daily.length,usedDays:p.activeDays,spoken:p.usageStats.speakCount,sent:p.usageStats.messageSentCount,average:p.usageStats.dailySpeakAverage});
