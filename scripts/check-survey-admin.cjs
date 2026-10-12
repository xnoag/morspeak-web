/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS에서 TS 소스와 브라우저 의존성을 격리해 검사한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
let stateValues = [], stateIndex = 0, exportBuffer;
const anchor = { click() {} };
const documentStub = { createElement: () => anchor };
class BlobStub { constructor(parts) { exportBuffer = parts[0]; } }
const mockReact = { ...React, useState: initial => [stateValues[stateIndex++] ?? initial, () => {}], useEffect: () => {}, useLayoutEffect: () => {}, useMemo: fn => fn() };
function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const localRequire = name => {
    if(name === 'react') return mockReact;
    if(name === 'firebase/firestore') return {};
    if(name === '@/lib/firebase') return { db: {} };
    if(name.startsWith('@/')) return load(path.join(root, name.slice(2)) + (name.includes('components/') ? '.tsx' : '.ts'));
    if(name.startsWith('./')) return load(path.resolve(path.dirname(file), name) + '.ts');
    return require(path.join(root, 'node_modules', name));
  };
  new Function('exports', 'require', 'Blob', 'URL', 'document', code)(exports, localRequire, BlobStub, { createObjectURL: () => 'blob:check', revokeObjectURL() {} }, documentStub);
  return exports;
}
const schema = load(path.join(root, 'lib/survey-stages.ts'));
const original = load(path.join(root, 'lib/survey-questions.ts'));
assert.equal(schema.getStageQuestions('pre').length, 28);
assert.equal(schema.getStageQuestions('mid').length, 17);
assert.equal(schema.getStageQuestions('post').length, 21);
assert.equal(schema.getStageQuestions('mid').every(q => q.section === 'B'), true);
assert.equal(schema.getStageQuestions('post').slice(-4).map(q=>q.id).join(','), 'D1,D2,D3,D4');
assert.equal(original.formatAnswerLabel(schema.getStageQuestions('post').find(q=>q.id==='D3'), {D3:'e'}), '매우 많았다');
assert.equal(schema.getStageQuestions('mid').find(q=>q.id==='B5').showIf({B4:'d'}), true);
assert.equal(schema.getStageQuestions('mid').find(q=>q.id==='B5').showIf({B4:'e'}), false);
const page = load(path.join(root, 'app/survey-admin/page.tsx')).default;
const fixture = ['pre','mid','post'].map((surveyType, i) => ({id:surveyType, surveyType, caregiverName:`검증 보호자 ${i+1}`, patientName:`검증 환자 ${i+1}`, caregiverContact:null, deviceType:'mobile', answers:Object.fromEntries(schema.getStageQuestions(surveyType).map(q=>[q.id,q.type==='multi'?['a']:'d']))}));
for(const stage of ['pre','mid','post']) for(const mode of ['questions','detail','table','summary']) for(const mobile of [false,true]) {
  if(stage==='pre' && mode==='summary') continue;
  stateValues = [mobile,fixture,false,'',stage,'',null,null,mode]; stateIndex=0;
  const html = renderToStaticMarkup(React.createElement(page));
  assert.ok(html.includes('설문 단계'));
  if(mode === 'questions') assert.ok(html.includes(`${schema.SURVEY_STAGES[stage]} 설문지`));
  if(mode==='detail'||mode==='table') {
    assert.ok(html.includes(`검증 환자 ${['pre','mid','post'].indexOf(stage)+1}`));
    for(const other of ['pre','mid','post'].filter(x=>x!==stage)) assert.ok(!html.includes(`검증 환자 ${['pre','mid','post'].indexOf(other)+1}`));
  }
  if(stage!=='pre') assert.ok(!html.includes('A1.'));
  const name=`${stage}-${mode}-${mobile?'mobile':'desktop'}.html`;
  if(process.argv[2]) fs.writeFileSync(path.join(process.argv[2],name),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style>${html}</html>`);
}
stateValues=[false,[],false,'','post','',null,null,'summary'];stateIndex=0;
assert.ok(renderToStaticMarkup(React.createElement(page)).includes('응답이 없습니다'));
function findExport(element) {
  if(!element || typeof element !== 'object') return;
  if(element.type === 'button' && element.props.children === '엑셀 내보내기') return element.props.onClick;
  const children = element.props?.children;
  for(const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const found = findExport(child); if(found) return found;
  }
}
(async () => {
  const ExcelJS = require('exceljs');
  for(const stage of ['pre','mid','post']) {
    stateValues=[false,fixture,false,'',stage,'',null,null,'table'];stateIndex=0;
    await findExport(page())();
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(exportBuffer);
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.name, `${schema.SURVEY_STAGES[stage]} 설문 응답`);
    assert.equal(sheet.rowCount, 2);
    assert.equal(sheet.getRow(1).cellCount, schema.getStageQuestions(stage).length + 4);
    assert.equal(sheet.getRow(2).getCell(4).value, `검증 환자 ${['pre','mid','post'].indexOf(stage)+1}`);
    assert.ok(anchor.download.includes(schema.SURVEY_STAGES[stage]));
  }
  console.log('단계 스키마·분기·응답 분리·22개 렌더링·빈 응답·엑셀 3종 재열기 검사 통과');
})().catch(error => { console.error(error); process.exitCode=1; });
