'use client';

import { useState } from 'react';

interface NewsletterFormProps {
  label?: string;
  placeholder?: string;
  successMessage?: string;
}

export default function NewsletterForm({
  label = '제품 소식과 업데이트를 받아보세요',
  placeholder = 'you@example.com',
  successMessage = '감사합니다! 소식을 보내드릴게요.',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to an email service (e.g., Resend, Mailchimp)
    setSubmitted(true);
  };

  return (
    <div>
      <p className="text-[12px] text-ms-muted mb-3" style={{ letterSpacing: '-0.3px' }}>
        {label}
      </p>
      {submitted ? (
        <p className="text-[14px] text-ms-secondary">{successMessage}</p>
      ) : (
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
            className="text-[14px] font-semibold text-white px-4 py-2 rounded-[10px] hover:opacity-80 transition-opacity"
            style={{
              background: 'rgb(204,204,204)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            &gt;
          </button>
        </form>
      )}
    </div>
  );
}
