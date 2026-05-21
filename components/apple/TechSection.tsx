'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BASE = 'https://www.apple.com/v/apple-vision-pro/k/images/overview/technology';
const VID24 = 'https://www.apple.com/105/media/us/apple-vision-pro/2024/6e1432b2-fe09-4113-a1af-f20987bcfeee/anim';

const sensorImages = [
  `${BASE}/features/sensors_off__cfzcmow4c3f6_large.jpg`,
  `${BASE}/features/sensors_video__b8xghearfs76_large.jpg`,
  `${BASE}/features/sensors_tracking__dssyfpe9tc66_large.jpg`,
  `${BASE}/features/sensors_mapping__3hn0pwmp7v6e_large.jpg`,
  `${BASE}/features/sensors_all__dp0a8e4y4u4i_large.jpg`,
];
const sensorLabels = ['꺼짐', '비디오', '추적', '매핑', '전체'];

function SensorSequence() {
  const [frame, setFrame] = useState(0);
  return (
    <div>
      <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', marginBottom: '16px' }}>
        <AnimatePresence mode="wait">
          <motion.img key={frame} src={sensorImages[frame]} alt={`센서 어레이 - ${sensorLabels[frame]}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sensorLabels.map((label, i) => (
            <button key={i} onClick={() => setFrame(i)} style={{ padding: '8px 16px', borderRadius: '980px', border: `1px solid ${i === frame ? '#1d1d1f' : '#d2d2d7'}`, background: i === frame ? '#1d1d1f' : 'transparent', color: i === frame ? '#fff' : '#1d1d1f', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setFrame(0)} style={{ padding: '8px 20px', borderRadius: '980px', border: '1px solid #d2d2d7', background: 'transparent', color: '#1d1d1f', fontSize: '13px', cursor: 'pointer' }}>
          ↺ 다시 보기
        </button>
      </div>
    </div>
  );
}

function EyeTrackingToggle() {
  const [on, setOn] = useState(false);
  return (
    <div style={{ cursor: 'pointer' }} onClick={() => setOn(v => !v)}>
      <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', marginBottom: '12px' }}>
        <AnimatePresence mode="wait">
          <motion.img key={on ? 'on' : 'off'}
            src={on ? `${BASE}/features/eye_tracking_on__ln11reqs6mi6_large.jpg` : `${BASE}/features/eye_tracking_off__fx6m2dj3mlqq_large.jpg`}
            alt={`눈 추적 ${on ? '활성화' : '비활성화'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
        </AnimatePresence>
        <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: '#fff', fontSize: '13px', padding: '6px 16px', borderRadius: '980px', whiteSpace: 'nowrap' }}>
          {on ? 'LED 및 적외선 카메라 활성화' : '눌러서 눈 추적 보기'}
        </div>
      </div>
    </div>
  );
}

export default function TechSection() {
  return (
    <section id="tech" style={{ background: '#fff', padding: '80px 0' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 22px' }}>
        <p style={{ fontSize: '17px', color: '#6e6e73', marginBottom: '8px' }}>기술</p>
        <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '8px', maxWidth: '700px' }}>
          보고, 듣고, 느낄 수 있는 혁신.
        </h2>
        <p style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, color: '#6e6e73', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '24px' }}>
          안팎으로 혁신하다.
        </p>
        <p style={{ fontSize: '19px', color: '#1d1d1f', lineHeight: 1.7, letterSpacing: '-0.01em', marginBottom: '80px', maxWidth: '700px' }}>
          Apple Vision Pro의 공간 경험은 오로지 Apple의 혁신적인 기술 덕분입니다. 각 눈에 4K TV보다 많은 픽셀로 시각 정보를 제공하는 디스플레이, 놀라운 공간 음향, 강력한 M5 칩을 탑재한 혁신적인 듀얼 칩 디자인, 정교한 여러 개의 카메라 및 센서까지. 이 모든 요소들이 모여 직접 눈으로 보기 전까지는 믿기 힘든, 전례 없는 경험을 선사합니다.
        </p>

        <div style={{ height: '1px', background: '#d2d2d7', marginBottom: '80px' }} />

        {/* 디스플레이 — scroll-driven video */}
        <div style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '20px', maxWidth: '600px' }}>
            4K TV보다 더 많은 픽셀을 각 눈에.
          </h3>
          <p style={{ fontSize: '17px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '680px', marginBottom: '32px' }}>
            자체 제작한 마이크로 OLED 디스플레이 시스템이 2,300만 개의 픽셀로 놀랍도록 뛰어난 해상도와 색상을 구현합니다. 특수 설계된 삼요소 렌즈가 당신이 바라보는 곳 전체를 끝없이 펼쳐진 디스플레이처럼 느껴지게 해주죠.
          </p>
          <video autoPlay muted loop playsInline style={{ width: '100%', borderRadius: '18px', display: 'block' }}>
            <source src={`${VID24}/displays/large.mp4`} type="video/mp4" />
            <img src={`${BASE}/displays/hero_base__bpxhq09r962u_large.jpg`} alt="마이크로 OLED 디스플레이" style={{ width: '100%', borderRadius: '18px' }} />
          </video>
        </div>

        <div style={{ height: '1px', background: '#d2d2d7', marginBottom: '80px' }} />

        {/* 공간 음향 */}
        <div style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '20px', maxWidth: '600px' }}>
            Apple 사상 가장 앞선 공간 음향 시스템.
          </h3>
          <p style={{ fontSize: '17px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '680px', marginBottom: '32px' }}>
            각 귀의 옆에 위치한 듀얼 드라이버 오디오 팟이 개인 맞춤형 사운드를 선사함과 동시에, 주변 환경의 소리도 들을 수 있게 해줍니다. 공간 음향은 마치 주변에서 직접 소리가 들리는 것처럼 느끼게 해주죠. 오디오 레이 트레이싱 기술은 방 안의 음향 특성을 분석해서 그 공간에 맞는 사운드를 들려줍니다.
          </p>
          <video autoPlay muted loop playsInline style={{ width: '100%', borderRadius: '18px', display: 'block' }}>
            <source src={`${VID24}/spatial-audio/large.mp4`} type="video/mp4" />
            <img src={`${BASE}/spatial_audio_startframe__dl2iakzba36u_large.jpg`} alt="공간 음향" style={{ width: '100%', borderRadius: '18px' }} />
          </video>
        </div>

        <div style={{ height: '1px', background: '#d2d2d7', marginBottom: '80px' }} />

        {/* 눈 추적 */}
        <div style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '20px', maxWidth: '600px' }}>
            빼어난 반응성의 정밀한 눈 추적.
          </h3>
          <p style={{ fontSize: '17px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '680px', marginBottom: '32px' }}>
            LED 및 적외선 카메라로 구성된 고성능 눈 추적 시스템이, 보이지 않는 광선 패턴을 각 눈에 비춥니다. 이 첨단 시스템은 초정밀 입력을 지원하기 때문에 눈으로 바라보는 것만으로 정확하게 원하는 요소를 선택할 수 있죠.
          </p>
          <EyeTrackingToggle />
        </div>

        <div style={{ height: '1px', background: '#d2d2d7', marginBottom: '80px' }} />

        {/* 센서 어레이 */}
        <div style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '20px', maxWidth: '600px' }}>
            정교한 센서 어레이.
          </h3>
          <p style={{ fontSize: '17px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '680px', marginBottom: '32px' }}>
            한 쌍의 고해상도 카메라가 디스플레이에 초당 10억 개 이상의 픽셀을 전송해 당신이 주변 환경을 또렷하게 볼 수 있게 해줍니다. 다양한 자세에서 취하는 손 제스처를 이해하는 동시에 정밀한 머리 및 손 추적 및 실시간 3D 매핑이 가능한 것도 이 시스템 덕분이죠.
          </p>
          <SensorSequence />
        </div>

        <div style={{ height: '1px', background: '#d2d2d7', marginBottom: '80px' }} />

        {/* M5 칩 */}
        <div>
          <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '20px', maxWidth: '600px' }}>
            혁신적인 듀얼 칩 성능. 이제 M5 칩으로 구동.
          </h3>
          <p style={{ fontSize: '17px', color: '#6e6e73', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '680px', marginBottom: '32px' }}>
            Apple Vision Pro는 새로운 M5 칩 덕분에 칩 성능의 거대한 도약을 이뤘습니다. M5 칩은 visionOS를 구동하고, 첨단 컴퓨터 비전 알고리즘을 실행하고, 뛰어난 화질의 그래픽을 구현하는 일을 동시에 해내죠. 그리고 R1 칩은 카메라와 센서, 마이크에 입력된 데이터 처리를 전담합니다. 12밀리초 이내로 디스플레이에 이미지를 전송하죠.
          </p>
          <img src={`${BASE}/features/sensors_chips__s805s5o3gkii_large.jpg`} alt="M5 및 R1 칩" style={{ width: '100%', borderRadius: '18px', marginBottom: '40px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2px', marginBottom: '40px' }}>
            {['최대 120Hz\n재생률 지원', '렌더링 시\n10% 더 많은 픽셀¹¹', '최대 3시간의\n동영상 재생 시간 제공¹'].map(stat => (
              <div key={stat} style={{ background: '#f5f5f7', padding: '32px 24px' }}>
                <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{stat}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {[
              { text: 'M5 칩은 Apple Vision Pro에 막강한 힘을 실어주어 역대 최고의 공간 경험을 선사합니다. 앱 및 위젯 로딩 시간이 더 빨라지고, AI 작업도 최대 2배 더 빨라지죠.¹²', img: `${BASE}/drawer/chip__wemzm828a76q_large.jpg` },
              { text: '특수 설계된 열 관리 시스템은 Apple Vision Pro 안으로 공기가 부드럽게 통하도록 하여, 환상적인 성능을 발휘하는 와중에도 온도와 소음을 낮게 유지해 줍니다.', img: `${BASE}/drawer/thermal__e2wndin6tdaq_large.jpg` },
              { text: '적외선 투광 조명기는 외부 센서와 연동하여 저조도 환경에서도 향상된 손 추적 성능을 선사하죠.', img: `${BASE}/drawer/ir__ced7gwl3l1te_large.jpg` },
            ].map((item, i) => (
              <div key={i} style={{ background: '#f5f5f7', borderRadius: '18px', overflow: 'hidden' }}>
                <img src={item.img} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover', height: '200px' }} />
                <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.7, padding: '24px' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
