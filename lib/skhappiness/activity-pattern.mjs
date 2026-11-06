export const ACTIVITY_PATTERNS={SYN001:{weekday:3,everyOtherWeek:false},SYN002:{weekday:0,everyOtherWeek:false},SYN003:{weekday:3,everyOtherWeek:true},SYN004:{weekday:2,everyOtherWeek:false}};
export function isRestDay(personId,date){
 const rule=ACTIVITY_PATTERNS[personId],day=Date.parse(date+'T00:00:00Z');if(!rule)return false;
 return new Date(day).getUTCDay()===rule.weekday&&(!rule.everyOtherWeek||Math.floor((day-Date.parse('2026-08-01T00:00:00Z'))/604800000)%2===0);
}
