'use strict';
// Missing telemetry stays null. An observed empty event list means zero events.
function featureSummary(p,selectedDate='all'){
 const days=p.daily.filter(d=>selectedDate==='all'||d.date===selectedDate);
 const telemetry=p.featureTelemetry||{};
 const eventsIn=events=>Array.isArray(events)?events.filter(e=>selectedDate==='all'||e.date===selectedDate):null;
 const sumField=key=>days.length&&days.every(d=>Number.isFinite(d[key]))?days.reduce((n,d)=>n+d[key],0):null;
 const videos=eventsIn(telemetry.youtube?.sessions);
 const iotEvents=eventsIn(telemetry.iot?.events);
 const messages=eventsIn(telemetry.messaging?.events);
 const calls=eventsIn(telemetry.caregiverCalls?.events);
 const callCount=calls?calls.length:sumField('callCount');
 const appUsedDays=days.filter(d=>d.sessionSeconds>0).length;
 const countDays=(events,key)=>events?new Set(events.map(e=>e.date)).size:days.every(d=>Number.isFinite(d[key]))?days.filter(d=>d[key]>0).length:null;
 const devices=(telemetry.iot?.devices||[]).map(device=>{
  const rows=iotEvents?.filter(e=>e.deviceId===device.id);
  const count=rows?rows.length:sumField(device.countField);
  return {...device,count,successCount:rows?rows.filter(e=>e.success===true).length:null,failedCount:rows?rows.filter(e=>e.success===false).length:null};
 });
 const sent=messages?messages.filter(e=>e.direction==='sent').length:sumField('messageSentCount');
 const received=messages?messages.filter(e=>e.direction==='received').length:sumField('messageReceivedCount');
 const contacts=messages&&messages.every(e=>typeof e.counterpartyId==='string'&&e.counterpartyId.length)?[...new Set(messages.map(e=>e.counterpartyId))].map(id=>{
  const rows=messages.filter(e=>e.counterpartyId===id);
  const label=(telemetry.messaging.contacts||[]).find(c=>c.id===id)?.label||'대화 상대';
  return {id,label,sent:rows.filter(e=>e.direction==='sent').length,received:rows.filter(e=>e.direction==='received').length};
 }).sort((a,b)=>b.sent+b.received-a.sent-a.received):null;
 const successCount=iotEvents?iotEvents.filter(e=>e.success===true).length:null;
 const failedCount=iotEvents?iotEvents.filter(e=>e.success===false).length:null;
 return {
  dayCount:days.length,appUsedDays,
  caregiverCalls:{count:callCount,dailyAverage:callCount===null||!appUsedDays?null:callCount/appUsedDays,averageDays:appUsedDays,usedDays:countDays(calls,'callCount')},
  youtube:{watchSeconds:videos?videos.reduce((n,e)=>n+e.watchSeconds,0):sumField('youtubeWatchSeconds'),playModeSeconds:sumField('modeSeconds_youtubePlay'),browseModeSeconds:sumField('modeSeconds_youtubeSurf'),selectionCount:sumField('youtubeSelectCount'),usedDays:countDays(videos,'youtubeWatchSeconds'),sessionCount:videos?.length??null},
  iot:{devices,installedCount:devices.length,usedDeviceCount:devices.every(d=>d.count!==null)?devices.filter(d=>d.count>0).length:null,totalCount:iotEvents?iotEvents.length:sumField('iotCount'),usedDays:countDays(iotEvents,'iotCount'),successCount,failedCount,unconfirmedCount:iotEvents?iotEvents.length-successCount-failedCount:null,successRate:successCount+failedCount>0?successCount/(successCount+failedCount):null},
  messaging:{sent,received,contactCount:contacts?.length??null,twoWayContactCount:contacts?contacts.filter(c=>c.sent>0&&c.received>0).length:null,contacts,usedDays:messages?countDays(messages):null,sentDays:messages?new Set(messages.filter(e=>e.direction==='sent').map(e=>e.date)).size:days.every(d=>Number.isFinite(d.messageSentCount))?days.filter(d=>d.messageSentCount>0).length:null}
 };
}
