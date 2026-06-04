import type { Metadata } from 'next';
import VisionProNav from '@/components/apple/VisionProNav';
import StickyTextReveal from '@/components/apple/StickyTextReveal';
import DesignGallery from '@/components/apple/DesignGallery';
import FullscreenVideoSection from '@/components/apple/FullscreenVideoSection';
import FeatureCarousel from '@/components/apple/FeatureCarousel';
import TechSection from '@/components/apple/TechSection';
import AppleFooter from '@/components/apple/AppleFooter';

export const metadata: Metadata = {
  title: 'Morspeak',
  description: '몸은 멈춰도, 일상은 멈추지 않도록. 환우를 위한 의사소통 솔루션.',
};

const IMG = 'https://www.apple.com/v/apple-vision-pro/k/images/overview';
const VID25KR = 'https://www.apple.com/105/media/kr/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';
const VID25US = 'https://www.apple.com/105/media/us/apple-vision-pro/2025/fda8750c-030b-40f2-a0f7-60ba2db6b547/anim';
const VID24KR = 'https://www.apple.com/105/media/kr/apple-vision-pro/2024/6e1432b2-fe09-4113-a1af-f20987bcfeee/anim';

/* ── 카드 데이터 ─────────────────────────────────────────────────── */

const entertainmentCards = [
  { title: '시선 입력', body: '눈의 움직임만으로 화면을 선택하고 명령을 입력할 수 있습니다. 손을 쓰기 어려운 상황에서도 자유롭게 소통하세요.', image: `${IMG}/experiences/entertainment/drawer/immersive_startframe__cnugrn0zk30i_large.jpg` },
  { title: '음성 인식', body: '말하는 것만으로 메시지를 작성하고 전송할 수 있습니다. 다양한 억양과 발음도 정확하게 인식합니다.', image: `${IMG}/experiences/entertainment/drawer/spatial_gallery_startframe__c2d5fzswvfu6_large.jpg` },
  { title: '기호 입력', body: '간단한 기호 조합으로 자주 쓰는 문장을 빠르게 입력하세요. 의료 현장에 최적화된 단어 세트를 기본 제공합니다.', image: `${IMG}/experiences/entertainment/drawer/gaming_startframe__gfsm177e89yu_large.jpg` },
  { title: '다국어 지원', body: '한국어를 포함한 여러 언어로 소통할 수 있습니다. 외국인 의료진과의 대화도 막힘 없이 이어가세요.', image: `${IMG}/experiences/entertainment/drawer/multiview__esktpswafj42_large.jpg` },
  { title: '즐겨찾기 문장', body: '자주 사용하는 문장을 미리 저장해두고 한 번의 선택으로 빠르게 전달하세요.', image: `${IMG}/experiences/entertainment/drawer/3d_movies__0x5wo07626ae_large.jpg` },
  { title: '실시간 번역', body: '입력한 내용을 상대방의 언어로 즉시 번역해 화면에 표시합니다. 언어 장벽 없는 진료 환경을 만들어갑니다.', image: `${IMG}/experiences/entertainment/drawer/atv__q0pm6hbhy72a_large.jpg` },
  { title: '대화 이력', body: '주고받은 대화 내용을 저장하고 다시 불러볼 수 있습니다. 중요한 내용은 별표로 표시해 두세요.', image: `${IMG}/experiences/entertainment/drawer/travel_mode__ecldu3pcb6gm_large.jpg` },
];

const productivityCards = [
  { title: '조명 제어', body: '병실 조명의 밝기와 색온도를 눈 움직임만으로 조절할 수 있습니다. 취침 시 불을 끄거나 독서등을 켜는 것도 혼자 할 수 있습니다.', image: `${IMG}/experiences/productivity/drawer/mac_startframe__ez7om6vgeis2_large.jpg` },
  { title: 'TV 및 미디어', body: '리모컨 없이 TV 채널, 볼륨, 재생을 제어합니다. 좋아하는 콘텐츠를 원하는 시간에 즐기세요.', image: `${IMG}/experiences/productivity/drawer/widgets_startframe__e5k95qxoevue_large.jpg` },
  { title: '침대 및 전동 기기', body: '전동 침대의 각도와 높이를 섬세하게 조절하세요. 편안한 자세를 직접 찾아갈 수 있습니다.', image: `${IMG}/experiences/productivity/drawer/apple_intelligence__btsvykyvfooi_large.jpg` },
  { title: '블라인드 및 커튼', body: '햇빛 조절이 필요할 때 블라인드나 커튼을 직접 열고 닫을 수 있습니다. 더 이상 도움을 기다릴 필요 없습니다.', image: `${IMG}/experiences/productivity/drawer/magic_keyboard__kes6sc8k5puq_large.jpg` },
  { title: '스마트 기기 연동', body: '병실 내 다양한 스마트 기기들을 하나의 화면에서 통합 제어합니다. 설정해둔 프리셋으로 자주 쓰는 환경을 즉시 불러오세요.', image: `${IMG}/experiences/productivity/drawer/apple_at_work__cvknlevmdyy6_large.jpg` },
];

const photosCards = [
  { title: '간호사 호출', body: '한 번의 선택으로 담당 간호사를 즉시 호출할 수 있습니다. 호출 상태와 예상 도착 시간이 화면에 표시됩니다.', image: `${IMG}/experiences/photos-videos/drawer/spatial_photos_startframe__cgqyf9bm8c2u_large.jpg` },
  { title: '긴급 알림', body: '위급 상황 시 의료진에게 즉각적인 긴급 알림을 전송합니다. 알림은 병동 전체 스테이션에 동시에 전달됩니다.', image: `${IMG}/experiences/photos-videos/drawer/2d_photo_startframe__efc1oeep47cm_large.jpg` },
  { title: '보호자 연락', body: '가족이나 보호자에게 현재 상태나 메시지를 간편하게 전달할 수 있습니다. 미리 등록된 연락처로 바로 연결됩니다.', image: `${IMG}/experiences/photos-videos/drawer/fov_startframe__eg96rg9zf4qe_large.jpg` },
  { title: '예약 호출', body: '투약 시간, 검사 일정 등을 미리 설정해두면 정해진 시간에 자동으로 알림을 보냅니다.', image: `${IMG}/experiences/photos-videos/drawer/top_button__btvsc4mfgcb6_large.jpg` },
  { title: '호출 이력', body: '이전 호출 내역과 응답 시간을 확인할 수 있습니다. 반복적인 요청은 즐겨찾기로 등록해 더욱 빠르게 사용하세요.', image: `${IMG}/experiences/photos-videos/drawer/spatial_videos__zzd227ws8lu6_large.jpg` },
];

const connectionCards = [
  { title: '화상 통화', body: '가족, 친구, 의료진과 언제든 얼굴을 보며 대화할 수 있습니다. 선명한 화질과 안정적인 연결로 멀리 있어도 가깝게 느껴집니다.', image: `${IMG}/experiences/connection/drawer/persona_startframe__bryzu03w563m_large.jpg` },
  { title: '문자 메시지', body: '짧은 메시지를 주고받으며 일상적인 소통을 이어가세요. 가족의 안부 메시지를 받는 것만으로도 큰 힘이 됩니다.', image: `${IMG}/experiences/connection/drawer/facetime__cn2l222r4mc2_large.jpg` },
  { title: '함께 콘텐츠 즐기기', body: '멀리 있는 가족과 같은 영상을 동시에 시청할 수 있습니다. 혼자가 아닌, 함께하는 시간을 만들어 드립니다.', image: `${IMG}/experiences/connection/drawer/shareplay__fqxq1g3bbfmi_large.jpg` },
  { title: '소셜 미디어 연결', body: '일상의 소소한 순간을 사진이나 글로 공유하세요. 사람들과의 연결을 유지하는 것이 회복에 도움이 됩니다.', image: `${IMG}/experiences/connection/drawer/image_playground__gauw0i2iwwy2_large.jpg` },
];

const appsCards = [
  { title: '엔터테인먼트', body: '유튜브, OTT 서비스, 음악 스트리밍까지 좋아하는 콘텐츠를 즐기며 입원 생활을 보다 편안하게 만들어 드립니다.', image: `${IMG}/experiences/apps/drawer/familiar_apps_startframe__bd4vu9ussfv6_large.jpg` },
  { title: '전자책 및 독서', body: '수천 권의 책과 잡지를 손 안에서 즐기세요. 글자 크기와 배경 색상을 조절해 눈에 편안한 독서 환경을 만들 수 있습니다.', image: `${IMG}/experiences/apps/drawer/app_store__ge30nsef8xui_large.jpg` },
  { title: '명상 및 휴식', body: '호흡 가이드, 자연 소리, 마음 챙기기 프로그램으로 편안한 휴식을 취하세요. 정신적 안정이 빠른 회복을 돕습니다.', image: `${IMG}/experiences/apps/drawer/mindfulness_startframe__c070kjbtkqky_large.jpg` },
];

const visionOSCards = [
  { title: '시선으로 선택', body: '원하는 항목을 바라보는 것만으로 선택이 완료됩니다. 손동작이 어려운 상황에서도 눈빛 하나로 모든 기능을 사용할 수 있습니다.', image: `${IMG}/visionos/drawer/apps__fx9t3jilcqqi_large.jpg` },
  { title: '미세 움직임 감지', body: '아주 작은 신체 움직임도 정확하게 인식합니다. 손가락 하나, 고개 끄덕임만으로도 기기를 조작할 수 있습니다.', image: `${IMG}/visionos/drawer/environments__dr1soqwwcgq6_large.jpg` },
  { title: '보조 기기 연동', body: '스위치 액세스, 조이스틱 등 다양한 보조 입력 기기와 연결해 사용할 수 있습니다. 기존에 쓰던 기기를 그대로 활용하세요.', image: `${IMG}/visionos/drawer/eyesight__fpk4mmfeztme_large.jpg` },
  { title: '맞춤 설정', body: '사용자의 신체 상태와 능력에 맞게 인터페이스를 세밀하게 조정할 수 있습니다. 가장 편한 방식으로 사용하세요.', image: `${IMG}/visionos/drawer/guest_user__b4tnut5kxieu_large.jpg` },
  { title: '눈 제어', body: '화면의 어디를 바라보는지 추적해 정확한 지점을 선택합니다. 보정 기능으로 개인별 시선 특성을 학습합니다.', image: `${IMG}/visionos/drawer/eyes_startframe__d4bpz6kcq7iq_large.jpg` },
  { title: '손 제어', body: '손가락 끝을 맞대거나 손바닥을 들어올리는 간단한 동작으로 기기를 제어합니다. 침대 위에 누운 상태에서도 편리하게 사용할 수 있습니다.', image: `${IMG}/visionos/drawer/hands_startframe__d456zaj3uje6_large.jpg` },
  { title: '음성 명령', body: '"불 꺼줘", "간호사 불러줘" 같은 자연스러운 말투로 기기를 제어하세요. 별도의 학습 없이 바로 사용할 수 있습니다.', image: `${IMG}/visionos/drawer/voice_startframe__c0a4vcs48m0y_large.jpg` },
  { title: '호흡 제어', body: '호흡 패턴을 이용해 선택과 실행을 조작하는 방식도 지원합니다. 신체 움직임이 극히 제한된 경우에도 독립적으로 기기를 사용할 수 있습니다.', image: `${IMG}/visionos/drawer/siri__bb6p4jhfelki_large.jpg` },
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

export default function HomePage() {
  const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  return (
    <>
      <div style={{ background: '#fff', fontFamily: font }}>
        <VisionProNav />

        <section
          id="overview"
          style={{ position: 'relative', height: 'calc(100vh - 52px)', minHeight: '500px', background: '#f5f5f7', overflow: 'hidden' }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        </section>

        <StickyTextReveal />

        <FullscreenVideoSection
          id="entertainment"
          heroVideo="/video-entertainment.mp4"
          citation="의사소통"
          body="각 눈에 4K TV보다 많은 픽셀로 시각 정보가 제공되기 때문에 그 어떤 공간이든 당신만의 극장으로 바꿀 수 있습니다. '공간 음향'과 함께 압도적인 몰입감을 경험하고, 영화, TV 프로그램, 게임을 커다란 화면으로 확장해 즐길 수 있습니다. 거실 소파에서든, 긴 비행 중이든 어디서나 놀라운 콘텐츠를 누릴 수 있죠."
          cards={entertainmentCards}
        />

        <FullscreenVideoSection
          heroVideo="/video-productivity.mp4"
          citation="사물 제어"
          body="Apple Vision Pro는 당신이 최고의 작업을 해낼 수 있도록 무한한 공간을 제공합니다. Mac의 워크플로를 거대한 화면에 펼쳐 확인하는 것은 물론 여러 앱을 자유롭게 오가며 멀티태스킹하고, 원하는 방식으로 정리할 수도 있습니다.⁸"
          link={{ label: 'Apple Intelligence에 대해 더 알아보기', href: '/kr/apple-intelligence/' }}
          cards={productivityCards}
        />

        <FullscreenVideoSection
          heroVideo="/video-photos.mp4"
          citation="호출"
          body="Apple Vision Pro를 사용하면 마법 같은 공간 사진과 비디오를 3D로 담아, 그 소중한 순간을 언제든 다시 실감 나게 되살릴 수 있습니다. 탭 한 번으로 2D 사진을 공간 장면으로 변환해 당신의 소중한 추억을 생생하게 만들 수도 있죠."
          cards={photosCards}
        />

        <FullscreenVideoSection
          heroVideo="/video-connection.mp4"
          citation="콘텐츠 탐색"
          body="어디에서든 그 어느 때보다 생생한 방식으로 협업하고 소통할 수 있습니다. 다른 사람들과 FaceTime 통화를 할 때 상대방을 실물 크기의 비디오 타일로 볼 수 있고, 당신의 Persona를 사용하면 동료나 친구들, 또는 가족이 바로 앞에 있는 듯한 느낌을 받을 수도 있답니다."
          cards={connectionCards}
        />

        <FullscreenVideoSection
          heroVideo={`${VID25KR}/experience-apps/large.mp4`}
          heroImage={`${IMG}/experiences/apps/apps_startframe__fgskz7opptiu_large.jpg`}
          citation="앱"
          body="Safari 내 브라우징부터 '메시지' 앱에서의 대화까지, Apple Vision Pro는 당신이 자주 사용하는 앱의 경험을 한층 넓혀 모든 것에 경이로움을 더해줍니다. App Store에서는 감탄을 자아내는 더 많은 Apple Vision Pro용 공간 앱을 만나볼 수 있으며, 그 숫자는 계속 늘고 있죠."
          link={{ label: 'App Store 방문하기', href: 'https://apps.apple.com/kr/vision' }}
          cards={appsCards}
        />

        <FullscreenVideoSection
          id="visionos"
          heroVideo={`${VID24KR}/visionos-a/large.mp4`}
          heroImage={`${IMG}/visionos/visionos_a_startframe__fp1z3eff98qe_large.jpg`}
          citation="visionOS"
          body="macOS, iOS 및 iPadOS의 토대를 기반으로 설계된 visionOS는 눈, 손, 음성을 사용해 자연스럽게 다룰 수 있는 강력한 공간 경험을 구현합니다. visionOS 26와 함께라면 Apple Vision Pro를 사용해 감상하고, 일하고, 창작하는 것은 물론 소통할 수 있는 더욱 놀라운 방법을 발견할 수 있죠."
          link={{ label: 'visionOS 26에 대해 더 알아보기', href: '/kr/os/visionos/' }}
          cards={visionOSCards}
        />

        <div style={{ borderTop: '1px solid #d2d2d7' }}>
          <TechSection />
        </div>

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
