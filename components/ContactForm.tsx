'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * 기관 문의 폼 (/contact).
 *
 * 예전에는 `await new Promise(r => setTimeout(r, 800))` 뒤에 성공 화면만 띄우고
 * **데이터를 아무 데도 보내지 않았다.** 기관이 문의를 남기면 그대로 사라지는데
 * 화면에는 "문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다." 가 떴다.
 * 놓친 문의는 되돌릴 수 없다 (2026-09-07 수정).
 *
 * 지금은 Firestore `inquiries` 에 쓰고 /admin/inquiries 에서 본다.
 * ⚠️ **쓰기가 실패하면 성공 화면을 띄우지 않는다.** 조용히 성공한 척하는 것이
 *    원래 버그의 본질이었다 — 실패는 실패로 보여야 상대가 다른 경로로 연락한다.
 */
export default function ContactForm() {
  const [form, setForm] = useState({
    organization: '',
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await addDoc(collection(db, 'inquiries'), {
        kind: 'contact',
        // 규칙(isValidInquiry)이 길이를 제한한다. 여기서도 잘라 보내서
        // 사용자가 "제출은 됐는데 거부됨" 을 겪지 않게 한다.
        organization: form.organization.trim().slice(0, 100),
        name: form.name.trim().slice(0, 50),
        phone: form.phone.trim().slice(0, 30),
        email: form.email.trim().slice(0, 200),
        message: form.message.trim().slice(0, 2000),
        locale: 'ko',
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

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <p className="text-[19px] font-semibold text-ms-dark mb-2">문의가 접수되었습니다.</p>
        <p className="text-[16px] text-ms-secondary">빠른 시일 내에 연락드리겠습니다.</p>
      </div>
    );
  }

  const inputClass =
    'w-full text-[16px] px-4 py-3 border border-[#e0e0e0] rounded-xl bg-white text-ms-body placeholder:text-[#bbb] outline-none focus:border-[#aaa] transition-colors';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <input
        type="text"
        name="organization"
        value={form.organization}
        onChange={handleChange}
        placeholder="기관명 (필수)"
        required
        className={inputClass}
      />
      <input
        type="text"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="담당자명 (필수)"
        required
        className={inputClass}
      />
      <input
        type="tel"
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="전화번호 (필수)"
        required
        className={inputClass}
      />
      <input
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="이메일 (선택)"
        className={inputClass}
      />
      <textarea
        name="message"
        value={form.message}
        onChange={handleChange}
        placeholder="궁금한 점을 자유롭게 남겨주세요 (선택)"
        rows={5}
        className={`${inputClass} resize-none`}
      />
      {error && (
        <p className="text-[14px]" style={{ color: '#D92D20' }} role="alert">
          전송에 실패했습니다. 잠시 후 다시 시도해주시거나 gaon@morspeak.com 으로 보내주세요.
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="text-[15px] font-semibold text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 self-start"
        style={{ background: 'rgba(0,122,255,0.85)' }}
      >
        {loading ? '제출 중...' : '제출하기'}
      </button>
    </form>
  );
}
