import {buildUsageDay,readUsageFeed} from '../skhappiness/shared-usage.mjs';

// Each profile has an independent deterministic stream; the operational DB is
// never read or written. IDs and dates stay within this report's namespace.
export function buildInternalUsageDay(seed,date){
 const events=[];
 for(const p of seed.people){
  const offset=p.dayOffset||0,sourceDate=new Date(Date.parse(date+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10);
  const person={...p,id:p.patternId};
  const rows=buildUsageDay({...seed,scheduleSeed:seed.scheduleSeed+'/'+p.id,people:[person]},sourceDate);
  function remap(value,key=''){
   if(typeof value==='string')return value.replaceAll(p.patternId,p.id).replaceAll(sourceDate,date);
   if(typeof value==='number'&&['timestamp','sessionStart','begin','end','seconds'].includes(key))return value+offset*86400;
   if(Array.isArray(value))return value.map(v=>key==='openIntervals'?v.map(t=>t+offset*86400):remap(v,key));
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,k)]));
   return value;
  }
  events.push(...rows.map(e=>remap(e)));
 }
 return events.sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id));
}
export function readInternalUsageFeed(seed,options){return readUsageFeed(seed,{...options,buildDay:buildInternalUsageDay});}
