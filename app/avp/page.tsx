import type { Metadata } from 'next';
import VisionProNav from '@/components/apple/VisionProNav';
import StickyTextReveal from '@/components/apple/StickyTextReveal';
import DesignGallery from '@/components/apple/DesignGallery';
import FullscreenVideoSection from '@/components/apple/FullscreenVideoSection';
import FeatureCarousel from '@/components/apple/FeatureCarousel';
import TechSection from '@/components/apple/TechSection';
import AppleFooter from '@/components/apple/AppleFooter';

export const metadata: Metadata = {
  title: 'Apple Vision Pro - Apple (KR)',
  description: '새로운 강력한 M5 칩과 편안한 듀얼 니트 밴드를 갖춘 Apple Vision Pro.',
};

const IMG = 'https://www.apple.com/v/apple-vision-pro/k/images/overview';
const VID25KR = 'https://www.apple.com/105/media/kr/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';
const VID25US = 'https://www.apple.com/105/media/us/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';
const VID24KR = 'https://www.apple.com/105/media/kr/apple-vision-pro/2024/6e1432b2-fe09-4113-a1af-f20987bcfeee/anim';

/* ── 카드 데이터 ─────────────────────────────────────────────────── */

const entertainmentCards = [
  { title: 'Apple Immersive Video', body: 'Apple Immersive Video는 \'공간 음향\'을 지원하는 180도 3D 8K 녹화 형식입니다. 그 현장 속에 있는 듯한 몰입감을 통해, 당신이 가본 적 없는 곳까지 실감 나게 경험할 수 있게 해주죠.', image: `${IMG}/experiences/entertainment/drawer/immersive_startframe__cnugrn0zk30i_large.jpg`, video: `${VID25US}/drawer-entertainment-immersive-video/large.mp4` },
  { title: '공간 갤러리 앱', body: '공간 갤러리 앱에서 몰입감 넘치는 경험에 흠뻑 빠져보세요. Apple이 지속적으로 엄선하는 공간 사진, 비디오, 파노라마 컬렉션을 즐길 수 있죠.', image: `${IMG}/experiences/entertainment/drawer/spatial_gallery_startframe__c2d5fzswvfu6_large.jpg`, video: `${VID25US}/drawer-entertainment-spatial-gallery/large.mp4` },
  { title: 'visionOS 게임', body: 'visionOS 게임은 당신의 주변 공간을 활용해 짜릿한 플레이 경험을 제공합니다. 최대 90Hz로 손 추적이 되기 때문에, 그 어느 때보다 매끄러운 반응성을 자랑하죠.³', image: `${IMG}/experiences/entertainment/drawer/gaming_startframe__gfsm177e89yu_large.jpg`, video: `${VID25US}/drawer-entertainment-apple-arcade/large.mp4` },
  { title: '멀티뷰', body: '스포츠 팬이라면 멀티뷰 기능을 활용해 Apple TV 앱에서 최대 다섯 개의 MLS Season Pass⁴와 \'불금엔 야구\'⁵ 경기를 동시에 시청할 수 있습니다.', image: `${IMG}/experiences/entertainment/drawer/multiview__esktpswafj42_large.jpg` },
  { title: '3D 영화', body: '놀라운 깊이감과 선명한 움직임으로 3D 영화를 즐길 수 있습니다.⁶ 화면의 경계를 넘어 그 어느 때보다 생생하게 펼쳐지는 스토리를 경험해 보세요.', image: `${IMG}/experiences/entertainment/drawer/3d_movies__0x5wo07626ae_large.jpg` },
  { title: 'Apple TV 및 스트리밍 서비스', body: 'Apple TV 및 기타 스트리밍 서비스에서 최애 영화와 TV 프로그램을 감상할 수 있습니다. 같은 공간의 친구들과 함께 콘텐츠를 즐길 수도 있죠.⁷', image: `${IMG}/experiences/entertainment/drawer/atv__q0pm6hbhy72a_large.jpg` },
  { title: '여행 모드', body: '여행 모드 덕분에 기차, 버스, 자동차 안 또는 9,000m 상공에서도 어떤 콘텐츠든 원활하게 시청할 수 있죠.', image: `${IMG}/experiences/entertainment/drawer/travel_mode__ecldu3pcb6gm_large.jpg` },
];

const productivityCards = [
  { title: 'Mac 가상 디스플레이', body: 'Mac 가상 디스플레이로 Mac을 무선으로 Apple Vision Pro 안으로 가져와, 울트라 와이드 화면으로 작업할 수 있습니다.⁹', image: `${IMG}/experiences/productivity/drawer/mac_startframe__ez7om6vgeis2_large.jpg`, video: `${VID25KR}/drawer-productivity-mac/large.mp4` },
  { title: '위젯', body: '\'사진\', \'시계\', \'음악\', \'캘린더\'와 같이 즐겨 찾는 정보와 앱을 당신이 딱 원하는 방식으로 공간에 배치할 수 있습니다.', image: `${IMG}/experiences/productivity/drawer/widgets_startframe__e5k95qxoevue_large.jpg`, video: `${VID25KR}/drawer-productivity-widgets/large.mp4` },
  { title: 'Apple Intelligence — 글쓰기 도구', body: '\'글쓰기 도구\'는 글을 교정하고 가장 적절한 어조와 표현을 찾을 수 있을 때까지 다양한 버전으로 재작성해 줍니다.⁸', link: { label: 'Apple Intelligence에 대해 더 알아보기', href: '/kr/apple-intelligence/' }, image: `${IMG}/experiences/productivity/drawer/apple_intelligence__btsvykyvfooi_large.jpg` },
  { title: 'Magic Keyboard 및 액세서리', body: 'Apple Vision Pro와 함께 Magic Keyboard, Magic Trackpad 및 기타 Bluetooth 액세서리를 사용할 수 있습니다.', image: `${IMG}/experiences/productivity/drawer/magic_keyboard__kes6sc8k5puq_large.jpg` },
  { title: '비즈니스 활용', body: 'Apple Vision Pro는 비즈니스 운영 방식을 새롭게 정의하고 있습니다. 지구 반대편의 팀과 협업하고, 프로토타입을 더 빠르게 반복 개선할 수 있습니다.', link: { label: 'Apple Vision Pro 비즈니스 활용에 대해 더 알아보기', href: '/kr/apple-vision-pro/enterprise/' }, image: `${IMG}/experiences/productivity/drawer/apple_at_work__cvknlevmdyy6_large.jpg` },
];

const photosCards = [
  { title: '공간 비디오 및 사진', body: '공간 비디오와 사진은 놀라운 깊이감으로 그 순간에 다시 빠져들게 해줍니다.', image: `${IMG}/experiences/photos-videos/drawer/spatial_photos_startframe__cgqyf9bm8c2u_large.jpg`, video: `${VID24KR}/drawer-photos-videos-spatial-photos/large.mp4` },
  { title: '2D 사진을 공간 장면으로 변환', body: '사진 보관함에 있는 2D 사진을 공간 장면으로 즉시 변환해 자연스러운 깊이감과 공간감으로 추억을 더욱 생생하게 되새길 수 있게 해주죠.', image: `${IMG}/experiences/photos-videos/drawer/2d_photo_startframe__efc1oeep47cm_large.jpg`, video: `${VID25US}/drawer-photos-videos-transform-2d/large.mp4` },
  { title: '360도 및 광시야각 동영상', body: 'GoPro, Insta360, Canon 액션 카메라로 촬영한 360°, 180° 동영상을 추가 변환 없이 원본 그대로 재생할 수 있습니다.', image: `${IMG}/experiences/photos-videos/drawer/fov_startframe__eg96rg9zf4qe_large.jpg`, video: `${VID25US}/drawer-photos-videos-fov/large.mp4` },
  { title: '상단 버튼', body: '상단 버튼으로 공간 비디오와 사진을 더욱 빠르고 쉽게 촬영할 수 있습니다.', image: `${IMG}/experiences/photos-videos/drawer/top_button__btvsc4mfgcb6_large.jpg` },
  { title: 'iPhone으로 공간 사진 및 비디오 촬영', body: 'iPhone으로 공간 사진과 비디오를 촬영한 다음, Apple Vision Pro에서 실감 나게 되살릴 수도 있습니다.¹⁰', image: `${IMG}/experiences/photos-videos/drawer/spatial_videos__zzd227ws8lu6_large.jpg` },
];

const connectionCards = [
  { title: 'Persona', body: '당신의 Persona는 놀라운 사실감과 표현력을 통해 다른 사람들이 당신을 역동적이고 자연스러운 모습으로 볼 수 있게 해줍니다.', image: `${IMG}/experiences/connection/drawer/persona_startframe__bryzu03w563m_large.jpg`, video: `${VID25US}/drawer-connection-persona/large.mp4` },
  { title: 'FaceTime', body: 'FaceTime 사용 시 각 참가자가 크기 조절 가능한 타일 안에 표시됩니다. 공간 음향이 각 타일의 위치에 맞게 음성 방향을 설정해 더욱 자연스럽게 대화할 수 있죠.', image: `${IMG}/experiences/connection/drawer/facetime__cn2l222r4mc2_large.jpg` },
  { title: 'SharePlay', body: 'SharePlay로 가족이나 친구들과 TV 프로그램, 영화, 음악을 함께 감상하고, 멀티플레이어 게임도 즐길 수 있습니다.', image: `${IMG}/experiences/connection/drawer/shareplay__fqxq1g3bbfmi_large.jpg` },
  { title: 'Image Playground', body: 'Image Playground를 활용해 당신만의 개성을 시각적으로 표현해 보세요. 설명이나 친구의 사진을 바탕으로 몇 초 만에 재미있고 독창적인 이미지를 만들 수 있습니다.', image: `${IMG}/experiences/connection/drawer/image_playground__gauw0i2iwwy2_large.jpg` },
];

const appsCards = [
  { title: '친숙한 앱', body: 'Safari, \'사진\', \'음악\' 및 \'메시지\' 등이 변화된 모습으로 당신의 공간에 존재하죠. iCloud 덕분에 당신의 콘텐츠가 자동으로 iPhone, iPad, Mac과 동기화됩니다.', image: `${IMG}/experiences/apps/drawer/familiar_apps_startframe__bd4vu9ussfv6_large.jpg`, video: `${VID25KR}/drawer-apps-familiar-apps/large.mp4` },
  { title: 'App Store', body: 'Apple Vision Pro용 App Store에서는 visionOS를 위해 설계된 혁신적인 앱들을 만나볼 수 있습니다.', link: { label: 'Apple Vision Pro용 앱 살펴보기', href: 'https://apps.apple.com/kr/vision' }, image: `${IMG}/experiences/apps/drawer/app_store__ge30nsef8xui_large.jpg` },
  { title: '마음 챙기기', body: '앱을 확장해 당신의 공간을 가득 채울 수 있습니다. 마음 챙기기 세션 중에 자신만의 고요한 순간을 만들어 낼 수 있죠.', image: `${IMG}/experiences/apps/drawer/mindfulness_startframe__c070kjbtkqky_large.jpg` },
];

const visionOSCards = [
  { title: '앱 배치', body: 'visionOS에서는 앱이 디스플레이의 제약을 뛰어넘어 당신 주변의 공간을 채울 수 있습니다. 방 안의 조명에 반응하고 그림자도 드리웁니다.', image: `${IMG}/visionos/drawer/apps__fx9t3jilcqqi_large.jpg` },
  { title: '환경', body: '환경은 마법처럼 당신의 주변 공간을 요세미티, 보라보라, 목성같이 아름다운 360° 풍경으로 전환합니다.', image: `${IMG}/visionos/drawer/environments__dr1soqwwcgq6_large.jpg` },
  { title: 'EyeSight', body: 'EyeSight는 당신이 앱을 사용 중이거나 어떤 경험에 완전히 몰입하고 있다는 걸 근처의 사람들이 알 수 있게 해줍니다.', image: `${IMG}/visionos/drawer/eyesight__fpk4mmfeztme_large.jpg` },
  { title: '방문 사용자 기능', body: '방문 사용자 기능은 다른 사람들에게 Apple Vision Pro 접근 권한을 주고, iPhone이나 iPad에서 \'뷰 미러링\'으로 안내할 수 있게 해줍니다.', image: `${IMG}/visionos/drawer/guest_user__b4tnut5kxieu_large.jpg` },
  { title: '눈 제어', body: '앱, 버튼, 텍스트 필드를 바라보는 것만으로 visionOS를 탐색할 수 있습니다.', image: `${IMG}/visionos/drawer/eyes_startframe__d4bpz6kcq7iq_large.jpg`, video: `${VID25KR}/visionos/large.mp4` },
  { title: '손 제어', body: '손가락 맞대기로 탭해서 원하는 요소를 선택하고, 가볍게 손짓해서 스크롤할 수 있습니다.', image: `${IMG}/visionos/drawer/hands_startframe__d456zaj3uje6_large.jpg`, video: `${VID25KR}/drawer-visionos-tap/large.mp4` },
  { title: '음성 제어', body: '간편히 검색 필드의 마이크 버튼을 바라보기만 하면, 음성으로 텍스트를 받아쓸 수 있습니다.', image: `${IMG}/visionos/drawer/voice_startframe__c0a4vcs48m0y_large.jpg` },
  { title: 'Siri', body: 'Siri를 사용해, 앱을 열고 닫거나 미디어를 재생하는 등의 동작도 빠르게 수행할 수 있죠.', image: `${IMG}/visionos/drawer/siri__bb6p4jhfelki_large.jpg` },
];

const valuesCards = [
  { title: 'Optic ID', body: 'Optic ID 데이터는 안전하게 보호되고 암호화되며, 절대 기기 밖으로 유출되지 않습니다. 오직 Secure Enclave 프로세서만이 그 데이터에 접근할 수 있죠.', image: `${IMG}/values/drawer/optic_startframe__bgyqs4wyl82q_large.jpg` },
  { title: '카메라 및 센서 데이터', body: '카메라 및 센서 데이터는 시스템 수준에서 처리되기 때문에 개별 앱들이 당신의 주변 환경을 직접 확인하지 않고도 공간 경험을 제공할 수 있습니다.', image: `${IMG}/values/drawer/camera_sensor_data__ed5zeclvc7qu_large.jpg` },
  { title: '눈 입력', body: '눈 입력은 Apple, 서드파티 앱 및 웹사이트와 공유되지 않습니다. 두 손가락을 맞댈 때 오직 마지막으로 선택한 사항만 전송되죠.', image: `${IMG}/values/drawer/eye_input_startframe__csxoocg1wu82_large.jpg` },
  { title: '손쉬운 사용', body: '\'스마트 색상 반전\', \'투명도 줄이기\' 지원, \'인공와우\' 지원, \'실시간 자막\'¹³은 물론 \'실시간 인지\'와 같은 기능을 기본 탑재하고 있습니다.', image: `${IMG}/values/drawer/accessibility__fkae0052zl26_large.jpg` },
  { title: '환경 친화성', body: 'Apple Vision Pro의 프레임과 배터리 외장에는 100% 재활용 알루미늄이 사용되었습니다.', link: { label: 'Apple과 환경', href: '#' }, image: `${IMG}/values/drawer/recycled__yesh19ceo6au_large.jpg` },
];

const footnotes = [
  '테스트는 2025년 8월과 9월 Apple에서 시제품 및 소프트웨어를 사용해 진행했습니다. 실제 결과는 다를 수 있습니다.',
  '유효한 처방이 필요합니다. 시력 교정 액세서리는 별도로 판매됩니다.',
  '공간 게임 컨트롤러 ©2022 Sony Interactive Entertainment Inc.',
  'MLS Season Pass 이용을 위해서는 구독이 필요합니다.',
  '\'불금엔 야구\'는 구독 후 Apple TV에서 시청할 수 있습니다.',
  'Apple Vision Pro용 3D 영화는 Apple Vision Pro 기기의 Apple TV 앱에서만 시청할 수 있습니다.',
  'Apple Vision Pro 경험을 공유하려면 동일한 Wi-Fi에 연결되어 있어야 합니다.',
  'Apple Intelligence는 베타로 사용할 수 있습니다. 일부 기능은 한국어로 제공되지 않습니다.',
  '울트라 와이드 Mac 가상 디스플레이 기능을 사용하려면 Mac 컴퓨터가 필요합니다.',
  '지원되는 iPhone 모델 목록은 support.apple.com을 참고하십시오.',
  'Apple Vision Pro(M2 모델)와 비교한 결과입니다.',
  '테스트는 2025년 9월에 진행했습니다. 최대 2배 더 빠른 AI 성능.',
  '\'실시간 자막\'을 사용할 수 없는 언어나 지역도 있습니다.',
];

/* ── 페이지 ──────────────────────────────────────────────────────── */

export default function AvpPage() {
  const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  return (
    <>
      <div style={{ background: '#fff', fontFamily: font }}>
        <VisionProNav />

        {/* ── 히어로 ────────────────────────────────────────────
            AppleNav(44px) + VisionProNav(52px) = 96px 차감하여 뷰포트 하단까지 정확히 맞춤 */}
        <section
          id="overview"
          style={{ position: 'relative', height: 'calc(100vh - 52px)', minHeight: '500px', background: '#f5f5f7', overflow: 'hidden' }}
        >
          <img
            src={`${IMG}/hero/hero__cvgr5aj1ttsi_large.jpg`}
            alt="Apple Vision Pro 착용 모습"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
          {/* 하단 텍스트 + 버튼 */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxWidth: '980px', margin: '0 auto', padding: '0 22px 44px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <svg width="22" height="27" viewBox="0 0 814 1000" fill="#1d1d1f">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 134.4-317.3 266.8-317.3 99.8 0 165.6 67.6 239.8 67.6 70.9 0 144.7-72.5 248.4-72.5zm-194.3-87.9c32.1-36.7 55.9-88.4 55.9-140.1 0-7.1-.6-14.3-1.9-20.1-53.3 2-116.8 35.4-154.6 77.6-28.2 31.6-55.2 83.3-55.2 135.7 0 7.7 1.3 15.5 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 47.8 0 109.7-31.9 140.3-72.5z"/>
                </svg>
                <span style={{ fontSize: '36px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  Vision Pro
                </span>
              </div>
              <p style={{ fontSize: '19px', color: '#1d1d1f', letterSpacing: '-0.015em', lineHeight: 1.4 }}>
                새롭고 강력한 M5 칩. 여기에 편안한 듀얼 니트 밴드까지.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <a href="/kr/retail/instore-shopping-session/apple-vision-pro" style={{
                fontSize: '15px', color: '#1d1d1f', textDecoration: 'none',
                border: '1.5px solid rgba(0,0,0,0.3)', padding: '10px 22px', borderRadius: '980px',
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
                fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                체험 예약하기
              </a>
              <a href="/kr/shop/goto/buy_vision/apple_vision_pro" style={{
                fontSize: '15px', color: '#fff', textDecoration: 'none',
                background: 'rgba(0,0,0,0.75)', padding: '10px 22px', borderRadius: '980px',
                backdropFilter: 'blur(12px)', fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                구입하기
              </a>
            </div>
          </div>
        </section>

        {/* ── 스크롤 텍스트 리빌 ──────────────────────────────── */}
        <StickyTextReveal />

        {/* ── 디자인 비디오 ───────────────────────────────────── */}
        <section style={{ background: '#000', overflow: 'hidden', lineHeight: 0 }}>
          <video autoPlay muted loop playsInline style={{ width: '100%', maxHeight: '85vh', objectFit: 'cover', display: 'block' }}>
            <source src={`${VID25KR}/foundation/large.mp4`} type="video/mp4" />
          </video>
        </section>

        {/* ── 보다 자세히 들여다보기 (수평 카드 갤러리) ───────── */}
        <DesignGallery />

        {/* ── 엔터테인먼트 ─────────────────────────────────────
            풀스크린 영상 + 텍스트 오버레이, 그 다음에 카드 */}
        <FullscreenVideoSection
          id="entertainment"
          eyebrow="엔터테인먼트"
          headline="궁극의 극장 경험을 언제 어디서나."
          heroVideo={`${VID25US}/experience-entertainment/large.mp4`}
          heroImage={`${IMG}/experiences/entertainment/entertainment_a_startframe__eqosxjbd3xua_large.jpg`}
          citation="구독 후 Apple TV에서 '울프스' - Wolfs 시청하기"
          body="각 눈에 4K TV보다 많은 픽셀로 시각 정보가 제공되기 때문에 그 어떤 공간이든 당신만의 극장으로 바꿀 수 있습니다. '공간 음향'과 함께 압도적인 몰입감을 경험하고, 영화, TV 프로그램, 게임을 커다란 화면으로 확장해 즐길 수 있습니다. 거실 소파에서든, 긴 비행 중이든 어디서나 놀라운 콘텐츠를 누릴 수 있죠."
          cards={entertainmentCards}
        />

        {/* ── 업무 역량 ─────────────────────────────────────── */}
        <FullscreenVideoSection
          eyebrow="업무 역량"
          headline="무한하게 펼쳐내는 작업 공간."
          heroVideo={`${VID25KR}/productivity_a/large.mp4`}
          heroImage={`${IMG}/experiences/productivity/productivity_a_startframe__b78h8iwbcw76_large.jpg`}
          body="Apple Vision Pro는 당신이 최고의 작업을 해낼 수 있도록 무한한 공간을 제공합니다. Mac의 워크플로를 거대한 화면에 펼쳐 확인하는 것은 물론 여러 앱을 자유롭게 오가며 멀티태스킹하고, 원하는 방식으로 정리할 수도 있습니다.⁸"
          link={{ label: 'Apple Intelligence에 대해 더 알아보기', href: '/kr/apple-intelligence/' }}
          cards={productivityCards}
        />

        {/* ── 사진 및 비디오 ────────────────────────────────── */}
        <FullscreenVideoSection
          eyebrow="사진 및 비디오"
          headline="아름다운 순간, 다시 그 한가운데로."
          heroVideo={`${VID25KR}/experience-photos-videos/large.mp4`}
          heroImage={`${IMG}/experiences/photos-videos/photos_videos_startframe__dnwwa2e1qys2_large.jpg`}
          body="Apple Vision Pro를 사용하면 마법 같은 공간 사진과 비디오를 3D로 담아, 그 소중한 순간을 언제든 다시 실감 나게 되살릴 수 있습니다. 탭 한 번으로 2D 사진을 공간 장면으로 변환해 당신의 소중한 추억을 생생하게 만들 수도 있죠."
          cards={photosCards}
        />

        {/* ── 소통 ─────────────────────────────────────────── */}
        <FullscreenVideoSection
          eyebrow="소통"
          headline="양질의 시간 그리고 공간을 함께하다."
          heroVideo={`${VID25US}/experience-connection/large.mp4`}
          heroImage={`${IMG}/experiences/connection/connection_startframe__dk2ju081ayqa_large.jpg`}
          body="어디에서든 그 어느 때보다 생생한 방식으로 협업하고 소통할 수 있습니다. 다른 사람들과 FaceTime 통화를 할 때 상대방을 실물 크기의 비디오 타일로 볼 수 있고, 당신의 Persona를 사용하면 동료나 친구들, 또는 가족이 바로 앞에 있는 듯한 느낌을 받을 수도 있답니다."
          cards={connectionCards}
        />

        {/* ── 앱 ───────────────────────────────────────────── */}
        <FullscreenVideoSection
          eyebrow="앱"
          headline="좋아하는 일을 완전히 새로운 방식으로."
          heroVideo={`${VID25KR}/experience-apps/large.mp4`}
          heroImage={`${IMG}/experiences/apps/apps_startframe__fgskz7opptiu_large.jpg`}
          body="Safari 내 브라우징부터 '메시지' 앱에서의 대화까지, Apple Vision Pro는 당신이 자주 사용하는 앱의 경험을 한층 넓혀 모든 것에 경이로움을 더해줍니다. App Store에서는 감탄을 자아내는 더 많은 Apple Vision Pro용 공간 앱을 만나볼 수 있으며, 그 숫자는 계속 늘고 있죠."
          link={{ label: 'App Store 방문하기', href: 'https://apps.apple.com/kr/vision' }}
          cards={appsCards}
        />

        {/* ── visionOS ─────────────────────────────────────── */}
        <FullscreenVideoSection
          id="visionos"
          eyebrow="visionOS"
          headline="공간 컴퓨팅을 위해 디자인된 운영체제."
          heroVideo={`${VID24KR}/visionos-a/large.mp4`}
          heroImage={`${IMG}/visionos/visionos_a_startframe__fp1z3eff98qe_large.jpg`}
          body="macOS, iOS 및 iPadOS의 토대를 기반으로 설계된 visionOS는 눈, 손, 음성을 사용해 자연스럽게 다룰 수 있는 강력한 공간 경험을 구현합니다. visionOS 26와 함께라면 Apple Vision Pro를 사용해 감상하고, 일하고, 창작하는 것은 물론 소통할 수 있는 더욱 놀라운 방법을 발견할 수 있죠."
          link={{ label: 'visionOS 26에 대해 더 알아보기', href: '/kr/os/visionos/' }}
          cards={visionOSCards}
        />

        {/* ── 기술 ─────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #d2d2d7' }}>
          <TechSection />
        </div>

        {/* ── 가치관 ───────────────────────────────────────── */}
        <section style={{ background: '#fff', padding: '80px 0', borderTop: '1px solid #d2d2d7' }}>
          <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '48px', padding: '0 22px' }}>
            <p style={{ fontSize: '17px', color: '#6e6e73', marginBottom: '8px' }}>가치관</p>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em', lineHeight: 1.1, marginBottom: '8px', maxWidth: '700px' }}>
              더 나은 세상을 위한 설계.
            </h2>
            <p style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, color: '#6e6e73', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '24px' }}>
              우리의 가치관이 곧 우리의 지침.
            </p>
            <p style={{ fontSize: '19px', color: '#1d1d1f', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '700px' }}>
              Apple Vision Pro는 당신의 개인정보를 보호하고 당신의 데이터를 당신이 직접 제어할 수 있도록 설계되었습니다. 기본 탑재된 손쉬운 사용 기능은 당신에게 가장 편한 방식대로 기기를 다룰 수 있게 설계되었죠.
            </p>
          </div>
          <FeatureCarousel cards={valuesCards} />
        </section>

        {/* ── 액세서리 ─────────────────────────────────────── */}
        <section style={{ background: '#fff', padding: '80px 22px', borderTop: '1px solid #d2d2d7' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.022em', marginBottom: '32px', lineHeight: 1.1 }}>
              Apple Vision Pro용 액세서리 살펴보기.
            </h2>
            <img src={`${IMG}/routers/accessories__et6yc9y3xvu6_large.jpg`} alt="Apple Vision Pro 액세서리" style={{ width: '100%', borderRadius: '18px', display: 'block', marginBottom: '24px' }} />
            <a href="/kr/shop/goto/vision/accessories" style={{ display: 'inline-block', fontSize: '17px', color: '#fff', textDecoration: 'none', background: '#0071e3', padding: '12px 24px', borderRadius: '980px' }}>
              쇼핑하기
            </a>
          </div>
        </section>

        {/* ── 개발자 ───────────────────────────────────────── */}
        <section style={{ background: '#fff', padding: '80px 22px', borderTop: '1px solid #d2d2d7' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.022em', marginBottom: '24px', lineHeight: 1.2, maxWidth: '700px' }}>
              새롭고 흥미진진한 플랫폼. 개발자에게 펼쳐지는 새로운 기회의 세계.
            </h2>
            <img src={`${IMG}/routers/developers__bxrd1uafspsi_large.png`} alt="visionOS 개발" style={{ width: '100%', borderRadius: '18px', display: 'block', marginBottom: '24px' }} />
            <p style={{ fontSize: '19px', color: '#1d1d1f', lineHeight: 1.7, letterSpacing: '-0.01em', maxWidth: '700px', marginBottom: '16px' }}>
              개발자들이 Apple Vision Pro용으로 무엇이든 고안해서 만들 수 있는 기회가 무궁무진하게 펼쳐져 있습니다. Xcode, SwiftUI, RealityKit, ARKit과 같은 익숙한 도구 및 프레임워크와 더불어 Unity 지원 등, 개발자들이 놀라운 공간 경험을 구현하는 데 필요한 모든 게 마련돼 있죠.
            </p>
            <a href="https://developer.apple.com/kr/visionos/" style={{ fontSize: '19px', color: '#0066cc', textDecoration: 'none' }}>
              visionOS용 앱 개발에 대해 더 알아보기 ›
            </a>
          </div>
        </section>

        {/* ── 각주 ─────────────────────────────────────────── */}
        <section style={{ background: '#fff', borderTop: '1px solid #d2d2d7', padding: '40px 22px' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <p style={{ fontSize: '12px', color: '#6e6e73', lineHeight: 1.7, marginBottom: '16px' }}>
              기능은 변경될 수 있습니다. 일부 기능, 애플리케이션 및 서비스를 이용할 수 없는 국가나 언어도 있으며, 호환되는 하드웨어 및 소프트웨어가 필요할 수 있습니다.
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {footnotes.map((note, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#6e6e73', lineHeight: 1.6 }}>{note}</li>
              ))}
            </ol>
          </div>
        </section>

        <AppleFooter />
      </div>
    </>
  );
}
