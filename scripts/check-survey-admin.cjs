/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS에서 TS 소스와 브라우저 의존성을 격리해 검사한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let stateValues = [], stateIndex = 0, exportBuffer, previousRecord, lastWrite, allowDiscard = false;
let stateUpdates = [];
const firestoreStub = { Timestamp: { now: () => ({toDate: () => new Date()}) }, doc: (_db, _collection, id) => ({id}), serverTimestamp: () => 'SERVER_TIMESTAMP', runTransaction: async (_db, callback) => callback({ get: async ref => ref.id === 'pre' ? { exists: () => true, data: () => ({surveyType:'pre'}) } : { exists: () => !!previousRecord, data: () => previousRecord }, set: (_ref, data) => { lastWrite=data; } }) };
const anchor = { click() {} };
const documentStub = { createElement: () => anchor };
class BlobStub { constructor(parts) { exportBuffer = parts[0]; } }
const mockReact = { ...React, useState: initial => { const slot = stateIndex++; return [stateValues[slot] ?? initial, value => stateUpdates.push({slot,value})]; }, useEffect: () => {}, useLayoutEffect: () => {}, useMemo: fn => fn() };
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const localRequire = name => {
    if(name === 'react') return mockReact;
    if(name.endsWith('.module.css')) return new Proxy({}, { get: (_target, key) => String(key) });
    if(name === 'firebase/firestore') return firestoreStub;
    if(name === '@/lib/firebase') return { db: {} };
    if(name === '@/components/admin/AdminWorkspace') return { useAdminWorkspace: () => ({ active: false, path: path => path, setUnsaved() {} }) };
    if(name.startsWith('@/')) return load(path.join(root, name.slice(2)) + (name.includes('components/') ? '.tsx' : '.ts'));
    if(name.startsWith('./')) return load(path.resolve(path.dirname(file), name) + '.ts');
    return require(path.join(root, 'node_modules', name));
  };
  new Function('exports', 'require', 'Blob', 'URL', 'document', 'confirm', code)(exports, localRequire, BlobStub, { createObjectURL: () => 'blob:check', revokeObjectURL() {} }, documentStub, () => allowDiscard);
  return exports;
}
const schema = load(path.join(root, 'lib/survey-stages.ts'));
const original = load(path.join(root, 'lib/survey-questions.ts'));
assert.equal(schema.getStageQuestions('pre').length, 28);
assert.equal(schema.getStageQuestions('mid').length, 20);
assert.equal(schema.getStageQuestions('post').length, 20);
assert.equal(schema.getStageQuestions('post').map(q=>q.id).join(','), schema.getStageQuestions('mid').map(q=>q.id).join(','));
assert.equal(schema.getStageQuestions('post').slice(-5).map(q=>q.id).join(','), 'H-1,H-2,H-3,H-4,H-5');
for(const q of schema.getStageQuestions('mid')) assert.equal(q.options.map(o=>o.value).join(','), '0,1,2,3,4');
assert.equal(original.formatAnswerLabel(schema.getStageQuestions('post').find(q=>q.id==='H-1'), {'H-1':'4'}), '환자분의 의사를 파악하는 과정이 전반적으로 훨씬 수월해졌다');
const records = load(path.join(root, 'lib/survey-records.ts'));
assert.equal(records.interviewText({recordStatus:'example',interviewNotes:'가상 검토 시나리오: 기본 안내'}),'');
assert.equal(records.interviewText({recordStatus:'example',interviewNotes:'직접 입력한 메모'}),'직접 입력한 메모');
assert.equal(records.interviewText({recordStatus:'recorded',interviewNotes:'가상 검토 시나리오: 원문'}),'가상 검토 시나리오: 원문');
assert.equal(records.isRecorded({recordStatus:'example'}),false);
assert.equal(records.isRecorded({recordStatus:'draft'}),false);
assert.equal(records.isRecorded({recordStatus:'recorded'}),true);
assert.ok(records.validateFollowup({}, 'mid', '2026-08-01').includes('A-1'));
assert.ok(records.validateFollowup(records.positiveExample('mid'), 'mid', '2026-02-30'));
assert.equal(records.validateFollowup(records.positiveExample('mid'), 'mid', '2026-08-01'), '');
assert.ok(Object.values(records.legacyPositiveExample('mid')).every(v=>v==='3'));
const samplePeople=Array.from({length:19},(_,i)=>({id:`sample-${i}`,surveyType:'pre',answers:{}}));
for(const question of schema.getStageQuestions('mid')) {
  const mids=samplePeople.map(person=>Number(records.positiveExample('mid',person)[question.id]));
  const posts=samplePeople.map(person=>Number(records.positiveExample('post',person)[question.id]));
  assert.ok(new Set(mids).size>=2,`${question.id} 중간 선택지 다양성`);
  assert.ok(new Set(posts).size>=2,`${question.id} 사후 선택지 다양성`);
  assert.ok(mids.every((value,i)=>value<=posts[i]),`${question.id} 중간→사후 역행 없음`);
}
assert.equal(records.cleanFollowupAnswers({'A-1':'99', 'S-1':'사전 인터뷰'},'mid')['A-1'],undefined);
assert.equal(records.followupId('pre_person','mid'), 'mid_pre_person');
assert.equal(records.followupId('pre_person','mid',true), 'example_mid_pre_person');
const trends=load(path.join(root,'lib/survey-trends.ts'));
const distributions=load(path.join(root,'lib/survey-distribution.ts'));
const preB1=original.SURVEY_QUESTIONS.find(question=>question.id==='B1');
const preA2=original.SURVEY_QUESTIONS.find(question=>question.id==='A2');
let distribution=distributions.surveyDistribution(preB1,[{answers:{B1:'a'}},{answers:{B1:'d'}},{answers:{B1:'invalid'}}]);
assert.equal(distribution.answered,2);
assert.equal(distribution.total,3);
assert.equal(distribution.options.find(option=>option.value==='a').percent,50);
distribution=distributions.surveyDistribution(preA2,[{answers:{A2:['b','d']}},{answers:{A2:['b']}}]);
assert.equal(distribution.multiple,true);
assert.equal(distribution.options.find(option=>option.value==='b').percent,100);
assert.equal(distribution.options.find(option=>option.value==='d').percent,50);
const page = load(path.join(root, 'app/survey-admin/page.tsx')).default;
const fixture = ['pre','mid','post'].map((surveyType) => ({id:surveyType === 'pre' ? 'pre' : `${surveyType}_pre`, surveyType, surveyVersion: surveyType === 'pre' ? 'v1' : schema.FOLLOWUP_VERSION, recordStatus: 'recorded', sourceResponseId: surveyType === 'pre' ? undefined : 'pre', caregiverName:'검증 보호자 1', patientName:'검증 환자 1', caregiverContact:null, deviceType:'mobile', answers:Object.fromEntries(schema.getStageQuestions(surveyType).map(q=>[q.id,q.type==='multi'?['a']:surveyType === 'pre' ? 'd' : '3']))}));
const share=load(path.join(root,'lib/survey-share.ts'));
const shared=share.sharedSurveyRows([
  {...fixture[0],id:'raw-private-id',caregiverContact:'010-private',answers:{...fixture[0].answers,A4:'private-free-text'}},
  {...fixture[1],sourceResponseId:'raw-private-id',answers:{...fixture[1].answers,'A-1_comment':'private-comment'},interviewNotes:'private-interview'},
  {...fixture[2],sourceResponseId:'raw-private-id'},
]);
assert.equal(shared.length,3);
assert.equal(shared[0].id,'participant-01');
assert.equal(shared[1].sourceResponseId,'participant-01');
assert.ok(!['raw-private-id','010-private','private-free-text','private-comment','private-interview','검증 보호자'].some(value=>JSON.stringify(shared).includes(value)));
const q=schema.getStageQuestions('mid')[0];
const anonymousPage=load(path.join(root,'app/survey-share/page.tsx')).default;
const anonymousRows=fixture.map(row=>({...row,answers:{...row.answers}}));
anonymousRows[2].answers[q.id]='4';
stateValues=[anonymousRows,false,'',0];stateIndex=0;
let anonymousHtml=renderToStaticMarkup(React.createElement(anonymousPage));
assert.ok(anonymousHtml.includes('참여자 01') && anonymousHtml.includes('문항별 비율'));
assert.ok(anonymousHtml.includes('세 번 공통으로 살펴본 주제'));
assert.ok(anonymousHtml.includes('표현하는 내용을 대략적으로 파악할 수 있음'));
assert.ok(!anonymousHtml.includes('긍정 방향') && !anonymousHtml.includes('더 긍정적인 선택지') && !anonymousHtml.includes('점수 변화'));
assert.ok(!anonymousHtml.includes('>3</strong>') && !anonymousHtml.includes('>4</strong>'));
assert.ok(anonymousHtml.indexOf('① 사전') < anonymousHtml.indexOf('② 중간') && anonymousHtml.indexOf('② 중간') < anonymousHtml.indexOf('③ 사후'));
assert.ok(!anonymousHtml.includes('검증 환자 1') && !anonymousHtml.includes('검증 보호자 1'));
stateValues=[anonymousRows,false,'',0,'question','followup',0];stateIndex=0;
const ratioHtml=renderToStaticMarkup(React.createElement(anonymousPage));
assert.ok(ratioHtml.includes('문항별 비율') && ratioHtml.includes('응답 1명 / 대상 1명'));
assert.ok(ratioHtml.includes('100%') && ratioHtml.includes('사전 관련 문항') && ratioHtml.includes('중간 · 사후'));
assert.ok(!ratioHtml.includes('검증 환자 1') && !ratioHtml.includes('검증 보호자 1'));
stateValues=[anonymousRows,false,'',0,'question','pre',0];stateIndex=0;
const preRatioHtml=renderToStaticMarkup(React.createElement(anonymousPage));
assert.ok(preRatioHtml.includes('사전 객관식 27문항') && preRatioHtml.includes('A1'));
const participantTrend=load(path.join(root,'components/SurveyParticipantTrend.tsx')).default;
const participantHtml=renderToStaticMarkup(React.createElement(participantTrend,{source:fixture[0],rows:fixture,example:false,onExampleChange:()=>{}}));
assert.ok(!participantHtml.includes('더 긍정적인 선택지') && !participantHtml.includes('중간 → 사후') && !participantHtml.includes('3점 ·'));
anonymousRows[2].recordStatus='example';
stateValues=[anonymousRows,false,'',0];stateIndex=0;
anonymousHtml=renderToStaticMarkup(React.createElement(anonymousPage));
assert.ok(!anonymousHtml.includes('더 긍정적인 선택지'));
assert.equal(trends.relatedPreQuestions('A-1')[0].id,'B1');
assert.equal(trends.relatedPreQuestions('H-1')[0].id,'B1');
assert.equal(trends.relatedPreQuestions('D-2').map(q=>q.id).join(','),'B16,B5');
assert.equal(trends.COMMON_PRE.map(item=>item.id).join(','),'A-1,A-3,D-3');
assert.equal(trends.commonPreScore('A-1',fixture[0]),3);
assert.equal(trends.commonPreScore('A-3',{...fixture[0],answers:{...fixture[0].answers,B6:'a'}}),0);
assert.equal(trends.commonPreScore('D-3',{...fixture[0],answers:{...fixture[0].answers,B4:'e'}}),4);
assert.equal(trends.commonPreScore('A-2',fixture[0]),null);
for (const preValue of ['a', 'd', 'e']) {
  const source = {...fixture[0], answers:{...fixture[0].answers, B1:preValue, B6:preValue, B4:preValue}};
  const pre = trends.commonPreScore('A-1',source);
  const mid = records.positiveExample('mid',source);
  const post = records.positiveExample('post',source);
  for (const {id} of trends.COMMON_PRE) {
    assert.ok(trends.commonPreScore(id,source) <= Number(mid[id]));
    assert.ok(Number(mid[id]) <= Number(post[id]));
  }
  assert.equal(mid['A-1'],String(Math.max(3,pre)));
}
assert.equal(trends.trendFollowup(fixture,'another-person','mid'),undefined);
assert.equal(trends.trendFollowup(fixture,'pre','mid').id,'mid_pre');
fixture.push({...fixture[1],id:'example_mid_pre',recordStatus:'example',patientName:'가상 기록 제외 검사'});
fixture.push({...fixture[1],id:'draft_mid_pre',recordStatus:'draft',patientName:'미완성 기록 제외 검사'});
assert.equal(records.followupPayload(fixture[0],'mid',{},'','', 'draft').sourceResponseId,'pre');
assert.throws(()=>records.followupPayload(fixture[0],'mid',{},'','', 'recorded'));
assert.throws(()=>records.followupPayload(fixture[1],'mid',{},'','', 'draft'));
fixture[1].collectedOn='2026-08-20';fixture[2].collectedOn='2026-10-10';
fixture[2].answers=Object.fromEntries(schema.getStageQuestions('post').map((q,i)=>[q.id,i===0?'2':i===1?'3':'4']));
for(const stage of ['pre','mid','post']) for(const mode of ['questions','detail','table','summary','trend', ...(stage === 'pre' ? [] : ['entry'])]) for(const mobile of [false,true]) {
  if(stage==='pre' && mode==='summary') continue;
  stateValues = [mobile,fixture,false,'',stage,'',null,null,mode]; stateIndex=0;
  const html = renderToStaticMarkup(React.createElement(page));
  assert.ok(html.includes('설문 단계'));
  assert.ok(!html.includes('제출일시'));
  assert.ok(!html.includes('가상 기록 제외 검사'));
  assert.ok(!html.includes('미완성 기록 제외 검사'));
  if(mode === 'questions') assert.ok(html.includes(`${schema.SURVEY_STAGES[stage]} 설문지`));
  if(mode==='detail'||mode==='table') {
    assert.ok(html.includes('검증 환자 1'));

  }
  if(stage!=='pre' && mode !== 'entry' && mode !== 'trend') assert.ok(!html.includes('A1.'));
  const name=`${stage}-${mode}-${mobile?'mobile':'desktop'}.html`;
  if(process.argv[2]) fs.writeFileSync(path.join(process.argv[2],name),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style>${html}</html>`);
}
if(process.argv[2]) for(const stage of ['mid','post']) {
  stateValues=[false,fixture,false,'',stage,'',null,null,'entry',null,true];stateIndex=0;
  const html=renderToStaticMarkup(React.createElement(page));
  fs.writeFileSync(path.join(process.argv[2],`${stage}-example.html`), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style>${html}</html>`);
}
stateValues=[false,[],false,'','post','',null,null,'summary'];stateIndex=0;
assert.ok(renderToStaticMarkup(React.createElement(page)).includes('응답이 없습니다'));
function findExport(element, name='엑셀 내보내기') {
  if(!element || typeof element !== 'object') return;
  if(element.type === 'button' && element.props.children === name) return element.props.onClick;
  const children = element.props?.children;
  for(const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const found = findExport(child, name); if(found) return found;
  }
}
function findElement(element, predicate) {
  if(!element || typeof element !== 'object') return;
  if(predicate(element)) return element;
  const children=element.props?.children;
  for(const child of Array.isArray(children)?children.flat(Infinity):[children]) {
    const found=findElement(child,predicate);if(found)return found;
  }
}
stateValues=[false,fixture,false,'','mid','',null,null,'entry',null,false,true];stateIndex=0;stateUpdates=[];
const postTab=findElement(page(),element=>element.type==='button' && element.key==='post');
postTab.props.onClick();assert.equal(stateUpdates.length,0);
allowDiscard=true;postTab.props.onClick();assert.ok(stateUpdates.some(update=>update.slot===4 && update.value==='post'));
allowDiscard=false;
(async () => {
  const ExcelJS = require('exceljs');
  for(const stage of ['pre','mid','post']) {
    stateValues=[false,fixture,false,'',stage,'',null,null,'table'];stateIndex=0;
    await findExport(page())();
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(exportBuffer);
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.name, `${schema.SURVEY_STAGES[stage]} 설문 응답`);
    assert.equal(sheet.rowCount, 2);
    assert.equal(sheet.getRow(1).cellCount, schema.getStageQuestions(stage).length + (stage === 'pre' ? 3 : 8));
    assert.equal(sheet.getRow(2).getCell(3).value, '검증 환자 1');
    assert.ok(anchor.download.includes(schema.SURVEY_STAGES[stage]));
  }
  stateValues=[false,fixture,false,'','pre','',null,null,'trend',null,false,false,false];stateIndex=0;
  await findExport(page())();
  const trendWorkbook=new ExcelJS.Workbook();await trendWorkbook.xlsx.load(exportBuffer);
  const trendSheet=trendWorkbook.worksheets[0];
  assert.equal(trendSheet.name,'개인별 답변 추이');assert.equal(trendSheet.rowCount,22);
  assert.equal(trendSheet.getRow(1).getCell(7).value,'중간 조사일');
  assert.equal(trendSheet.getRow(1).getCell(8).value,'사후 조사일');
  assert.equal(trendSheet.getRow(2).getCell(5).value,original.formatAnswerLabel(q,fixture[1].answers));
  assert.equal(trendSheet.getRow(2).getCell(6).value,original.formatAnswerLabel(q,fixture[2].answers));
  stateValues=[false,[fixture[0]],false,'','mid','',null,null,'detail'];stateIndex=0;
  const pendingHtml=renderToStaticMarkup(React.createElement(page));
  assert.ok(pendingHtml.includes('아직 입력하지 않았습니다.'));
  assert.ok(pendingHtml.includes('검증 환자 1'));
  assert.ok(pendingHtml.includes('답변 입력'));
  const exampleRows=[fixture[0], {...fixture[1],recordStatus:'example',answers:records.positiveExample('mid')},{...fixture[2],recordStatus:'example',answers:records.positiveExample('post')}];
  assert.equal(records.visibleFollowup(exampleRows,'pre','mid').recordStatus,'example');
  assert.equal(records.visibleFollowup([...exampleRows,fixture[1]],'pre','mid').recordStatus,'recorded');
  assert.equal(records.visibleFollowup(exampleRows,'other','mid'),undefined);
  for(const stage of ['mid','post']) for(const mode of ['detail','table','summary']) {
    stateValues=[false,exampleRows,false,'',stage,'',null,null,mode];stateIndex=0;
    const html=renderToStaticMarkup(React.createElement(page));
    assert.ok(!html.includes('예시 데이터 · 답변'));
    assert.ok(!html.includes('실제 조사 결과나 성과가 아닙니다'));
    assert.ok(!html.includes('(응답 없음)'));
    assert.ok(!html.includes('아직 입력하지 않았습니다.'));
  }
  stateValues=[false,exampleRows,false,'','post','',null,null,'detail'];stateIndex=0;stateUpdates=[];
  findElement(page(),e=>typeof e.props?.onEdit === 'function').props.onEdit();
  assert.ok(stateUpdates.some(u=>u.slot===10 && u.value===true));
  stateValues=[false,exampleRows,false,'','post','',null,null,'table'];stateIndex=0;
  await findExport(page())();
  const draftWorkbook=new ExcelJS.Workbook();await draftWorkbook.xlsx.load(exportBuffer);
  assert.ok(draftWorkbook.worksheets[0].name.includes('예시 데이터'));
  assert.ok(draftWorkbook.worksheets[0].getRow(2).getCell(28).value.includes('성과 제외'));
  stateValues=[false,exampleRows,false,'','pre','',null,null,'trend',null,false,false,true];stateIndex=0;
  await findExport(page())();
  const exampleWorkbook=new ExcelJS.Workbook();await exampleWorkbook.xlsx.load(exportBuffer);
  const exampleSheet=exampleWorkbook.worksheets[0];
  assert.ok(exampleSheet.name.includes('성과 제외'));
  assert.ok(exampleSheet.getRow(1).getCell(1).value.includes('예시 데이터'));
  assert.equal(exampleSheet.getRow(1).getCell(7).value,'중간 조사일');
  assert.ok(anchor.download.includes('예시데이터'));
  previousRecord=undefined;lastWrite=undefined;
  stateValues=[false,[fixture[0]],false,'','pre','',null,null,'detail'];stateIndex=0;
  await findExport(page(),'전체 기록 준비')();
  assert.equal(lastWrite.recordStatus,'example');assert.equal(lastWrite.surveyType,'post');
  assert.equal(lastWrite.sourceResponseId,'pre');
  assert.deepEqual(lastWrite.answers,records.positiveExample('post',fixture[0]));
  previousRecord={recordStatus:'example',sourceResponseId:'pre',surveyVersion:schema.FOLLOWUP_VERSION,answers:{'A-1':'1'},deviceType:'manual'};lastWrite=undefined;
  stateValues=[false,[fixture[0]],false,'','pre','',null,null,'detail'];stateIndex=0;
  await findExport(page(),'전체 기록 준비')();
  assert.equal(lastWrite.answers['A-1'],'1');
  assert.equal(Object.keys(lastWrite.questionTimes).length,20);
  assert.ok(['mobile','tablet','desktop'].includes(lastWrite.deviceType));
  assert.equal(lastWrite.revisionHistory[0].deviceType,'manual');
  assert.equal(lastWrite.answers['A-1'],'1');
  previousRecord=lastWrite;lastWrite=undefined;
  stateValues=[false,[fixture[0]],false,'','pre','',null,null,'detail'];stateIndex=0;
  await findExport(page(),'전체 기록 준비')();
  assert.equal(lastWrite.answers['A-1'],'1'); // 직접 수정한 보기는 다음 준비에서도 보존한다.
  previousRecord={recordStatus:'example',sourceResponseId:'pre',surveyVersion:schema.FOLLOWUP_VERSION,answers:records.legacyPositiveExample('post',fixture[0]),questionTimes:Object.fromEntries(schema.getStageQuestions('post').map(q=>[q.id,30])),deviceType:'mobile',revision:1,revisionHistory:[]};lastWrite=undefined;
  stateValues=[false,[fixture[0]],false,'','pre','',null,null,'detail'];stateIndex=0;
  await findExport(page(),'전체 기록 준비')();
  assert.deepEqual(lastWrite.answers,records.positiveExample('post',fixture[0]));
  assert.equal(lastWrite.revision,2);
  assert.equal(lastWrite.revisionHistory[0].answers['A-1'],records.legacyPositiveExample('post',fixture[0])['A-1']);
  previousRecord=undefined;
  const Editor = load(path.join(root,'components/SurveyFollowupEditor.tsx')).default;
  let saved;
  stateValues=[records.positiveExample('mid'),'2026-08-01','종이 원문',true,false,'',0];stateIndex=0;
  previousRecord=undefined;lastWrite=undefined;
  await findExport(Editor({source:fixture[0],stage:'mid',example:false,onSaved: row => {saved=row;}}), '실제 응답 확정')();
  assert.equal(lastWrite.sourceResponseId,'pre');assert.equal(lastWrite.recordStatus,'recorded');assert.equal(saved.revision,1);
  assert.equal(lastWrite.revisionHistory.length,0);
  previousRecord={...lastWrite,revision:1};
  stateValues=[records.positiveExample('mid'),'2026-08-01','수정 원문',true,false,'',1];stateIndex=0;lastWrite=undefined;
  await findExport(Editor({source:fixture[0],stage:'mid',example:false,record:previousRecord,onSaved: row => {saved=row;}}), '실제 응답 확정')();
  assert.equal(lastWrite.revision,2);assert.equal(lastWrite.revisionHistory[0].interviewNotes,'종이 원문');
  stateValues=[records.positiveExample('mid'),'2026-08-01','',true,false,'',0];stateIndex=0;lastWrite=undefined;
  await findExport(Editor({source:fixture[0],stage:'mid',example:false,onSaved:()=>{}}), '실제 응답 확정')();
  assert.equal(lastWrite,undefined); // 동시 수정 충돌은 이전 기록을 덮어쓰지 않는다.
  stateValues=[records.positiveExample('mid'),'2026-08-01','',false,false,'',0];stateIndex=0;lastWrite=undefined;
  await findExport(Editor({source:fixture[0],stage:'mid',example:false,onSaved:()=>{}}), '실제 응답 확정')();
  assert.equal(lastWrite,undefined); // 원답변 확인 없이 실제 기록을 확정하지 않는다.
  previousRecord=undefined;stateValues=[records.positiveExample('mid'),'','가상 예시',false,false,'',0];stateIndex=0;
  await findExport(Editor({source:fixture[0],stage:'mid',example:true,onSaved: row=>{saved=row;}}), '저장')();
  assert.equal(lastWrite.recordStatus,'example');assert.equal(records.isRecorded(saved),false);
  console.log('문항 원본·참여자 연결·가상/미완성 제외·32개 렌더링·엑셀 재열기·입력 검증·수정 이력·동시 수정 검사 통과');
})().catch(error => { console.error(error); process.exitCode=1; });
