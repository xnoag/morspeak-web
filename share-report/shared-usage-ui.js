'use strict';
async function setupSharedUsage(){
 for(const old of ['morspeak-record-playback-v1','morspeak-shared-usage-v1']){try{localStorage.removeItem(old);}catch{}}
 const engine=createRecordReplay(data),storageKey='morspeak-shared-summary-v2';let cursor='',pending=0,busy=false,checkedAt='',ready=false;
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({...engine.snapshot(),cursor,revision:'shared-usage-v2'}));}catch{}};
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.revision==='shared-usage-v2'&&saved.baseVersion===data.meta.dataVersion){engine.restore(saved);cursor=saved.cursor||'';}}catch{/* Fetch a full server snapshot when cache is unavailable. */}
 function status(message){$('#replay-state').textContent=message||'자동 업데이트';$('#replay-latest').textContent=checkedAt?'확인 '+new Date(checkedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'';$('#replay-pending').hidden=!pending;$('#replay-pending').textContent=`새 기록 ${num(pending)}건 보기`;$('#report-period').textContent=periodLabel();}
 function refresh(force=false){const scroller=$('#content-scroll'),focused=document.activeElement;if(!force&&(scroller.scrollTop>64||page>0||$('#content').contains(focused)&&focused.matches('input,select,textarea'))){status();return;}const scroll=scroller.scrollTop;render();scroller.scrollTop=force?0:scroll;pending=0;status();}
 async function sync(){if(busy)return;busy=true;$('#usage-refresh').disabled=true;let changed=0;try{
  for(let batch=0;batch<200;batch++){
   const response=await fetch(REPORT_BASE+'/usage?after='+encodeURIComponent(cursor),{cache:'no-store'});if(response.status===401){location.reload();return;}if(!response.ok)throw Error('Unavailable');const feed=await response.json();
   if(feed.revision!=='shared-usage-v2'||feed.baseVersion!==data.meta.dataVersion)throw Error('Version mismatch');
   for(const event of feed.events)if(engine.apply(event)){if(event.kind!=='session')changed++;}
   cursor=feed.cursor;checkedAt=feed.serverTime;engine.prepare(Math.floor(Date.parse(feed.serverTime)/1000));if(!feed.hasMore)break;
   if(batch===199)throw Error('Feed backlog');
  }
  persist();if(ready){for(const p of data.patients){const row=document.querySelector(`[data-person="${p.id}"] .person-total`);if(row)row.textContent=num(p.usageStats.speakCount)+'회';}pending+=changed;refresh();}status();
 }catch{status('업데이트 재시도 중');}finally{busy=false;$('#usage-refresh').disabled=false;}}
 $('#usage-refresh').addEventListener('click',sync);$('#replay-pending').addEventListener('click',()=>{page=0;refresh(true);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});document.addEventListener('click',event=>{if(event.target.closest('[data-view],[data-person]')){pending=0;status();}});
 $('#content').setAttribute('aria-live','off');await sync();ready=true;setInterval(()=>{if(!document.hidden)sync();},15000);return {sync};
}
