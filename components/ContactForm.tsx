'use client';

import { useState } from 'react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Connect to backend or email service
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
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
