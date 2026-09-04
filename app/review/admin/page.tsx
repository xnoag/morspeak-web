'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

type Session = {
  id: string;
  patientName: string;
  caregiverName: string;
  donationLink?: string;
  customImageUrl?: string;
  message?: string;
  submittedAt?: string;
  videoUrl?: string;
  createdAt: string;
};

const PW = '0621';
const HOST = 'https://morspeak-web.vercel.app';
const F = "'Noto Sans KR', sans-serif";

export default function ReviewAdminPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tab, setTab] = useState<'create' | 'responses' | 'report'>('create');

  // 링크 생성 폼
  const [newPatient, setNewPatient] = useState('');
  const [newCaregiver, setNewCaregiver] = useState('');
  const [newDonationLink, setNewDonationLink] = useState('');
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newImageUploading, setNewImageUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState('');
  const newImageRef = useRef<HTMLInputElement | null>(null);

  // 영상 업로드
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const imgRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!authed) return;
    signInAnonymously(getAuth()).catch(() => {});
    return onSnapshot(
      query(collection(db, 'review_sessions'), orderBy('createdAt', 'desc')),
      snap => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Session)))
    );
  }, [authed]);

  const uploadFile = (id: string, file: File, path: string, field: string, col: string) => {
    const task = uploadBytesResumable(ref(getStorage(), path), file);
    task.on('state_changed',
      s => setUploading(p => ({ ...p, [id]: Math.round(s.bytesTransferred / s.totalBytes * 100) })),
      err => { alert('업로드 실패: ' + err.message); setUploading(p => { const n = { ...p }; delete n[id]; return n; }); },
      async () => {
        await updateDoc(doc(db, col, id), { [field]: await getDownloadURL(task.snapshot.ref) });
        setUploading(p => { const n = { ...p }; delete n[id]; return n; });
      }
    );
  };

  const uploadNewImage = (file: File): Promise<string> => {
    setNewImageUploading(true);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(getStorage(), `review_images/new_${Date.now()}_${file.name}`), file);
      task.on('state_changed', null,
        err => { setNewImageUploading(false); reject(err); },
        async () => { setNewImageUploading(false); resolve(await getDownloadURL(task.snapshot.ref)); }
      );
    });
  };

  const createSession = async () => {
    if (!newPatient.trim() || !newCaregiver.trim() || creating) return;
    setCreating(true);
    try {
      const ref2 = await addDoc(collection(db, 'review_sessions'), {
        patientName: newPatient.trim(), caregiverName: newCaregiver.trim(),
        donationLink: newDonationLink.trim() || null,
        customImageUrl: newImageUrl || null,
        createdAt: new Date().toISOString(),
      });
      setCreatedUrl(`${HOST}/review/${ref2.id}`);
      setNewPatient(''); setNewCaregiver(''); setNewDonationLink(''); setNewImageUrl(null);
    } finally { setCreating(false); }
  };

  const submitted = sessions.filter(s => s.submittedAt);
  const pending = sessions.filter(s => !s.submittedAt);

  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'#F7F6F3', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'32px 28px', width:300, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🔒 후기 관리</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pw === PW && setAuthed(true)}
          placeholder="비밀번호" autoFocus
          style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:15, fontFamily:F, outline:'none', boxSizing:'border-box' as const, marginBottom:12 }} />
        <button onClick={() => pw === PW && setAuthed(true)}
          style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'#1C1C1E', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F }}>
          확인
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F2F2F7', fontFamily:F }}>
      {/* 탑바 */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E4E2DC', padding:'0 20px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:840, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1A1916', padding:'14px 0' }}>후기 관리</div>
          <div style={{ display:'flex', gap:2 }}>
            {([
              ['create', '🔗 링크 생성'],
              ['responses', `📋 설문 결과 (${submitted.length})`],
              ['report', '📄 보고서'],
            ] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:600,
                  color: tab === t ? '#0071E3' : '#8E8E93',
                  borderBottom: tab === t ? '2px solid #0071E3' : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:840, margin:'0 auto', padding:'24px 16px 60px' }}>

        {/* ── 탭1: 링크 생성 ── */}
        {tab === 'create' && <>
          {/* 생성 폼 */}
          <div style={{ background:'#fff', borderRadius:16, padding:'22px', marginBottom:20, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#1A1916', marginBottom:16 }}>새 개별 링크 만들기</div>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <input value={newPatient} onChange={e => setNewPatient(e.target.value)} placeholder="환우명"
                style={{ flex:1, padding:'11px 13px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:14, fontFamily:F, outline:'none' }} />
              <input value={newCaregiver} onChange={e => setNewCaregiver(e.target.value)} placeholder="보호자명"
                style={{ flex:1, padding:'11px 13px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:14, fontFamily:F, outline:'none' }} />
            </div>
            <input value={newDonationLink} onChange={e => setNewDonationLink(e.target.value)}
              placeholder="기부 완료 링크 (선택)"
              style={{ width:'100%', padding:'11px 13px', border:'1.5px solid #E4E2DC', borderRadius:10, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box' as const, marginBottom:12 }} />
            {/* 이미지 */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#6B6860', marginBottom:8 }}>카드 이미지 (선택)</div>
              {newImageUrl
                ? <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <img src={newImageUrl} alt="" style={{ height:56, borderRadius:8, border:'1.5px solid #E4E2DC' }} />
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={{ fontSize:12, color:'#1A8C3A', fontWeight:600 }}>✓ 업로드 완료</span>
                      <button onClick={() => newImageRef.current?.click()}
                        style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1.5px solid #E4E2DC', background:'#F7F6F3', color:'#6B6860', cursor:'pointer', fontFamily:F }}>교체</button>
                      <button onClick={() => setNewImageUrl(null)}
                        style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'none', background:'none', color:'#FF3B30', cursor:'pointer', fontFamily:F }}>제거</button>
                    </div>
                  </div>
                : <button onClick={() => newImageRef.current?.click()}
                    style={{ padding:'10px 16px', borderRadius:8, border:'2px dashed #E4E2DC', background:'#F7F6F3', color:'#9E9C96', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                    {newImageUploading ? '업로드 중...' : '🖼 이미지 업로드'}
                  </button>
              }
              <input type="file" accept="image/*" ref={newImageRef} style={{ display:'none' }}
                onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setNewImageUrl(await uploadNewImage(f)); } catch { alert('업로드 실패'); } e.target.value = ''; }} />
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={createSession} disabled={!newPatient.trim() || !newCaregiver.trim() || creating}
                style={{ padding:'11px 22px', borderRadius:10, border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F,
                  background: newPatient.trim() && newCaregiver.trim() ? '#1C1C1E' : '#F2F2F7',
                  color: newPatient.trim() && newCaregiver.trim() ? '#fff' : '#C7C7CC' }}>
                {creating ? '생성 중...' : '링크 생성'}
              </button>
              {createdUrl && (
                <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', background:'#F0FFF4', border:'1.5px solid #1A8C3A', borderRadius:10, padding:'8px 12px' }}>
                  <span style={{ flex:1, fontSize:12, color:'#1A8C3A', wordBreak:'break-all' as const }}>{createdUrl}</span>
                  <button onClick={() => navigator.clipboard.writeText(createdUrl)}
                    style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'#1A8C3A', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F, flexShrink:0 }}>복사</button>
                </div>
              )}
            </div>
          </div>

          {/* 링크 목록 */}
          {sessions.length === 0
            ? <div style={{ textAlign:'center', color:'#C7C7CC', padding:40 }}>아직 생성된 링크가 없어요</div>
            : <>
              {pending.length > 0 && (
                <div style={{ fontSize:12, fontWeight:700, color:'#8E8E93', marginBottom:8 }}>⏳ 미제출 ({pending.length})</div>
              )}
              {pending.map(s => <LinkRow key={s.id} s={s} F={F} HOST={HOST} />)}
              {submitted.length > 0 && (
                <div style={{ fontSize:12, fontWeight:700, color:'#8E8E93', margin:'16px 0 8px' }}>✅ 제출 완료 ({submitted.length})</div>
              )}
              {submitted.map(s => <LinkRow key={s.id} s={s} F={F} HOST={HOST} />)}
            </>
          }
        </>}

        {/* ── 탭2: 설문 결과 ── */}
        {tab === 'responses' && <>
          {submitted.length === 0
            ? <div style={{ textAlign:'center', color:'#C7C7CC', padding:60, fontSize:14 }}>아직 제출된 후기가 없어요</div>
            : submitted.map(s => (
              <div key={s.id} style={{ background:'#fff', borderRadius:16, padding:'20px', marginBottom:14, boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ display:'flex', gap:10 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1A1916' }}>{s.patientName}</span>
                    <span style={{ fontSize:13, color:'#8E8E93' }}>보호자 {s.caregiverName}</span>
                  </div>
                  <span style={{ fontSize:11, color:'#C7C7CC' }}>{s.submittedAt ? new Date(s.submittedAt).toLocaleString('ko-KR') : ''}</span>
                </div>
                <div style={{ background:'#FFFBEA', border:'1.5px solid #FFD700', borderRadius:12, padding:'14px 16px', fontSize:14, color:'#1A1916', lineHeight:1.85, whiteSpace:'pre-wrap', marginBottom:s.videoUrl?12:0 }}>
                  {s.message}
                </div>
                {s.videoUrl && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6B6860', marginBottom:6 }}>환우 후기 영상</div>
                    <video controls style={{ width:'100%', borderRadius:10, background:'#000', maxHeight:260 }}><source src={s.videoUrl} /></video>
                    <a href={s.videoUrl} download style={{ display:'block', textAlign:'center', marginTop:8, padding:'9px', borderRadius:8, background:'#1C1C1E', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:600 }}>⬇️ 영상 다운로드</a>
                  </div>
                )}

                {/* 영상 첨부 (미첨부 시) */}
                {!s.videoUrl && <>
                  <button onClick={() => videoRefs.current[s.id]?.click()}
                    style={{ marginTop:10, width:'100%', padding:'11px', borderRadius:8, border:'2px dashed #E4E2DC', background:'#F7F6F3', color:'#9E9C96', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                    {uploading[s.id] !== undefined ? `업로드 중 ${uploading[s.id]}%` : '🎬 환우 후기 영상 첨부'}
                  </button>
                  <input type="file" accept="video/*" ref={el => { videoRefs.current[s.id] = el; }} style={{ display:'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(s.id, f, `review_videos/${s.id}_${f.name}`, 'videoUrl', 'review_sessions'); e.target.value = ''; }} />
                </>}
              </div>
            ))
          }
        </>}

        {/* ── 탭3: 보고서 ── */}
        {tab === 'report' && <>
          {submitted.length === 0
            ? <div style={{ textAlign:'center', color:'#C7C7CC', padding:60, fontSize:14 }}>제출된 후기가 없어요</div>
            : <>
              <div style={{ fontSize:13, color:'#8E8E93', marginBottom:16 }}>총 {submitted.length}건 · 각 카드를 인쇄하거나 스크린샷으로 활용하세요</div>
              {submitted.map((s, i) => (
                <div key={s.id} style={{ background:'#fff', borderRadius:20, marginBottom:32, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.08)', pageBreakAfter:'always' }}>
                  {/* 카드 이미지 + 메시지 오버레이 */}
                  <div style={{ background:'#FFC627' }}>
                    {s.customImageUrl
                      ? <img src={s.customImageUrl} alt="카드" style={{ width:'100%', display:'block' }} />
                      : <Image src="/gongjang-thankyou.jpeg" alt="카드" width={840} height={560} style={{ width:'100%', height:'auto', display:'block' }} />
                    }
                  </div>

                  <div style={{ padding:'22px 24px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#8E8E93' }}>#{i + 1}</span>
                      <span style={{ fontSize:18, fontWeight:700, color:'#1A1916' }}>{s.patientName}</span>
                      <span style={{ fontSize:14, color:'#8E8E93' }}>보호자 {s.caregiverName}</span>
                      {s.donationLink && (
                        <a href={s.donationLink} target="_blank" rel="noopener noreferrer"
                          style={{ marginLeft:'auto', fontSize:11, padding:'4px 10px', borderRadius:20, background:'#1C1C1E', color:'#FFC627', textDecoration:'none', fontWeight:600, flexShrink:0 }}>
                          기부 내역 ↗
                        </a>
                      )}
                    </div>

                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#6B6860', marginBottom:8 }}>보호자 한마디</div>
                      <div style={{ background:'#FFFBEA', border:'1.5px solid #FFD700', borderRadius:12, padding:'16px', fontSize:15, color:'#1A1916', lineHeight:1.9, whiteSpace:'pre-wrap' }}>
                        {s.message}
                      </div>
                      <div style={{ fontSize:11, color:'#C7C7CC', marginTop:6, textAlign:'right' as const }}>
                        {s.message?.length ?? 0}자 · {s.submittedAt ? new Date(s.submittedAt).toLocaleString('ko-KR') : ''}
                      </div>
                    </div>

                    {/* 영상 */}
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#6B6860', marginBottom:8 }}>모스픽으로 작성한 환우 후기 영상</div>
                      {s.videoUrl ? (
                        <>
                          <video controls style={{ width:'100%', borderRadius:12, background:'#000', maxHeight:320 }}><source src={s.videoUrl} /></video>
                          <a href={s.videoUrl} download
                            style={{ display:'block', textAlign:'center', marginTop:10, padding:'12px', borderRadius:10, background:'#1C1C1E', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>
                            ⬇️ 영상 다운로드
                          </a>
                        </>
                      ) : (
                        <>
                          <button onClick={() => videoRefs.current['r_'+s.id]?.click()}
                            style={{ width:'100%', padding:'16px', borderRadius:10, border:'2px dashed #E4E2DC', background:'#F7F6F3', color:'#9E9C96', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                            {uploading['r_'+s.id] !== undefined ? `업로드 중 ${uploading['r_'+s.id]}%` : '🎬 영상 첨부하기'}
                          </button>
                          <input type="file" accept="video/*" ref={el => { videoRefs.current['r_'+s.id] = el; }} style={{ display:'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(s.id, f, `review_videos/${s.id}_${f.name}`, 'videoUrl', 'review_sessions'); e.target.value = ''; }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          }
        </>}
      </div>
    </div>
  );
}

function LinkRow({ s, F, HOST }: { s: Session; F: string; HOST: string }) {
  const link = `${HOST}/review/${s.id}`;
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:8, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#1A1916' }}>{s.patientName}</span>
          <span style={{ fontSize:12, color:'#8E8E93' }}>보호자 {s.caregiverName}</span>
          {s.submittedAt
            ? <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#D4F5DF', color:'#1A8C3A', fontWeight:600 }}>✅ 제출완료</span>
            : <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#FFF0D4', color:'#CC7000', fontWeight:600 }}>⏳ 대기중</span>
          }
        </div>
        <div style={{ fontSize:11, color:'#0071E3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{link}</div>
      </div>
      <button onClick={() => navigator.clipboard.writeText(link)}
        style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #E4E2DC', background:'#F7F6F3', color:'#1C1C1E', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 }}>
        복사
      </button>
    </div>
  );
}
