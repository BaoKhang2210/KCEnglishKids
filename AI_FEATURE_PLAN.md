# 🤖 KẾ HOẠCH TRIỂN KHAI HỆ THỐNG AI CHO KCENGLISHLIDS
> **Dự án:** KCEnglishKids — Nền tảng học tiếng Anh cho trẻ mầm non (3–6 tuổi)  
> **Tài liệu:** Kế hoạch kỹ thuật & Đặc tả Prompt Engineering hệ thống AI  
> **Phiên bản:** 1.0.0 (Tháng 10/2026)

---

## 📑 MỤC LỤC
1. [Mục Tiêu & Định Hướng Sư Phạm](#1-mục-tiêu--định-hướng-sư-phạm)
2. [Tổng Quan Kiến Trúc AI (AI Architecture)](#2-tổng-quan-kiến-trúc-ai-ai-architecture)
3. [Chi Tiết 2 Tính Năng Trọng Tâm](#3-chi-tiết-2-tính-năng-trọng-tâm)
   - [Tính Năng 1: AI Smart Parent Note Generator](#tính-năng-1-ai-smart-parent-note-generator-giáo-viên)
   - [Tính Năng 2: AI Pronunciation Coach with Koko Mascot](#tính-năng-2-ai-pronunciation-coach-with-koko-mascot-trẻ-em)
4. [Đặc Tả Kỹ Thuật Backend (API Specification)](#4-đặc-tả-kỹ-thuật-backend-api-specification)
5. [Đặc Tả Prompt Engineering Chi Tiết](#5-đặc-tả-prompt-engineering-chi-tiết)
6. [Kế Hoạch Tích Hợp Frontend (UI/UX Flow)](#6-kế-hoạch-tích-hợp-frontend-uiux-flow)
7. [Cơ Chế Dự Phòng (Fallback Mechanism) & Bảo Mật](#7-cơ-chế-dự-phòng-fallback-mechanism--bảo-mật)
8. [Checklist Từng Bước Triển Khai](#8-checklist-từng-bước-triển-khai)

---

## 1. MỤC TIÊU & ĐỊNH HƯỚNG SƯ PHẠM

Nền tảng **KCEnglishKids** phục vụ đối tượng đặc thù là **trẻ mầm non từ 3–6 tuổi**, **giáo viên mầm non** và **phụ huynh**. Việc đưa AI vào hệ thống cần giải quyết 2 bài toán thực tiễn lớn nhất:

1. **Giảm tải áp lực sư phạm & hành chính cho giáo viên**: 
   - Mỗi giáo viên phụ trách 15–30 học sinh. Việc viết nhận xét cá nhân hóa hàng tuần vào sổ liên lạc tiêu tốn hàng giờ đồng hồ.
   - AI đóng vai trò **Trợ lý sư phạm ảo (Teacher Copilot)** giúp phân tích dữ liệu học tập thật (điểm số, số sao, chuỗi streak, bài tập) và sinh nhận xét chuẩn văn phong mầm non chỉ sau 1 click.
2. **Kích thích phản xạ Nghe – Nói tự nhiên cho trẻ**:
   - Trẻ 3–6 tuổi tiếp thu ngôn ngữ qua phương pháp Đa giác quan (VARK) và Phản xạ toàn thân (TPR).
   - AI đóng vai trò **Bạn học ảo thông minh (Speaking Buddy)** qua hình tượng **Linh vật Sư tử Koko**, biết lắng nghe giọng đọc của bé, đánh giá ngữ âm theo độ tuổi và phản hồi bằng hình ảnh hoạt họa rực rỡ, vui nhộn.

---

## 2. TỔNG QUAN KIẾN TRÚC AI (AI ARCHITECTURE)

```
                            ┌──────────────────────────────────────────┐
                            │        GOOGLE GEMINI 2.5 FLASH           │
                            │  - Multimodal text / voice processing    │
                            │  - Ultra-low latency (< 1.2s)            │
                            │  - Native JSON Schema enforcement        │
                            └────────────────────┬─────────────────────┘
                                                 │
                                                 │ HTTPS (API Key server-side)
                                                 ▼
                            ┌──────────────────────────────────────────┐
                            │       KCEnglishKids_BE (Express.js)      │
                            │  - aiService.js (Gemini SDK / Fetch)     │
                            │  - aiController.js (Logic & Validation)  │
                            │  - Rate Limiter + Offline Fallbacks      │
                            │  - JWT Authentication Middleware         │
                            └────────────┬────────────────┬────────────┘
                                         │                │
            POST /api/ai/generate-parent-note             POST /api/ai/evaluate-pronunciation
                                         │                │
                                         ▼                ▼
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│        TEACHER WORKSPACE (GIÁO VIÊN)         │    │           CHILD LEARNING (TRẺ EM)            │
│  - Modal nhận xét học sinh theo lớp          │    │  - Web Speech API (Thu âm giọng nói bé)      │
│  - Bảng chấm bài tập về nhà                  │    │  - AI Phoneme Matching Engine                │
│  - Báo cáo phân tích chuyên cần              │    │  - Phản ứng hoạt họa Linh vật Koko           │
│  - 3 Thẻ nhận xét thông minh (Praise/Remind) │    │  - Thưởng sao ⭐ 1-3 & Âm thanh chúc mừng     │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT 2 TÍNH NĂNG TRỌNG TÂM

### Tính Năng 1: AI Smart Parent Note Generator (Giáo Viên)
* **Vị trí tích hợp**: 
  - Modal gửi nhận xét phụ huynh tại tab `Quản lý học sinh theo lớp` ([TeacherWorkspace.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherWorkspace.tsx#L1809)).
  - Bảng chấm bài tập chi tiết ([TeacherWorkspace.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherWorkspace.tsx#L1290)).
  - Báo cáo phân tích học tập ([TeacherAnalyticsTab.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/TeacherAnalyticsTab.tsx)).
* **Đầu vào (Input)**: Tên học sinh, độ tuổi, điểm trung bình %, tổng số sao, số bài hoàn thành, chuỗi ngày học liên tục (streak), chủ đề bài học gần nhất.
* **Đầu ra (Output)**: 3 phương án nhận xét đa dạng:
  1. 🌟 **Khen ngợi & Tuyên dương (Praise)**: Khích lệ bé tiếp thu tốt, phát âm tự tin.
  2. 👏 **Động viên tiến bộ (Encouragement)**: Ghi nhận sự nỗ lực, chăm chỉ và kiên trì.
  3. 📖 **Nhắc nhở nhẹ nhàng (Practice Hint)**: Gợi ý phụ huynh cùng bé mở app nghe lại từ vựng 10 phút tại nhà.
* **Lợi ích**: Giáo viên chỉ cần click chọn 1 trong 3 mẫu, nội dung tự động điền vào khung và gửi ngay vào Sổ liên lạc điện tử.

---

### Tính Năng 2: AI Pronunciation Coach with Koko Mascot (Trẻ Em)
* **Vị trí tích hợp**: 
  - Studio Luyện tập tương tác Giai đoạn 2 ([InteractivePracticeStudio.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/components/child/InteractivePracticeStudio.tsx)).
  - Thẻ từ vựng tương tác lớn ([BigInteractiveFlashcard.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/components/child/BigInteractiveFlashcard.tsx)).
  - Chế độ dạy trực tiếp trên lớp ([LiveSessionPage.tsx](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/dashboards/teacher/LiveSessionPage.tsx)).
* **Quy trình hoạt động**:
  1. Trẻ nhìn thẻ từ vựng (ví dụ: *"Elephant"* - Con voi).
  2. Trẻ bấm giữ nút micro và phát âm tiếng Anh.
  3. Trình duyệt thu âm bằng Web Speech API ([speechRecognition.ts](file:///d:/Dulieu/KLTN/KCEnglishKids/client/src/utils/speechRecognition.ts)) và gửi kết quả kèm ngữ cảnh đến AI.
  4. AI so khớp ngữ âm với dung sai thân thiện cho lứa tuổi mầm non (3–6 tuổi).
  5. Trả về kết quả:
     - Điểm số: 0% – 100%.
     - Số sao đạt: 1⭐, 2⭐⭐, hoặc 3⭐⭐⭐.
     - Trạng thái Linh vật Koko: `celebrating` (ăn mừng), `happy` (vui vẻ), hoặc `encouraging` (động viên).
     - Lời cổ vũ dễ thương của Koko bằng tiếng Việt & tiếng Anh.
     - Mẹo khẩu hình siêu đơn giản: *"Bé mím môi bật hơi nhẹ nhé!"*.

---

## 4. ĐẶC TẢ KỸ THUẬT BACKEND (API SPECIFICATION)

### 4.1. Endpoint 1: Tạo nhận xét phụ huynh
* **URL**: `POST /api/ai/generate-parent-note`
* **Quyền hạn**: `TEACHER`, `ADMIN` (Bearer JWT Token)
* **Request Body**:
```json
{
  "studentName": "Minh Khôi",
  "ageGroup": "4-5",
  "averageScore": 92,
  "totalStars": 48,
  "streak": 5,
  "completedLessons": 12,
  "recentLesson": "Things at School",
  "teacherTone": "warm_encouraging"
}
```

* **Response Body (200 OK)**:
```json
{
  "success": true,
  "data": {
    "options": [
      {
        "id": "opt_praise",
        "type": "praise",
        "badge": "🌟 Khen ngợi xuất sắc",
        "title": "Bé tiếp thu rất nhanh & tự tin",
        "content": "Cô gửi lời chào ba mẹ bé Minh Khôi! Tuần này bé học rất xuất sắc, điểm trung bình đạt 92% và đã tích lũy được 48 sao ngôi sao chăm ngoan. Bé phát âm các từ vựng chủ đề 'Things at School' rất to, rõ ràng và hào hứng giơ tay phát biểu. Cô khen ngợi con nhiều nhé!",
        "suggestedStars": 5
      },
      {
        "id": "opt_progress",
        "type": "encouragement",
        "badge": "👏 Động viên tiến bộ",
        "title": "Bé chăm chỉ giữ chuỗi 5 ngày",
        "content": "Chào gia đình bé Minh Khôi! Cô rất vui khi thấy con chăm chỉ giữ chuỗi 5 ngày học liên tục và đã hoàn thành 12 bài học. Khả năng phản xạ nghe chọn tranh của con tiến bộ rõ rệt so với tuần trước. Ba mẹ cùng dành cho con một tràng pháo tay nhé!",
        "suggestedStars": 4
      },
      {
        "id": "opt_hint",
        "type": "practice_hint",
        "badge": "📖 Đồng hành tại nhà",
        "title": "Gợi ý ôn tập cùng bé 10 phút",
        "content": "Cô chào ba mẹ Minh Khôi! Con đã hoàn thành tốt bài học 'Things at School'. Ở nhà, ba mẹ có thể cùng con chỉ vào cặp sách hay hộp bút và đố con: 'What is this?' khoảng 5-10 phút để con nhớ sâu hơn từ vựng nhé. Cảm ơn sự đồng hành của gia đình!",
        "suggestedStars": 3
      }
    ]
  }
}
```

---

### 4.2. Endpoint 2: Chấm điểm phát âm & Phản hồi Koko
* **URL**: `POST /api/ai/evaluate-pronunciation`
* **Quyền hạn**: Public / Token trẻ em
* **Request Body**:
```json
{
  "targetWord": "Apple",
  "spokenTranscript": "Apple",
  "phonetic": "/ˈæp.əl/",
  "ageGroup": "3-4",
  "childName": "Bé Bơ"
}
```

* **Response Body (200 OK)**:
```json
{
  "success": true,
  "data": {
    "score": 96,
    "starsAwarded": 3,
    "isAccepted": true,
    "mascotState": "celebrating",
    "kokoSpeech": "Tuyệt cú mèo! Bé Bơ nói từ Apple chuẩn lắm!",
    "kokoEnglishCheer": "Awesome job, little star!",
    "phonemeTip": "Bé mở rộng miệng phát âm âm /æ/ rất chuẩn!",
    "bonusStars": 2
  }
}
```

---

## 5. ĐẶC TẢ PROMPT ENGINEERING CHI TIẾT

### 5.1. System Prompt cho "AI Viết nhận xét phụ huynh"
```text
Bạn là Trợ lý Sư phạm Mầm non AI cao cấp của nền tảng tiếng Anh KCEnglishKids (dành cho trẻ 3–6 tuổi).
Nhiệm vụ của bạn là dựa vào dữ liệu học tập thực tế của học sinh mầm non để soạn thảo 3 phương án nhận xét gửi phụ huynh qua Sổ liên lạc điện tử.

QUY TẮC SƯ PHẠM MẦM NON BẮT BUỘC:
1. Đại từ nhân xưng: Mở đầu bằng lời chào thân ái "Cô gửi lời chào ba mẹ bé [Tên bé]" hoặc "Cô chào gia đình bé [Tên bé]". Gọi học sinh là "bé [Tên bé]" hoặc "con".
2. Tinh thần sư phạm tích cực (Positive Reinforcement): Luôn đề cao sự tiến bộ, tính tự giác và cố gắng của trẻ.
3. Số liệu minh bạch: Khéo léo nhắc đến điểm số trung bình (%), số sao đạt được, số bài hoàn thành hoặc chuỗi ngày học (streak) để tạo niềm tin với phụ huynh.
4. Gợi ý hành động thực tế: Ở phương án ôn tập, đưa ra 1 trò chơi gia đình ngắn gọn (5-10 phút) không áp lực.
5. Độ dài chuẩn: Mỗi nhận xét từ 3-4 câu (khoảng 50-75 từ), xúc tích, rõ ràng, giàu tình cảm.

ĐỊNH DẠNG ĐẦU RA:
Bắt buộc trả về đúng định dạng JSON tuân thủ cấu trúc sau:
{
  "options": [
    {
      "id": "praise",
      "type": "praise",
      "badge": "🌟 Khen ngợi xuất sắc",
      "title": "Tiêu đề ngắn",
      "content": "Nội dung nhận xét...",
      "suggestedStars": 5
    },
    {
      "id": "encouragement",
      "type": "encouragement",
      "badge": "👏 Động viên tiến bộ",
      "title": "Tiêu đề ngắn",
      "content": "Nội dung nhận xét...",
      "suggestedStars": 4
    },
    {
      "id": "practice_hint",
      "type": "practice_hint",
      "badge": "📖 Đồng hành tại nhà",
      "title": "Tiêu đề ngắn",
      "content": "Nội dung nhận xét...",
      "suggestedStars": 3
    }
  ]
}
```

---

### 5.2. System Prompt cho "AI Pronunciation Coach with Koko"
```text
Bạn là Chuyên gia Ngữ âm Tiếng Anh Mầm non kiêm Linh vật Sư tử Koko đáng yêu của trường KCEnglishKids.
Nhiệm vụ của bạn là đánh giá âm thanh/từ mà một em bé mầm non (3–6 tuổi) vừa phát âm so với từ vựng tiếng Anh mục tiêu.

QUY TẮC ĐÁNH GIÁ TRẺ MẦM NON:
1. Cơ miệng trẻ 3-6 tuổi đang phát triển: Chấp nhận dung sai đối với các âm gió nhẹ (/s/, /z/, /θ/) và âm đuôi nhẹ.
2. Tuyệt đối không phán xét tiêu cực: Không dùng các từ "Sai rồi", "Kém", "Chưa đạt". Thay bằng "Gần đúng rồi!", "Cố lên nào!", "Bé phát âm siêu quá!".
3. Tiêu chí chấm điểm & số sao:
   - 85% - 100%: 3 sao ⭐⭐⭐ (Koko nhảy múa celebrating, âm thanh rộn rã).
   - 65% - 84%: 2 sao ⭐⭐ (Koko tươi cười happy, vỗ tay khích lệ).
   - Dưới 65%: 1 sao ⭐ (Koko tạo dáng encouraging, hướng dẫn đọc lại cùng Koko).
4. Mẹo khẩu hình (Phoneme Tip): Diễn giải bằng tiếng Việt thật dễ hiểu với trẻ em (ví dụ: "mím môi bật hơi", "thè đầu lưỡi nhẹ", "mở to miệng hình quả trứng").

ĐỊNH DẠNG ĐẦU RA (JSON thuần):
{
  "score": number, // 0 - 100
  "starsAwarded": number, // 1, 2 hoặc 3
  "isAccepted": boolean, // true nếu score >= 65
  "mascotState": "celebrating" | "happy" | "encouraging",
  "kokoSpeech": "Lời khen ngợi tiếng Việt dễ thương của Koko (dưới 20 từ)",
  "kokoEnglishCheer": "Lời khen tiếng Anh ngắn (dưới 6 từ)",
  "phonemeTip": "Mẹo khẩu hình ngộ nghĩnh cho bé"
}
```

---

## 6. KẾ HOẠCH TÍCH HỢP FRONTEND (UI/UX FLOW)

### 6.1. Giao diện Giáo viên: Nút "🪄 AI Viết nhận xét"
* Nằm ngay phía trên khung `textarea` nhập nhận xét của giáo viên.
* Khi bấm nút:
  - Hiệu ứng Shimmer Loading óng ánh: *"AI đang phân tích kết quả học của bé..."*.
  - Xuất hiện 3 thẻ bài bo góc mềm mại với màu sắc phân biệt:
    - 🌟 **Thẻ Vàng (Praise)**
    - 👏 **Thẻ Xanh ngọc (Progress)**
    - 📖 **Thẻ Tím pastel (Practice Hint)**
  - Click vào thẻ nào $\rightarrow$ chữ tự động bay vào khung soạn thảo kèm số sao tương ứng $\rightarrow$ Giáo viên có toàn quyền chỉnh sửa trước khi bấm **"Gửi vào Sổ liên lạc"**.

### 6.2. Giao diện Trẻ em: Vòng phát âm tương tác với Koko
* Khi bé phát âm:
  - Vòng tròn sóng âm (Audio Waveform) màu xanh ngọc dao động quanh nút mic.
  - Khi AI trả kết quả:
    - Nếu $\ge 85\%$: Hoa giấy (Confetti) bung nổ, Koko nhảy múa và phát giọng chúc mừng.
    - 3 ngôi sao vàng ⭐⭐⭐ phóng to từ giữa màn hình bay vào khay sao của bé.
    - Hiển thị bong bóng thoại lời khen của Koko: *"Tuyệt cú mèo! Bé đọc chuẩn lắm!"*.

---

## 7. CƠ CHẾ DỰ PHÒNG (FALLBACK MECHANISM) & BẢO MẬT

1. **Bảo mật API Key**:
   - `GEMINI_API_KEY` chỉ lưu trong file `.env` ở Backend, không bao giờ lộ ra mã nguồn Client/React.
2. **Cơ chế Fallback thông minh khi Offline / Mất kết nối**:
   - Nếu gọi Gemini API gặp sự cố (quá quota, lỗi mạng hoặc timeout > 4 giây):
   - Backend tự động kích hoạt **Bộ mẫu nhận xét sư phạm có sẵn (Deterministic Templates)** kết hợp biến số thật của bé (`name`, `score`, `stars`) để trả về ngay lập tức, đảm bảo giao diện giáo viên không bao giờ bị đơ hoặc báo lỗi gián đoạn.
3. **Bộ lọc an toàn (Safety Filters)**:
   - Cấu hình Gemini Safety Settings ở mức cao nhất, đảm bảo 100% nội dung phù hợp lứa tuổi mầm non và chuẩn mực sư phạm.

---

## 8. CHECKLIST TỪNG BƯỚC TRIỂN KHAI

| Bước | Hạng mục | Chi tiết thực hiện | Trạng thái |
| :---: | :--- | :--- | :---: |
| **B1** | Backend Cấu hình | Thêm biến môi trường `GEMINI_API_KEY` vào file `.env` | ⏳ Chờ làm |
| **B2** | Backend AI Service | Tạo `aiService.js` kết nối Gemini API kèm Fallback Templates | ⏳ Chờ làm |
| **B3** | Backend Endpoints | Tạo `aiController.js` và `aiRoutes.js` cho 2 chức năng | ⏳ Chờ làm |
| **B4** | Frontend API Service | Thêm hàm `aiApi.generateParentNote` và `aiApi.evaluatePronunciation` vào `client/src/services/api.ts` | ⏳ Chờ làm |
| **B5** | UI Giáo viên | Tích hợp nút *"🪄 AI Tạo nhận xét"* và 3 Thẻ đề xuất vào modal nhận xét phụ huynh | ⏳ Chờ làm |
| **B6** | UI Trẻ em | Nâng cấp `InteractivePracticeStudio.tsx` & `BigInteractiveFlashcard.tsx` với phản hồi Koko AI | ⏳ Chờ làm |
| **B7** | Kiểm thử Toàn diện | Chạy build `client`, `admin` và dùng Browser Subagent kiểm thử trên trình duyệt | ⏳ Chờ làm |

---
*Tài liệu này được lưu trữ tại file: [AI_FEATURE_PLAN.md](file:///d:/Dulieu/KLTN/KCEnglishKids/AI_FEATURE_PLAN.md).*
