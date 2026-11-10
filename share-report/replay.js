'use strict';
// Report aggregation. Shared events never write to the operational database.
function createRecordReplay(dataset){
 const base=JSON.parse(JSON.stringify(dataset)),log=[],seen=new Set(),errorTotals=new Map();
 let cursor=0;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const dateOf=seconds=>new Date((seconds+9*3600)*1000).toISOString().slice(0,10);
 function initializeErrors(){errorTotals.clear();for(const p of dataset.patients){const complete=p.speaks.filter(e=>e.errorClass!=='incomplete');errorTotals.set(p.id,{complete:complete.length,typos:complete.filter(e=>e.hasResidualTypo??(e.text!==e.intendedText)).length,edits:complete.reduce((n,e)=>n+e.editDistance,0),characters:complete.reduce((n,e)=>n+(e.intendedCharacterCount??e.intendedText?.length??0),0),incomplete:p.speaks.length-complete.length,corrected:p.speaks.filter(e=>e.hadCorrection).length});}}
 initializeErrors();
 function blankDay(p,date){const d={};for(const [k,v] of Object.entries(p.daily[0]))d[k]=typeof v==='number'?0:typeof v==='boolean'?false:v===null?null:v;d.date=date;d.dailyExpressionShare=null;d.isSynthetic=true;d.sourceType='synthetic';return d;}
 function prepare(seconds){const target=dateOf(seconds);for(const p of dataset.patients){let current=p.daily.at(-1).date;let count=0;while(current<target&&count++<370){current=new Date(Date.parse(current+'T00:00:00Z')+86400000).toISOString().slice(0,10);p.daily.push(blankDay(p,current));}if(current===target)p.periodEnd=target;}if(target>dataset.meta.demoPeriod.end)dataset.meta.demoPeriod.end=target;}
 function daily(p,date){return p.daily.find(d=>d.date===date);}
 function sessionFor(p,d,event){const id=event.sessionId||`PLAY-SESSION-${event.date}-${p.id}`;let s=p.sessions.find(s=>s.id===id);if(!s){s={id,date:event.date,start:{seconds:(event.sessionStart??event.timestamp-61),nanoseconds:0},end:{seconds:(event.sessionStart??event.timestamp-61),nanoseconds:0},duration:0,isSynthetic:true,sourceType:'synthetic',recordOrigin:event.recordOrigin};p.sessions.push(s);}const end=Math.max(s.end.seconds,event.timestamp+1),delta=end-s.end.seconds;s.end.seconds=end;s.duration+=delta;d.sessionSeconds+=delta;d.modeSeconds_function+=delta;p.usageStats.totalSessionSeconds+=delta;return s;}
 function assignMode(d,key,seconds){const n=Math.min(d.modeSeconds_function,Math.max(0,seconds));d.modeSeconds_function-=n;d[key]=(d[key]||0)+n;}
 function updateAverages(p){const s=p.usageStats;p.activeDays=p.daily.filter(d=>d.sessionSeconds>0).length;s.spokenCount=s.speakCount;s.totalUtteranceCount=s.speakCount+s.messageSentCount;s.dailySpeakAverage=s.totalUtteranceCount/p.activeDays;s.speakAverageDays=p.activeDays;s.callDailyAverage=s.callCount/p.activeDays;s.callAverageDays=p.activeDays;s.dailyExpressionShare=s.dailyExpressionCount/s.speakCount;}
 function apply(event){
  if(!event||seen.has(event.id)||!['playback','generated-usage'].includes(event.recordOrigin))return false;
  const p=dataset.patients.find(p=>p.id===event.personId);if(!p)return false;prepare(event.timestamp);const d=daily(p,event.date);if(!d)return false;
  const s=p.usageStats,r=clone(event.payload);if(!['activity','availability'].includes(event.kind))sessionFor(p,d,event);
  if(event.kind==='availability'){p.featureTelemetry.activity??={events:[],days:{}};p.featureTelemetry.activity.days[event.date]={openIntervals:r.openIntervals,isSynthetic:true,sourceType:'synthetic'};}
  else if(event.kind==='activity'){p.featureTelemetry.activity??={events:[],days:{}};p.featureTelemetry.activity.events.push(r);}
  else if(event.kind==='speech'){
   p.speaks.push(r);d.speakCount++;s.speakCount++;
   for(const [target,key] of [['keyboardInputTotal','keyboardCount'],['aiInputTotal','aiCount'],['shortcutInputTotal','shortcutCount']]){d[target]+=r[key];s[target]+=r[key];}
   for(const [target,key] of [['keyboardSpeaks','keyboardCount'],['aiSpeaks','aiCount'],['shortcutSpeaks','shortcutCount']])d[target]+=Number(r[key]>0);
   const key={dailyLife:'dailyExpressionCount',basicCare:'basicCareExpressionCount',unclear:'unclearExpressionCount'}[r.communicationClass];d[key]++;s[key]++;d.dailyExpressionShare=d.dailyExpressionCount/d.speakCount;
   const totals=errorTotals.get(p.id);if(r.errorClass==='incomplete')totals.incomplete++;else{totals.complete++;totals.typos+=Number(r.hasResidualTypo??(r.text!==r.intendedText));totals.edits+=r.editDistance;totals.characters+=(r.intendedCharacterCount??r.intendedText?.length??0);}totals.corrected+=Number(r.hadCorrection);
   Object.assign(p.errorStats,{residualTypoUtteranceRate:totals.typos/totals.complete,characterErrorRate:totals.edits/totals.characters,incompleteUtteranceRate:totals.incomplete/p.speaks.length,correctedUtterances:totals.corrected});assignMode(d,r.shortcutCount?'modeSeconds_shortcut':'modeSeconds_keyboard',12);
  }else if(event.kind==='call'){p.featureTelemetry.caregiverCalls.events.push(r);d.callCount++;s.callCount++;}
  else if(event.kind==='message_sent'||event.kind==='message_received'){
   p.featureTelemetry.messaging.events.push(r);const key=event.kind==='message_sent'?'messageSentCount':'messageReceivedCount';d[key]++;s[key]++;
   d.messageContactCount=new Set(p.featureTelemetry.messaging.events.filter(e=>e.date===event.date).map(e=>e.counterpartyId)).size;s.messageContactCount=new Set(p.featureTelemetry.messaging.events.map(e=>e.counterpartyId)).size;if(event.kind==='message_sent')assignMode(d,'modeSeconds_keyboard',12);
  }else if(event.kind==='iot'){p.featureTelemetry.iot.events.push(r);d.iotCount++;s.iotCount++;const device=p.featureTelemetry.iot.devices.find(x=>x.id===r.deviceId);d[device.countField]++;s[device.countField]++;}
  else if(event.kind==='youtube'){
   let video=p.featureTelemetry.youtube.sessions.find(v=>v.id===r.id);if(!video){video={id:r.id,date:r.date,sessionId:r.sessionId,start:{seconds:r.begin,nanoseconds:0},end:{seconds:r.begin,nanoseconds:0},watchSeconds:0,pausedSeconds:0,browseSeconds:0,isSynthetic:true,sourceType:'synthetic',recordOrigin:event.recordOrigin};p.featureTelemetry.youtube.sessions.push(video);d.youtubeSelectCount++;s.youtubeSelectCount++;}
   const interval=r.end-r.begin;video.end.seconds=r.end;video.watchSeconds+=r.watchSeconds;video.pausedSeconds+=r.pausedSeconds;d.youtubeWatchSeconds+=r.watchSeconds;s.youtubeWatchSeconds+=r.watchSeconds;assignMode(d,'modeSeconds_youtubePlay',interval);s.modeSeconds_youtubePlay+=interval;
  }
  d.spokenCount=d.speakCount;d.totalUtteranceCount=d.speakCount+d.messageSentCount;s.lastUpdated={seconds:event.timestamp,nanoseconds:0};updateAverages(p);seen.add(event.id);log.push(clone(event));cursor=Math.max(cursor,Number(event.id.split('-').at(-1))+1);
  dataset.meta.sharedUsage={mode:'server-clock',isSynthetic:true,recordOrigin:event.recordOrigin,recordCount:log.length,lastRecordAt:event.timestamp};return true;
 }
 function reset(){for(const key of Object.keys(dataset))delete dataset[key];Object.assign(dataset,clone(base));log.length=0;seen.clear();cursor=0;initializeErrors();}
 function restore(state){if(state?.baseVersion!==base.meta.dataVersion||!Array.isArray(state.events))return;for(const event of state.events){if(event.personId&&event.timestamp&&event.date===dateOf(event.timestamp)&&event.isSynthetic&&event.sourceType==='synthetic')apply(event);}}
 function snapshot(){return {baseVersion:base.meta.dataVersion,events:clone(log)};}
 return {apply,reset,restore,snapshot,prepare,events:()=>clone(log),baseVersion:base.meta.dataVersion};
}
