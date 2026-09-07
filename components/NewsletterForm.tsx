'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NewsletterFormProps {
  label?: string;
  placeholder?: string;
  successMessage?: string;
  /** 어느 언어 페이지에서 들어왔는지 — /eng 는 'en', /jpn 은 'ja' */
  locale?: string;
}

/**
 * 소식 구독 폼 (/eng · /jpn 하단).
 *
 * ContactForm 과 같은 문제였다 — 이메일을 받아 `setSubmitted(true)` 만 하고
 * **아무 데도 보내지 않았다.** 영문·일문 페이지라 해외 문의를 통째로 놓쳤을 수 있다.
 * 지금은 Firestore `inquiries` 에 `kind: 'newsletter'` 로 쌓고 /admin/inquiries 에서 본다.
 *
 * 실패하면 성공 화면을 띄우지 않는다 (ContactForm 과 같은 이유).
 */
export default function NewsletterForm({
  label = '제품 소식과 업데이트를 받아보세요',
  placeholder = 'you@example.com',
  successMessage = '감사합니다! 소식을 보내드릴게요.',
  locale = 'ko',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await addDoc(collection(db, 'inquiries'), {
        kind: 'newsletter',
        email: email.trim().slice(0, 200),
        locale,
        handled: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-[12px] text-ms-muted mb-3" style={{ letterSpacing: '-0.3px' }}>
        {label}
      </p>
      {submitted ? (
        <p className="text-[14px] text-ms-secondary">{successMessage}</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="text-[14px] px-4 py-2 border border-[#ededed] rounded-lg bg-white text-ms-body placeholder:text-[#999] outline-none focus:border-[#aaa] flex-1 max-w-xs"
            />
            <button
              type="submit"
              disabled={loading}
              className="text-[14px] font-semibold text-white px-4 py-2 rounded-[10px] hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{
                background: 'rgb(204,204,204)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              &gt;
            </button>
          </form>
          {error && (
            <p className="text-[13px] mt-2" style={{ color: '#D92D20' }} role="alert">
              전송에 실패했습니다. gaon@morspeak.com 으로 보내주세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}
