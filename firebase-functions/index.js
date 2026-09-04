const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// 환자가 메시지 보내면 보호자에게 푸시 알림
exports.notifyCaregiver = onDocumentCreated(
  "chats/{userCode}/messages/{messageId}",
  async (event) => {
    const message = event.data.data();
    const userCode = event.params.userCode;

    // 환자가 보낸 메시지만 처리
    if (message.userRole !== "patient") return null;

    // 보호자 FCM 토큰 조회
    const tokenDoc = await getFirestore()
      .collection("caregiverTokens")
      .doc(userCode)
      .get();

    if (!tokenDoc.exists) return null;
    const token = tokenDoc.data().token;
    if (!token) return null;

    // message.isCall(구조화된 필드)을 우선 신뢰하고, 옛날 클라이언트가 보낸 메시지 등
    // 필드가 없는 경우에만 문자열 매칭으로 폴백
    const isCall = message.isCall === true ||
      (message.isCall === undefined && (message.text?.includes("호출") || message.text?.includes("도와주세요")));

    // FCM 푸시 전송
    await getMessaging().send({
      token,
      notification: {
        title: isCall ? "🚨 " + (message.userName || "환자") + " 호출!" : (message.userName || "환자"),
        body: message.text,
      },
      // data는 앱이 포그라운드일 때 자체 벨소리 재생 여부를 판단하는 데 사용됨
      data: {
        isCall: isCall ? "true" : "false",
      },
      android: {
        priority: "high",
        notification: {
          channelId: isCall ? "morspeak_call" : "morspeak_care",
          sound: "default",
          priority: "max",
          defaultSound: true,
          defaultVibrateTimings: true,
          vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: { sound: isCall ? "alarm.caf" : "default", badge: 1 },
        },
      },
    });

    return null;
  }
);
