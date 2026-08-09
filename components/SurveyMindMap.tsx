'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { SURVEY_QUESTIONS, SurveyAnswers, SurveyQuestion } from '@/lib/survey-questions';

const M = "'SF Mono','Fira Mono','Cascadia Mono',monospace";

export type MindMapRow = { id: string; answers: SurveyAnswers };

const SECTION_LABELS: Record<string, string> = {
  A: '기존 의사소통 방식 및 돌봄 상황',
  B: '의사소통 및 일상 참여 범위',
  C: '니즈 및 기대사항',
};

interface QuestionGroup { label: string | null; questions: SurveyQuestion[] }
interface QuestionSection { key: string; label: string; groups: QuestionGroup[] }

// SURVEY_QUESTIONS는 이미 A1~A8, B1~B17(측면별로 연속), C1~C3 순으로 정렬돼 있어서
// 한 번 훑으면서 section/group이 바뀔 때마다 새 묶음을 만들면 된다.
const GROUPED_QUESTIONS: QuestionSection[] = (() => {
  const sections: QuestionSection[] = [];
  for (const q of SURVEY_QUESTIONS) {
    let section = sections[sections.length - 1];
    if (!section || section.key !== q.section) {
      section = { key: q.section, label: SECTION_LABELS[q.section] ?? q.section, groups: [] };
      sections.push(section);
    }
    const groupLabel = q.group ?? null;
    let group = section.groups[section.groups.length - 1];
    if (!group || group.label !== groupLabel) {
      group = { label: groupLabel, questions: [] };
      section.groups.push(group);
    }
    group.questions.push(q);
  }
  return sections;
})();

// 문항별로 전체 응답자의 답변 분포를 막대그래프로 보여주는 요약 뷰 — 응답을 한 건씩
// 훑어보는 대신, 몇 명이 어떤 답을 골랐는지 문항 단위로 한눈에 파악할 수 있게 한다.
function optionCounts(q: SurveyQuestion, rows: MindMapRow[]) {
  const counts = new Map<string, number>();
  let answeredCount = 0;
  for (const r of rows) {
    const v = r.answers[q.id];
    const values = Array.isArray(v) ? v : v ? [v] : [];
    if (values.length === 0) continue;
    answeredCount++;
    for (const val of values) counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return { counts, answeredCount };
}

// showIf가 있는 문항은 특정 응답에 따라 일부 응답자에게만 노출되므로, 응답 인원이
// 전체 응답자 수보다 적게 나오는 게 정상이다 — 요약 화면에 그 이유를 바로 보여준다.
function ConditionalNote({ q, rows, answeredCount }: { q: SurveyQuestion; rows: MindMapRow[]; answeredCount: number }) {
  if (!q.showIf) return null;
  const eligible = rows.filter((r) => q.showIf!(r.answers)).length;
  return (
    <div style={{ fontSize: 11, color: '#ff9500', marginTop: -2, marginBottom: 8 }}>
      조건부 문항 — 전체 {rows.length}명 중 {eligible}명에게만 노출됨 (그중 {answeredCount}명 응답)
    </div>
  );
}

function SummaryQuestion({ q, rows }: { q: SurveyQuestion; rows: MindMapRow[] }) {
  if (q.type === 'text') {
    const answered = rows.filter((r) => typeof r.answers[q.id] === 'string' && (r.answers[q.id] as string).length > 0);
    return (
      <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#636366', flex: 1 }}>{q.title}</span>
          <span style={{ fontSize: 12, color: '#8e8e93', flexShrink: 0 }}>{answered.length}명 응답</span>
        </div>
        <ConditionalNote q={q} rows={rows} answeredCount={answered.length} />
        {answered.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {answered.map((r) => (
              <div key={r.id} style={{ fontSize: 12.5, color: '#1d1d1f', background: '#fafafa', borderRadius: 8, padding: '6px 10px', whiteSpace: 'pre-line' }}>
                “{r.answers[q.id] as string}”
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { counts, answeredCount } = optionCounts(q, rows);
  const maxCount = Math.max(1, ...Array.from(counts.values()));
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: '#636366', flex: 1 }}>{q.title}</span>
        <span style={{ fontSize: 12, color: '#8e8e93', flexShrink: 0 }}>{answeredCount}명 응답</span>
      </div>
      <ConditionalNote q={q} rows={rows} answeredCount={answeredCount} />
      <div style={{ display: 'grid', gap: 7 }}>
        {(q.options ?? []).map((o) => {
          const c = counts.get(o.value) ?? 0;
          const pct = answeredCount > 0 ? Math.round((c / answeredCount) * 100) : 0;
          return (
            <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, color: '#1d1d1f', width: 190, flexShrink: 0, lineHeight: 1.4 }}>{o.label}</span>
              <div style={{ flex: 1, height: 16, background: '#f2f2f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(c / maxCount) * 100}%`, background: '#007AFF', borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 12, color: '#636366', width: 64, flexShrink: 0, textAlign: 'right', fontFamily: M }}>{c}명 ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 조건부 문항(showIf)들은 일반 목록 대신 여기서 실제 문항 내용(제목+응답 막대그래프)을
// 그대로 노드로 써서 마인드맵 형태로 연결해 보여준다. 가로로 길어지므로 좌우 스크롤.
// lib/survey-questions.ts의 showIf 로직을 손으로 그대로 옮긴 것이라, 문항 조건이
// 바뀌면 이 트리 구조도 같이 고쳐줘야 한다.
const BRANCH_QUESTION_IDS = new Set(['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B4', 'B5']);

function findQ(id: string): SurveyQuestion {
  const q = SURVEY_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question id: ${id}`);
  return q;
}

const NODE_WIDTH = 440;

type NodeRegister = (id: string) => (el: HTMLDivElement | null) => void;

function TreeNode({ id, rows, register }: { id: string; rows: MindMapRow[]; register: NodeRegister }) {
  return (
    <div ref={register(id)} style={{ width: NODE_WIDTH, flexShrink: 0, background: '#fff', border: '1.5px solid #1d1d1f', borderRadius: 12, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <SummaryQuestion q={findQ(id)} rows={rows} />
    </div>
  );
}

// 섹션(A/B/C) 시작 지점에 세로로 꽂아 두는 라벨 — 가로로 쭉 스크롤할 때 어디쯔음인지 알 수 있게.
function SectionMarker({ section }: { section: QuestionSection }) {
  return (
    <div style={{ flexShrink: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', margin: '0 16px' }}>
      <div style={{
        writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const,
        fontSize: 11, fontWeight: 700, color: '#fff', background: '#007AFF',
        borderRadius: 8, padding: '10px 5px', letterSpacing: '.05em', whiteSpace: 'nowrap',
      }}>
        [{section.key}] {section.label}
      </div>
    </div>
  );
}

// A2 응답에 따라 A3~A8 중 무엇이 보일지 갈리는 구간. 실제 선 연결은 부모의 <svg> 오버레이가
// 노드 위치를 재서 그려주므로, 여기서는 겹치지 않게 자리만 넉넉히 배치한다.
function ClusterA({ rows, register }: { rows: MindMapRow[]; register: NodeRegister }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', columnGap: 90, rowGap: 60, flexShrink: 0 }}>
      <div style={{ gridRow: '1 / span 2', alignSelf: 'center' }}>
        <TreeNode id="A2" rows={rows} register={register} />
      </div>
      <div style={{ gridRow: 1, alignSelf: 'center' }}><TreeNode id="A7" rows={rows} register={register} /></div>
      <div style={{ gridRow: 1 }} />
      <div style={{ gridRow: 1, alignSelf: 'center' }}><TreeNode id="A8" rows={rows} register={register} /></div>

      <div style={{ gridRow: 2, alignSelf: 'start' }}>
        <TreeNode id="A3" rows={rows} register={register} />
      </div>
      <div style={{ gridRow: 2, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 60 }}>
        <TreeNode id="A4" rows={rows} register={register} />
        <TreeNode id="A5" rows={rows} register={register} />
        <TreeNode id="A6" rows={rows} register={register} />
      </div>
      <div style={{ gridRow: 2 }} />
    </div>
  );
}

// B4 응답에 따라 B5가 보일지 갈리는 구간.
function ClusterB({ rows, register }: { rows: MindMapRow[]; register: NodeRegister }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 90, flexShrink: 0 }}>
      <TreeNode id="B4" rows={rows} register={register} />
      <TreeNode id="B5" rows={rows} register={register} />
    </div>
  );
}

type FlowStep =
  | { kind: 'node'; id: string }
  | { kind: 'clusterA' }
  | { kind: 'clusterB' };

// SURVEY_QUESTIONS 순서를 그대로 따라가면서, A2/B4를 만나면 그 자리에서 해당 분기
// 구간(ClusterA/ClusterB)으로 바꿔치기하고 나머지 조건부 문항(A3~A8, B5)은 건너뛴다 —
// 결과적으로 문항이 실제 등장하는 순서 그대로 가로 한 줄로 이어진다.
const MAIN_FLOW_STEPS: FlowStep[] = (() => {
  const steps: FlowStep[] = [];
  for (const q of SURVEY_QUESTIONS) {
    if (q.id === 'A2') { steps.push({ kind: 'clusterA' }); continue; }
    if (q.id === 'B4') { steps.push({ kind: 'clusterB' }); continue; }
    if (BRANCH_QUESTION_IDS.has(q.id)) continue;
    steps.push({ kind: 'node', id: q.id });
  }
  return steps;
})();

const SECTION_START_IDS: Record<string, QuestionSection> = Object.fromEntries(
  GROUPED_QUESTIONS.map((s) => [s.groups[0]?.questions[0]?.id, s])
);

// 노드-노드 간에 실제로 어떤 선이 이어지는지: 순서상 다음 문항으로 가는 연결(회색, 무조건)과
// 조건부 분기에서 답변에 따라 갈라지는 연결(주황, 라벨 있음)을 모두 여기 한곳에 정의한다.
// step의 "entry"는 그 구간에 들어오는 화살표가 꽂히는 노드, "exit"는 다음 구간으로 나가는
// 화살표가 시작되는 노드다.
function stepEntry(step: FlowStep): string {
  return step.kind === 'node' ? step.id : step.kind === 'clusterA' ? 'A2' : 'B4';
}
function stepExit(step: FlowStep): string {
  return step.kind === 'node' ? step.id : step.kind === 'clusterA' ? 'A8' : 'B5';
}

type FlowEdge = { from: string; to: string; label?: string };

const FLOW_EDGES: FlowEdge[] = (() => {
  const edges: FlowEdge[] = [];
  for (let i = 0; i < MAIN_FLOW_STEPS.length - 1; i++) {
    edges.push({ from: stepExit(MAIN_FLOW_STEPS[i]), to: stepEntry(MAIN_FLOW_STEPS[i + 1]) });
  }
  edges.push({ from: 'A2', to: 'A7', label: "'안구마우스 등' 선택 시" });
  edges.push({ from: 'A2', to: 'A3', label: '선택 안 함' });
  edges.push({ from: 'A3', to: 'A4', label: "'네' 응답 시" });
  edges.push({ from: 'A3', to: 'A5' });
  edges.push({ from: 'A3', to: 'A6' });
  edges.push({ from: 'A5', to: 'A8', label: "'네' 응답 시" });
  edges.push({ from: 'A7', to: 'A8', label: "'전혀/거의/가끔' 응답 시" });
  edges.push({ from: 'B4', to: 'B5', label: "'매번'~'반반' 응답 시" });
  return edges;
})();

type EdgePath = { key: string; d: string; conditional: boolean; label?: string; lx: number; ly: number };

// 실제 화면에 그려진 노드 위치를 재서(getBoundingClientRect) 노드-노드를 잇는 곡선을
// <svg>로 직접 그린다 — 텍스트 라벨이나 근처에 놓은 화살표 아이콘이 아니라, 모든 연결이
// 예외 없이 시작 노드에서 도착 노드까지 실선으로 이어지도록 하기 위함이다.
// getBoundingClientRect는 현재 적용된 transform:scale(zoom)까지 반영된 값을 주기 때문에,
// 그 상태 그대로 좌표를 저장하면 "측정 시점의 zoom"에 고정돼버려서 이후 확대/축소하거나
// (지연 재계산 타이머가 그 사이 바뀐 zoom에서 실행되는 경우) 배율이 두 번 곱해져 선이
// 박스에서 멀어져 보이는 문제가 생긴다. 그래서 측정한 값을 항상 현재 zoom으로 나눠
// "자연 좌표"로 정규화해 저장하고, 실제 화면 배율은 오직 부모의 transform:scale 하나로만
// 적용되게 한다.
function useFlowConnectors(rows: MindMapRow[], zoom: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<EdgePath[]>([]);
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const zoomRef = useRef(zoom);
  useLayoutEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const register: NodeRegister = useCallback((id) => (el) => { nodeRefs.current[id] = el; }, []);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const z = zoomRef.current;
    const cRect = container.getBoundingClientRect();
    setCanvas({ width: container.scrollWidth, height: container.scrollHeight });
    const next: EdgePath[] = [];
    for (const edge of FLOW_EDGES) {
      const fromEl = nodeRefs.current[edge.from];
      const toEl = nodeRefs.current[edge.to];
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      const fx = (fr.right - cRect.left) / z;
      const fy = (fr.top + fr.height / 2 - cRect.top) / z;
      const tx = (tr.left - cRect.left) / z;
      const ty = (tr.top + tr.height / 2 - cRect.top) / z;
      const midX = (fx + tx) / 2;
      const d = `M ${fx} ${fy} C ${midX} ${fy}, ${midX} ${ty}, ${tx} ${ty}`;
      next.push({ key: `${edge.from}>${edge.to}`, d, conditional: !!edge.label, label: edge.label, lx: (fx + tx) / 2, ly: (fy + ty) / 2 });
    }
    setPaths(next);
  }, []);

  useLayoutEffect(() => {
    recompute();
    const t1 = setTimeout(recompute, 150);
    const t2 = setTimeout(recompute, 500);
    window.addEventListener('resize', recompute);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', recompute); };
  }, [rows, recompute]);

  return { containerRef, register, paths, canvas };
}

function FlowConnectorsSvg({ canvas, paths }: { canvas: { width: number; height: number }; paths: EdgePath[] }) {
  return (
    <svg
      width={canvas.width} height={canvas.height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="flow-arrow-plain" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#c7c7cc" />
        </marker>
        <marker id="flow-arrow-cond" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#ff9500" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key} d={p.d} fill="none"
          stroke={p.conditional ? '#ff9500' : '#c7c7cc'}
          strokeWidth={p.conditional ? 1.75 : 1.5}
          markerEnd={p.conditional ? 'url(#flow-arrow-cond)' : 'url(#flow-arrow-plain)'}
        />
      ))}
    </svg>
  );
}

const ZOOM_STEPS = [0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5];

function ZoomControls({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  const idx = ZOOM_STEPS.reduce((best, v, i) => Math.abs(v - zoom) < Math.abs(ZOOM_STEPS[best] - zoom) ? i : best, 0);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 20, display: 'flex', alignItems: 'center', gap: 4,
      background: '#1d1d1f', borderRadius: 12, padding: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      <button
        onClick={() => setZoom(ZOOM_STEPS[Math.max(0, idx - 1)])}
        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, cursor: 'pointer' }}
      >
        −
      </button>
      <span style={{ width: 48, textAlign: 'center', fontSize: 12, color: '#fff', fontFamily: M }}>{Math.round(zoom * 100)}%</span>
      <button
        onClick={() => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx + 1)])}
        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, cursor: 'pointer' }}
      >
        +
      </button>
      <button
        onClick={() => setZoom(1)}
        style={{ height: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 11, cursor: 'pointer', marginLeft: 2 }}
      >
        초기화
      </button>
    </div>
  );
}

export default function SurveyMindMap({ rows }: { rows: MindMapRow[] }) {
  const [zoom, setZoom] = useState(1);
  const { containerRef, register, paths, canvas } = useFlowConnectors(rows, zoom);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 24px', position: 'relative' }}>
      <p style={{ fontSize: 12, color: '#aeaeb2', marginBottom: 14 }}>← 좌우로 스크롤하면 A1부터 C3까지 순서대로 이어집니다. 회색 선은 순서상 다음 문항, 주황 선은 답변에 따라 갈라지는 조건부 문항 연결입니다. 우측 하단에서 확대/축소할 수 있습니다.</p>
      <div style={{ width: canvas.width * zoom, height: canvas.height * zoom }}>
        <div
          ref={containerRef}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', width: 'max-content',
            transform: `scale(${zoom})`, transformOrigin: 'top left',
          }}
        >
          <FlowConnectorsSvg canvas={canvas} paths={paths} />
          {paths.filter((p) => p.label).map((p) => (
            <div key={p.key} style={{
              position: 'absolute', left: p.lx, top: p.ly, transform: 'translate(-50%, -50%)', zIndex: 2,
              fontSize: 10.5, color: '#ff9500', background: '#fff8ec', border: '1px solid #ffe4b8',
              borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', fontWeight: 600,
            }}>
              {p.label}
            </div>
          ))}
          {MAIN_FLOW_STEPS.map((step, i) => {
            const id = stepEntry(step);
            const section = SECTION_START_IDS[id];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {section && <SectionMarker section={section} />}
                <div style={{ marginRight: 70 }}>
                  {step.kind === 'node' && <TreeNode id={step.id} rows={rows} register={register} />}
                  {step.kind === 'clusterA' && <ClusterA rows={rows} register={register} />}
                  {step.kind === 'clusterB' && <ClusterB rows={rows} register={register} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ZoomControls zoom={zoom} setZoom={setZoom} />
    </div>
  );
}
