'use strict';
const ACTIVITY_WINDOW_SECONDS=420;
function unionIntervals(intervals){const result=[];for(const [start,end]of intervals.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){const last=result.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else result.push([start,end]);}return result;}
function intervalSeconds(intervals){return intervals.reduce((n,[a,b])=>n+b-a,0);}
function inputTimes(person,date){const telemetry=person.featureTelemetry;return [...person.speaks,...telemetry.iot.events,...telemetry.caregiverCalls.events,...telemetry.messaging.events.filter(e=>e.direction==='sent'),...(telemetry.activity?.events||[])].filter(e=>e.date===date).map(e=>e.timestamp.seconds).concat(telemetry.youtube.sessions.filter(e=>e.date===date).map(e=>e.start.seconds));}
function actionIntervals(times,zero,end=zero+86400){return unionIntervals(times.filter(t=>t<=end).map(t=>[Math.max(zero,t-ACTIVITY_WINDOW_SECONDS),Math.min(end,t+ACTIVITY_WINDOW_SECONDS)]));}
function planUsageDay(personId,date,times){
 const zero=Date.parse(date+'T00:00:00+09:00')/1000;let hash=2166136261;for(const c of personId+'/'+date)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;hash=Math.imul(hash^(hash>>>16),2246822507)>>>0;hash=(hash^(hash>>>13))>>>0;
 const targetActive=(5.05+(hash%56)/100)*3600,targetOpen=(12.05+((hash>>>5)%91)/100)*3600,extra=[];let active=actionIntervals(times,zero);
 for(let i=0;intervalSeconds(active)<targetActive&&i<100;i++){
  const remaining=targetActive-intervalSeconds(active),choices=active.map(([a,b],index)=>({index,end:b,gap:Math.max(0,Math.min(active[index+1]?.[0]??zero+22*3600,zero+22*3600)-b)})).filter(x=>x.gap>1);
  if(!choices.length)break;const choice=choices[(hash+i*7)%choices.length],extension=Math.min(840,remaining,choice.gap),time=Math.floor(choice.end-420+extension);
  extra.push(time);active=actionIntervals([...times,...extra],zero);
 }
 let low=0,high=43200;for(let i=0;i<32;i++){const middle=(low+high)/2,expanded=unionIntervals(active.map(([a,b])=>[Math.max(zero,a-middle),Math.min(zero+86400,b+middle)]));if(intervalSeconds(expanded)<Math.max(targetOpen,intervalSeconds(active)))low=middle;else high=middle;}
 const openIntervals=unionIntervals(active.map(([a,b])=>[Math.max(zero,Math.floor(a-high)),Math.min(zero+86400,Math.ceil(b+high))]));return {extraActions:extra,openIntervals};
}
function refreshUsageTimes(dataset,nowSeconds){
 for(const p of dataset.patients){const days=p.featureTelemetry.activity?.days||{};for(const d of p.daily){const zero=Date.parse(d.date+'T00:00:00+09:00')/1000,end=Math.min(nowSeconds,zero+86400),open=unionIntervals((days[d.date]?.openIntervals||[]).map(([a,b])=>[a,Math.min(b,end)]));const windows=actionIntervals(inputTimes(p,d.date),zero,end);const clipped=[];for(const [a,b]of windows)for(const [x,y]of open)if(Math.min(b,y)>Math.max(a,x))clipped.push([Math.max(a,x),Math.min(b,y)]);d.appOpenSeconds=intervalSeconds(open);d.activeUseSeconds=intervalSeconds(unionIntervals(clipped));d.spokenCount=d.speakCount;d.totalUtteranceCount=d.speakCount+d.messageSentCount;}
 const s=p.usageStats,usedDays=p.daily.filter(d=>d.sessionSeconds>0).length;s.appOpenSeconds=p.daily.reduce((n,d)=>n+d.appOpenSeconds,0);s.activeUseSeconds=p.daily.reduce((n,d)=>n+d.activeUseSeconds,0);s.appOpenDailyAverageSeconds=s.appOpenSeconds/usedDays;s.activeDailyAverageSeconds=s.activeUseSeconds/usedDays;
 s.spokenCount=p.speaks.length;s.totalUtteranceCount=p.speaks.length+p.featureTelemetry.messaging.events.filter(e=>e.direction==='sent').length;s.dailySpeakAverage=s.totalUtteranceCount/usedDays;
 }
}
if(typeof module!=='undefined')module.exports={ACTIVITY_WINDOW_SECONDS,unionIntervals,intervalSeconds,inputTimes,actionIntervals,planUsageDay,refreshUsageTimes};
