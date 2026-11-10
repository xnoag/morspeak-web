export const ACTIVITY_PATTERNS={SYN001:{weekday:3,everyOtherWeek:false},SYN002:{weekday:0,everyOtherWeek:false},SYN003:{weekday:3,everyOtherWeek:true},SYN004:{weekday:2,everyOtherWeek:false}};
const weekIndex=date=>Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse('2026-08-01T00:00:00Z'))/604800000);
export function isLowUseDay(personId,date){const rule=ACTIVITY_PATTERNS[personId];return !!rule&&new Date(date+'T00:00:00Z').getUTCDay()===rule.weekday&&(!rule.everyOtherWeek||weekIndex(date)%2===0);}
export function isRestDay(personId,date){if(!isLowUseDay(personId,date))return false;const occurrence=weekIndex(date)/(ACTIVITY_PATTERNS[personId].everyOtherWeek?2:1);return ((occurrence%4)+4)%4===3;}
