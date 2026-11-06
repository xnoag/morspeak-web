const DAY=86400,OFFSET=9*3600;
export const dateOf=seconds=>new Date((seconds+OFFSET)*1000).toISOString().slice(0,10);
const dayStart=date=>Date.parse(date+'T00:00:00+09:00')/1000;
const addDay=date=>new Date(Date.parse(date+'T00:00:00Z')+DAY*1000).toISOString().slice(0,10);
function randomFor(seed){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
const pick=(items,r)=>items[Math.floor(r()*items.length)];
function weighted(items,r){let n=r()*items.reduce((s,x)=>s+x.weight,0);for(const item of items){n-=item.weight;if(n<=0)return item;}return items.at(-1);}
function allocation(total,weights){const sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>total*w/sum),out=raw.map(Math.floor);const order=raw.map((v,i)=>[v-out[i],i]).sort((a,b)=>b[0]-a[0]);const remainder=total-out.reduce((a,b)=>a+b,0);for(let i=0;i<remainder;i++)out[order[i][1]]++;return out;}
export function buildUsageDay(seed,date){
 const events=[],zero=dayStart(date),flags={isSynthetic:true,sourceType:'synthetic',recordOrigin:'generated-usage'};
 const slots={SYN001:[[430,75],[620,60],[840,65],[1140,70]],SYN002:[[480,60],[690,65],[930,60],[1200,70]],SYN003:[[20,150],[570,60],[780,60],[1080,70]],SYN004:[[400,65],[600,60],[960,65],[1260,65]]};
 for(const p of seed.people){
  const r=randomFor(seed.revision+'/'+date+'/'+p.id);let serial=0;
  r(); // Keep the seeded sequence stable; each profile has daily app use.
  const sessions=slots[p.id].map(([minute,length],i)=>{const start=zero+(minute+Math.floor(r()*10))*60;return{id:`USE-${date}-${p.id}-S${i}`,start,end:start+(length+Math.floor(r()*12))*60,index:i};});
  const usedText=new Set(),occupied=[],speechTarget=Math.max(41,p.speechPerDay+Math.floor(r()*11)-5),callTarget=Math.max(7,p.callPerDay+Math.floor(r()*7)-3);
  const counts={speech:speechTarget,call:callTarget,message_sent:Math.max(1,p.sentPerDay+Math.floor(r()*7)-3),message_received:Math.max(1,p.receivedPerDay+Math.floor(r()*9)-4),iot:Math.max(1,p.iotPerDay+Math.floor(r()*5)-2)};
  const weights=sessions.map(s=>p.id==='SYN003'&&s.index===0?.35:(s.end-s.start)/3600);
  const watchTarget=Math.max(300,p.watchSecondsPerDay+Math.floor(r()*601)-300),watchSession=sessions[0],watchLength=Math.min(watchTarget,Math.floor((watchSession.end-watchSession.start)*.50));
  const watchStart=watchSession.start+300+Math.floor(r()*Math.max(1,watchSession.end-watchSession.start-watchLength-600)),watchEnd=watchStart+watchLength;
  function event(kind,session,timestamp,payload){const id=`USE-${date}-${p.id}-${String(serial++).padStart(4,'0')}`;events.push({id,personId:p.id,kind,date,timestamp,sessionId:session.id,sessionStart:session.start,payload:{id,date,timestamp:{seconds:timestamp,nanoseconds:0},sessionId:session.id,...payload,...flags},...flags});}
  for(const s of sessions){for(let t=s.start;t<s.end;t+=60)event('session',s,t,{});event('session',s,s.end-1,{});}
  const videoId=`USE-${date}-${p.id}-VIDEO`;let previous=watchStart;
  for(let end=Math.min(previous+60,watchEnd);previous<watchEnd;end=Math.min(previous+60,watchEnd)){
   const length=end-previous,watch=Math.floor(length*.94);event('youtube',watchSession,end,{id:videoId,begin:previous,end,watchSeconds:watch,pausedSeconds:length-watch,continuation:previous!==watchStart});previous=end;
  }
  for(const [kind,total] of Object.entries(counts)){
   const perSession=allocation(total-1,weights);perSession[0]++;
   for(let index=0;index<sessions.length;index++)for(let n=0;n<perSession[index];n++){
    const s=sessions[index];let stamp,placed=false;
    for(let trial=0;trial<10000;trial++){stamp=s.start+30+Math.floor(r()*(s.end-s.start-60));if(stamp>=watchStart&&stamp<=watchEnd)continue;if(occupied.some(t=>Math.abs(t-stamp)<22))continue;placed=true;break;}
    if(!placed)throw new Error("No available interaction slot");occupied.push(stamp);
    if(kind==='speech'){
     let options=p.templates.filter(t=>!usedText.has(t.templateKey));const text=pick(options,r);if(!text)continue;usedText.add(text.templateKey);const {templateKey,...metrics}=text;event(kind,s,stamp,metrics);
    }else if(kind==='message_sent'||kind==='message_received')event(kind,s,stamp,{direction:kind==='message_sent'?'sent':'received',counterpartyId:weighted(p.contacts,r).id});
    else if(kind==='iot')event(kind,s,stamp,{deviceId:weighted(p.devices.filter(d=>d.weight>0),r).id,action:'toggle',success:null});
    else event(kind,s,stamp,{});
   }
  }
 }
 return events.sort((a,b)=>a.timestamp-b.timestamp||(a.id<b.id?-1:a.id>b.id?1:0));
}
const cursorOf=e=>`${e.timestamp}:${e.id}`;
export function readUsageFeed(seed,{after='',now=Date.now(),limit=500,dayCache=new Map()}={}){
 const seconds=Math.floor(now/1000),today=dateOf(seconds),start=dayStart(seed.startDate);let since=start-1,lastId='';
 if(after){const split=after.indexOf(':');since=Number(after.slice(0,split));lastId=after.slice(split+1);if(split<0||!Number.isFinite(since)||since<start-1||since>seconds+60||lastId.length>160)throw new Error('Invalid cursor');}
 let date=after?dateOf(Math.max(start,since)):seed.startDate;const found=[];let nextEventAt=null;
 while(date<=today&&found.length<=limit){
  let events=dayCache.get(date);if(!events){events=buildUsageDay(seed,date);dayCache.set(date,events);if(dayCache.size>40)dayCache.delete(dayCache.keys().next().value);}
  for(const event of events){if(event.timestamp>seconds){nextEventAt??=event.timestamp;break;}if(event.timestamp>since||event.timestamp===since&&event.id>lastId)found.push(event);if(found.length>limit)break;}
  date=addDay(date);
 }
 const hasMore=found.length>limit,events=found.slice(0,limit);
 return {revision:seed.revision,baseVersion:seed.baseVersion,serverTime:new Date(now).toISOString(),startDate:seed.startDate,events,cursor:events.length?cursorOf(events.at(-1)):after,hasMore,nextEventAt,isSynthetic:true,sourceType:'synthetic',recordOrigin:'generated-usage'};
}
