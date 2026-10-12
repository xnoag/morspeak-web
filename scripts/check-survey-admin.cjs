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
const firestoreStub = { doc: (_db, _collection, id) => ({id}), serverTimestamp: () => 'SERVER_TIMESTAMP', runTransaction: async (_db, callback) => callback({ get: async ref => ref.id === 'pre' ? { exists: () => true, data: () => ({surveyType:'pre'}) } : { data: () => previousRecord }, set: (_ref, data) => { lastWrite=data; } }) };
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
    if(name === 'firebase/firestore') return firestoreStub;
    if(name === '@/lib/firebase') return { db: {} };
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
assert.equal(records.isRecorded({recordStatus:'example'}),false);
assert.equal(records.isRecorded({recordStatus:'draft'}),false);
assert.equal(records.isRecorded({recordStatus:'recorded'}),true);
assert.ok(records.validateFollowup({}, 'mid', '2026-08-01').includes('A-1'));
assert.ok(records.validateFollowup(records.positiveExample('mid'), 'mid', '2026-02-30'));
assert.equal(records.validateFollowup(records.positiveExample('mid'), 'mid', '2026-08-01'), '');
assert.ok(Object.values(records.positiveExample('mid')).every(v=>v==='3'));
assert.ok(Object.values(records.positiveExample('post')).every(v=>v==='4'));
assert.equal(records.cleanFollowupAnswers({'A-1':'99', 'S-1':'사전 인터뷰'},'mid')['A-1'],undefined);
assert.equal(records.followupId('pre_person','mid'), 'mid_pre_person');
assert.equal(records.followupId('pre_person','mid',true), 'example_mid_pre_person');
const trends=load(path.join(root,'lib/survey-trends.ts'));
const page = load(path.join(root, 'app/survey-admin/page.tsx')).default;
const fixture = ['pre','mid','post'].map((surveyType) => ({id:surveyType === 'pre' ? 'pre' : `${surveyType}_pre`, surveyType, surveyVersion: surveyType === 'pre' ? 'v1' : schema.FOLLOWUP_VERSION, recordStatus: 'recorded', sourceResponseId: surveyType === 'pre' ? undefined : 'pre', caregiverName:'검증 보호자 1', patientName:'검증 환자 1', caregiverContact:null, deviceType:'mobile', answers:Object.fromEntries(schema.getStageQuestions(surveyType).map(q=>[q.id,q.type==='multi'?['a']:surveyType === 'pre' ? 'd' : '3']))}));
const q=schema.getStageQuestions('mid')[0];
assert.equal(trends.scoreChange(q,fixture[1],{...fixture[2],answers:{...fixture[2].answers,[q.id]:'4'}}),1);
assert.equal(trends.scoreChange(q,fixture[1],{...fixture[2],answers:{...fixture[2].answers,[q.id]:'2'}}),-1);
assert.equal(trends.scoreChange(q,fixture[1],fixture[2]),0);
assert.equal(trends.scoreChange(q,fixture[1],{...fixture[2],recordStatus:'example'}),null);
assert.equal(trends.scoreChange(q,fixture[1],{...fixture[2],recordStatus:'draft'}),null);
assert.equal(trends.scoreChange(q,fixture[1],{...fixture[2],surveyVersion:'different'}),null);
assert.equal(trends.scoreChange(q,undefined,fixture[2]),null);
assert.equal(trends.relatedPreQuestions('A-1')[0].id,'B1');
assert.equal(trends.relatedPreQuestions('H-1')[0].id,'B1');
assert.equal(trends.relatedPreQuestions('D-2').length,0);
assert.equal(trends.recordedFollowup(fixture,'another-person','mid'),undefined);
assert.equal(trends.recordedFollowup(fixture,'pre','mid').id,'mid_pre');
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
    assert.equal(sheet.getRow(1).cellCount, schema.getStageQuestions(stage).length + (stage === 'pre' ? 4 : 8));
    assert.equal(sheet.getRow(2).getCell(4).value, '검증 환자 1');
    assert.ok(anchor.download.includes(schema.SURVEY_STAGES[stage]));
  }
  stateValues=[false,fixture,false,'','pre','',null,null,'trend'];stateIndex=0;
  await findExport(page())();
  const trendWorkbook=new ExcelJS.Workbook();await trendWorkbook.xlsx.load(exportBuffer);
  const trendSheet=trendWorkbook.worksheets[0];
  assert.equal(trendSheet.name,'개인별 답변 추이');assert.equal(trendSheet.rowCount,22);
  assert.equal(trendSheet.getRow(2).getCell(7).value,-1);
  assert.equal(trendSheet.getRow(3).getCell(7).value,0);
  assert.equal(trendSheet.getRow(4).getCell(7).value,1);
  stateValues=[false,[fixture[0]],false,'','mid','',null,null,'detail'];stateIndex=0;
  const pendingHtml=renderToStaticMarkup(React.createElement(page));
  assert.ok(pendingHtml.includes('아직 입력하지 않았습니다.'));
  assert.ok(pendingHtml.includes('검증 환자 1'));
  assert.ok(pendingHtml.includes('답변 입력'));
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
  await findExport(Editor({source:fixture[0],stage:'mid',example:true,onSaved: row=>{saved=row;}}), '가상 초안 저장')();
  assert.equal(lastWrite.recordStatus,'example');assert.equal(records.isRecorded(saved),false);
  console.log('문항 원본·참여자 연결·가상/미완성 제외·32개 렌더링·엑셀 재열기·입력 검증·수정 이력·동시 수정 검사 통과');
})().catch(error => { console.error(error); process.exitCode=1; });
