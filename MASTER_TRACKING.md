# 🧭 KCEnglishKids — FILE THEO DÕI TỔNG THỂ (Master Tracking)

> **Cập nhật:** 01/11/2026 — phục vụ bảo vệ KLTN (deadline thứ Ba).
> File này là **nguồn theo dõi duy nhất**: chức năng hiện có, những gì vừa làm, việc còn lại và cách chạy/kiểm chứng nhanh.
> Các file lịch sử (`PROGRESS.md`, `AI_PROGRESS.md`, `docs/*-2026-11-01.md`) vẫn còn giá trị tham khảo chi tiết.

---

## 1. Tổng quan & công nghệ

| Tầng | Công nghệ | Ghi chú |
| --- | --- | --- |
| Frontend (child/teacher/admin) | React 19 + Vite 8 + TypeScript 6 + Tailwind 4, react-router 7, lucide-react, canvas-confetti, **motion v14 (mới)** | `client/` — lint bằng oxlint, test bằng vitest |
| Backend | Express 5 + Mongoose 9 (CommonJS), JWT, bcryptjs | `KCEnglishKids_BE/` — test bằng Node built-in test runner |
| Database | MongoDB Atlas (`.env`) — local backup trong `.env.local.backup` | Scriptseed trong `KCEnglishKids_BE/scripts/` |
| Chia sẻ | `shared/` (giáo trình, dữ liệu tĩnh) | |
| AI | **Local-First** (không cần cloud key) — thuật toán trong `aiService.js` | Sẵn sàng demo, minh bạch "Template mode — cloud AI off" |

### Chạy dự án
```powershell
# Cách nhanh: start-all.bat / stop-all.bat ở gốc repo (backend :5000, client :5173)
cd KCEnglishKids_BE ; node src/server.js
cd client ; npm run dev
```
⚠️ PowerShell máy này chặn `npm.ps1` → luôn dùng **`npm.cmd`** và `node_modules\.bin\<tool>.cmd`.

### Lệnh kiểm chứng chuẩn (đã chạy sạch ngày 01/11)
```powershell
cd client
.\node_modules\.bin\tsc.cmd -b            # exit 0
.\node_modules\.bin\vite.cmd build        # OK
.\node_modules\.bin\oxlint.cmd .          # 0 errors (cảnh báo cũ bỏ qua)
npm.cmd run test -- --run                 # vitest: 54/54 (11 files)

cd ..\KCEnglishKids_BE
node --test tests/ai.test.js tests/accountRecovery.test.js tests/businessRules.test.js ... # 15 suite thuần: 102/102 (01/11)
npm.cmd test -- tests/accountRecovery.test.js   # 10/10
npm.cmd test -- tests/homePractice.test.js      # 13/13
```
⚠️ `adminIntegrity.test.js` + một số suite cần **Mongo đang chạy**, nếu không sẽ lỗi
`homepracticeplans.deleteMany() buffering timed out` — đây là hạn môi trường, không phải bug.

---

## 2. Danh mục chức năng hiện có (đã quét toàn repo)

### 2.1 Tài khoản & đăng nhập (`authController` + `accountRecovery` service)
- ✅ **Trẻ**: đăng nhập bằng Username / Email / SĐT / liên hệ + PIN 4 số; trang `StudentLoginPage`.
- ✅ **Phục hồi PIN cho trẻ "lấy lại ngay"** (mới, 01/11):_flow "2 người bạn bí mật" —_
  chọn đúng 2/8 bức tranh emoji (kiểu Khan Academy Kids) tại `/recover` → đặt PIN mới → **tự đăng nhập luôn**.
  Cài bí mật ngay trong `ChangePinPage` (bước FRIENDS, có thể bỏ qua).
- ✅ **Phục hồi mật khẩu giáo viên**: mã khôi phục 6 ký tự dùng 1 lần (xoay trong `TeacherHome` →
  panel "Tài khoản & mã khôi phục"), đăng nhập trang thái "Quên mật khẩu?".
- ✅ Bảo mật: token khôi phục in-memory 10 phút, 1 lần dùng, 3 sai là burn (401→410), bump `authVersion`
  vô hiệu phiên cũ, weak-PIN bị chặn, rate-limit riêng cho 4 endpoint public mới, audit `ACCOUNT_RECOVERY_COMPLETED`.
- ✅ Đổi PIN (trẻ) / đổi mật khẩu (cô, admin). Lookup "quên tên đăng nhập" cho phụ huynh.
- Roles: `CHILD`, `TEACHER`, `ADMIN`, `PARENT` (PARENT **có trong schema nhưng chưa có cổng web** — xem mục 3.1).

### 2.2 Trẻ em — học & chơi
- ✅ **Lộ trình 9 Unit** (`ChildHomePage` tab path): thẻ unit theo theme + modal "đá bước qua từng lesson".
- ✅ **BẢN ĐỒ QUẦN ĐẢO kiểu board-game** (đổi mới 01/11 — `JourneyRoadmap.tsx`): mỗi unit là một **hòn đảo**
  (cát + cỏ + cọ + hoa 🌺) trên biển gradient, route nối bằng **vệt bọt biển trắng bơi** (road-dots), island hiện tại
  có ⛵ + Koko 🐵 nhấp nhô + quầng sáng "thở" mượt (transform, KHÔNG còn vòng amber nhấp nháy), đảo xong ⭐🚩,
  đảo khóa 🔒 + lớp sương xám; sóng + cá 🐠 + mây 🌞 trang trí. **Thư viện mới: `motion` (framer-motion).**
- ✅ **Thẻ bài lớn tương tác** `BigInteractiveFlashcard` (nghe/chạm/trò chơi), 3 giai đoạn:
  Khám phá → Luyện tập (Stage2PracticeFlow: 9 dạng câu hỏi) → Arcade (thư viện mini-game).
- ✅ **12+ mini-game engine** (`components/child/games/`): BubblePop, Memory, StarCatcher, FeedAnimal,
  ImageWordMatch, ListenChoose, TapPicture, TrueFalse, ColorRecognition, CountObjects, MissingObject,
  AnimalSound, LineMatch (nối tranh–từ, cấu hình `.tmp` đã Việt hóa).
- ✅ **Lesson 4 stage** (`LessonDetailPage`, `ExploreSceneStage`, `UnitReviewStage` 50/70/90% → 1/2/3 sao),
  mục tiêu bài từng lesson (`LessonObjectivesModal` — Package A).
- ✅ Sổ tay từ vựng (`ChildVocabNotebookSection` + `vocabMasteryService` offline-first, spaced-repetition
  register journey words), ôn tập "My learning" (`MyLearningPage` — bao gồm bài về nhà được cô duyệt).
- ✅ Storybook (truyện theo unit, background ảnh đã đổi), `TopicDetailPage` theo lứa tuổi 3-4/4-5/5-6.
- ✅ **Web Speech nhận diện giọng nói** qua `KokoSpeakingCoach` (xem mục AI).

### 2.3 Phần thưởng & động lực
- ✅ Sao: lesson stars + bonus unit + thưởng trên lớp (công thức hiển thị trong modal phần thưởng).
- ✅ **Huy hiệu (badges)** `data/badges.ts` + `ChildBadgesModal` + `BadgeShowcaseModal`:
  3 nhóm 🐾 Hành trình / ⭐ Ngôi sao / 🎯 Kỹ năng, tier bronze→silver→gold→diamond.
  **Mới 01/11 (3.3)**: thêm reqType `streak` + 5 badge mới — 🔥 3/7/30 ngày liên tiếp (lấy `streakApi.getStreak`,
  dùng `max(streak, longestStreak)`), 🥇 5 lesson hoàn hảo, 🗝️ sưu tầm 5 rương; modal tự fetch streak khi mở.
  **Vừa làm đẹp (01/11)**: `CuteRosetteMedal` thêm **tia nắng (sunburst) xoay + vệt sáng diagonal glint
  + 3 tia ✦ lấp lánh** sau huy hiệu đã mở; lưới badge trong modal **pop-in spring có stagger + hover/tap**
  (motion); thanh tiến trình chưa mở thêm **ray bóng chảy (progress-rail-shine)**; `BadgeShowcaseModal`
  (spotlight) + đá stepping stones trong unit modal cũng đã lên motion stagger cùng motif.
- ✅ **Sticker** (`data/stickers.ts`, `CuteStickerCard`, `StickerShowcaseModal`, rương unit → sticker hiếm).
- ✅ Rương kho báu theo unit (`ChestRevealModal`, `ChestShelfModal`, `revealChest` API, confetti).
- ✅ Streak hàng ngày (`streakApi`, `DailyStreakBanner/Modal/Badge`, flame icon).
- ✅ Giấy khen: `ChildRecognitions` (class + school recognitions, award trong LiveSession).
- ✅ Âm thanh + rung: `utils/audio.ts` (sfx.playBadgeChime…), `SoundWaves`.

### 2.4 Giáo viên (`/teacher/*` — TeacherWorkspace + LiveSession)
- ✅ **Live Session** (màn chiếu lớp): flashcard fullscreen, gọi tên/điểm danh (PRESENT/ABSENT/EXCUSED/LATE),
  award sao + huy hiệu trực tiếp, game coverage, `LiveSessionCopilotDrawer` (AI nhắc bài, Alt+K).
- ✅ **Lịch dạy & lộ trình giáo trình** (`TeacherTeachingSchedule`, calendar, weeklySlots), nhắc lịch (xem 3.6).
- ✅ **Giao bài về nhà (Package A)** `TeacherAssignments` + `homePractice`: mục tiêu từng bài, đề xuất ôn từ
  dữ liệu thật, **cô duyệt mới tới bé**, append-only revision khi đổi/thu hồi, nội dung vào báo cáo gia đình.
- ✅ **Báo cáo gia đình** (`FamilyReportModal` + `familyLearningReport` service + `parentNotification`):
  bản tin có sao, streak, bài ôn được duyệt; draft theo session.
- ✅ Quan sát lớp (`LearningObservation`, góc theo dõi), thống kê (`teacherStatistics`, insights),
  hồ sơ lớp, quản lý từ vựng/ngữ pháp (`sentencePattern`), media/upload (Media + xlsx import).
- ✅ Panel **AccountSecurity** (mã khôi phục một lần) trong `TeacherHome`.

### 2.5 Admin (`/admin/*`)
- ✅ Quản lý user/role, lớp, giáo trình (CurriculumBook/Unit/Lesson), AgeGroup, SystemSetting,
  AuditLog (integrity), adminMaintenance (dọn dữ liệu), duyệt SchoolRecognition.

### 2.6 AI (chi tiết trong `AI_PROGRESS.md` — tất cả local-first, đã pass test)
- ✅ **Gợi ý nhận xét phụ huynh** (`generateParentNote`) — 3 phương án Praise/Encourage/Hint theo dữ liệu thật,
  component `ParentNoteSuggestions` (4 vị trí trong workspace cô).
- ✅ **Luyện phát âm cùng Koko** (`evaluatePronunciation` + `normalizeTranscript`, Levenshtein 0-100%,
  3 sao, trạng thái cảm xúc Koko) — hook `useSpeakingCoach` + Web Speech API, tích hợp flashcard/practice/live.
- ✅ **Soạn giáo án 4 pha** (`generateLessonPlan`: warm-up/TPR/practice/wrap-up, 15-25-35 phút, 3 nhóm tuổi,
  3 phong cách, Teacher Talk + TPR Action, tin sổ liên lạc) — trang `TeacherLessonPlanner` (copy/in/áp dụng live).
- ✅ **Copilot nhắc bài live** (`LiveSessionCopilotDrawer`, đồng bộ phase theo từ vựng hiện tại, cue quản lớp).
- ✅ **AI Gap Detector lớp (3.7, mới 01/11)** — `GET /api/ai/class-gaps?classRoomId=&lessonId=`
  (`aiService.detectClassGaps` rule-based trên `VocabularyMastery`): từ nào <70% bé Thành thạo hoặc độ đúng thấp
  → gap `critical`/`watch`, lí do + gợi ý ôn tiếng Việt, sắp yếu→tốt. UI: panel **"Lỗ hổng kiến thức của lớp"**
  trong `TeacherHome` (chọn lớp, top 6 từ, link tạo giáo án ôn tập). Tests `tests/ai.test.js` **15/15**.
- ✅ Tests backend `tests/ai.test.js` 15/15.
- ⏳ Phase 3 còn lại: Koko Object Hunter (TF.js camera — rủi ro permissions, chưa làm), Koko Home-Bridge tin tuần.

### 2.7 Hạ tầng dữ liệu
- ✅ Offline buffer cho trẻ: `learningOutbox` (đã có hàng đợi client→server khi mất mạng).
- ✅ Rate limiting auth, error middleware statusCode, validate field-length guard, seed scripts, backup `data_backup/`.
- ✅ **PWA đầy đủ (3.5, 01/11)**: `vite-plugin-pwa@2` (generateSW) — manifest standalone landscape theme amber,
  icon SVG `public/pwa-icons/icon.svg`, sw.js precache ~1370 entries, runtimeCache ảnh/audio (`CacheFirst`,
  `kc-pwa-learning`) + fonts (`StaleWhileRevalidate`); cùng tồn tại với `learning-assets-sw.js` cũ.
- ⚠️ Version backup system đã nâng **3.4.0** (`adminMaintenanceController` + `restore_system_backup` accept 3.0→3.4);
  test/script đã đồng bộ theo 3.4.0.

---

## 3. ROADMAP — các việc đề xuất (theo thứ tự ưu tiên cho deadline)

> ✅ = đã hoàn thành trong code, kiểm chứng bằng lệnh mục 1.

### 3.1 ⏳ Cổng phụ huynh (PARENT portal) — **tạm gác theo yêu cầu 01/11**
- Vai trò PARENT đã có trong schema + lookup "quên tên đăng nhập"; chưa có trang web riêng.
- Khi làm: route `/parent/*` đọc `familyLearningReport` + `parentNotification` + giao bài (đã có backend) — chỉ thiếu UI.

### 3.2 ✅ Huy hiệu & lộ trình làm đẹp (01/11)
- JourneyRoadmap board-game + sunburst/glint/sparkle huy hiệu + lưới badge motion stagger. ✅
- `BadgeShowcaseModal` spotlight pop-in spring + rail shine; đá stepping stones trong unit modal stagger cùng motif. ✅

### 3.3 ✅ Huy hiệu Duolingo-style mới (01/11)
- reqType `streak` trong `badges.ts` + `labels.ts`; 5 badge: 🔥3/📅7/🌋30 ngày, 🥇5 lesson hoàn hảo, 🗝️sưu tầm 5 rương.
- `ChildBadgesModal` tự fetch streak (`streakApi.getStreak`) khi mở; `ChildHomePage` truyền `streakDays` vào cả 2 chỗ badgeProgress. ✅

### 3.4 ✅ Storybook "đọc cùng Koko" (01/11)
- Không có `StoryReader` riêng; chế độ truyện tích hợp vào **`ExploreSceneStage`** (stage Khám phá):
  nút "Cùng Koko đọc truyện" → Koko đọc intro (SpeechSynthesis en-US) → tự lật từng từ + phát audio
  + đọc outro; nút dừng màu hồng (cancelRef). ✅

### 3.5 ✅ PWA offline hoàn chỉnh (01/11)
- `vite-plugin-pwa@2` trong `vite.config.ts` (generateSW/autoUpdate, manifest standalone landscape, icon SVG,
  runtimeCaching ảnh/audio/fonts). Build ra `dist/sw.js` + `workbox-*.js`, precache 1370 entries. ✅

### 3.6 ✅ Nhắc lịch giáo viên (01/11)
- `ScheduleReminders` trong `TeacherHome`: banner + Web Notification trước 15', tick 30s,
  chống lặp `localStorage kc-schedule-notified-<ngày VN>-<slot>`, nút "Bật thông báo" xin permission.
- OTP email/SMS: **vẫn chặn** (chưa có SMTP/Twilio) — khi có, thay `accountRecovery.begin*` bằng gửi mã 6 số, giữ UI.

### 3.7 ✅ một phần — AI Phase 3 (01/11)
- **Gap detector lớp: XONG** — `aiService.detectClassGaps` (rule-based trên VocabularyMastery, ngưỡng 70%),
  `GET /api/ai/class-gaps` (TEACHER/ADMIN, rate-limit 15/phút, kiểm tra quyền chủ lớp), panel
  "Lỗ hổng kiến thức của lớp" trong `TeacherHome` + 3 test mới (15/15). ✅
- Koko Object Hunter (TF.js + camera): **chưa làm** — rủi ro permissions/thời gian, để phiên sau nếu cần.

---

## 4. Ghi chú kỹ thuật quan trọng (đừng bỏ qua khi sửa tiếp)

1. **Recovery flow bất biến**: token in-memory ⇒ **restart backend là mất token** (hành vi chấp nhận được, UI đã bắt 410 → "bắt đầu lại").
2. `User.recoverySecret.hash` là `select:false` — mọi truy vấn cần hash phải `.select('+recoverySecret.hash')`.
3. Đổi credential ⇒ `authVersion++` ⇒ mọi JWT cũ **bị vô hiệu** (đăng xuất hàng loạt là đúng thiết kế).
4. `teacherRules.fail(msg, statusCode=400)` — ném Error có statusCode, error middleware tôn trọng.
5. Child UI: **không đổi key cấu trúc `units`** — JourneyRoadmap suy ra `accessible` từ `units[i-1].isCompleted` giống hệt logic card.
6. `motion` import từ **`motion/react`** (package `motion` đã thay framer-motion); SVG anim phải đặt
   `style={{ transformBox: 'fill-box', transformOrigin: 'center' }}` (xem `JourneyRoadmap`).
   **Không animate attribute SVG (`r`, `x`, `y` tuyệt đối) qua CSS/motion** — dễ gây giật/nhấp nháy và không chạy
   trên Firefox; chỉ animate transform (scale/translate/rotate). Với SVG, `x`/`y` trong `animate` của motion là
   **translate tương đối**, cộng dồn vào attribute — dùng số lẻ nhỏ như `[0,-4,0]`.
7. PowerShell: `;` không dùng `&&`; tool binaries gọi qua `.cmd`; test Node runner: `node --test tests/<file>`; glob phải bọc dấu `"`.
8. Terminal hiển thị tiếng Việt có thể bị mojibake — **file vẫn UTF-8 chuẩn**, đừng "sửa" dấu câu theo màn hình.
9. oxlint baseline: **0 errors**, ~192 warnings cũ — đừng sửa hàng loạt warning mất thời gian.
10. Khi sửa `ChildHomePage` (1157+ dòng): `UNIT_THEMES` giờ là **const module-level** (đã hoist) — card + roadmap dùng chung.
11. `vite-plugin-pwa`: key workbox là **`urlPattern`** (chữ thường) dạng hàm `({url, sameOrigin}) => …`; dùng `URLPattern`/`self` sẽ lỗi TS.
12. Chế độ truyện `ExploreSceneStage`: vòng lặp TTS tuần tự phải kiểm tra **`storyCancelRef.current` sau mỗi await**
    và cleanup `speechSynthesis.cancel()` chỉ chạy lúc **unmount** (`return () => …`), không chạy lúc mount.
13. Gap detector dùng `ClassRoom.findOne({_id, teacher, deletionPending: {$ne:true}})` làm quyền truy cập;
    ADMIN bỏ qua ràng buộc teacher — cùng pattern với `generateParentNote`.
14. Version backup **3.4.0**: nếu thêm collection mới phải sửa đồng bộ `adminMaintenanceController` (export),
    `restore_system_backup.validateBackup` (accept list), `tests/systemBackup.test.js` + `scripts/verify_early_learning.js`.
15. **`start-all.bat` giờ chạy `npm run dev` (nodemon), không còn `npm start`** — trước đây server chạy plain node
    nên mọi route thêm sau khi khởi động bị 404 "Route not found" (nhìn như API thiếu). Nếu gặp 404 lạ:
    probe không cần token (401/400 = route tồn tại, 404 message có đường dẫn = process cũ) rồi restart backend.

## 5. Nhật ký tiến độ

| Ngày | Việc | Trạng thái |
| --- | --- | --- |
| 01/11 | Package A hoàn tất: duyệt bài về nhà, revision append-only, family report + tests 13/13 | ✅ |
| 01/11 | Account recovery (trẻ: 2 bạn bí mật; cô: mã 6 ký tự) full-stack + 10 tests | ✅ |
| 01/11 | Redesign lộ trình (JourneyRoadmap SVG + motion) & huy hiệu (sunburst/glint/sparkle/stagger) + lib `motion` | ✅ |
| 01/11 | **3.3** Badge streak/hoàn hảo/sưu tầm rương (5 badge mới + reqType streak tự fetch) | ✅ |
| 01/11 | **3.6** `ScheduleReminders` — Notification trước giờ dạy 15', chống lặp theo ngày/slot | ✅ |
| 01/11 | **3.5** PWA: vite-plugin-pwa + manifest + sw.js (precache 1370, cache ảnh/audio/fonts) | ✅ |
| 01/11 | **3.4** "Cùng Koko đọc truyện" trong ExploreSceneStage (SpeechSynthesis + lật từ tự động) | ✅ |
| 01/11 | **3.2** Spotlight BadgeShowcaseModal + stepping stones lên motion stagger | ✅ |
| 01/11 | **3.7** AI Gap Detector lớp: service + API + panel TeacherHome + 3 test (BE 102/102, FE 54/54, build+PWA OK) | ✅ |
| — | Cổng phụ huynh 3.1 (theo yêu cầu: tạm gác) & Koko Object Hunter | ⏳ |
| 01/11 | Bản đồ hành trình đổi sang **quần đảo** (islands + biển + thuyền), sửa lỗi vòng amber nhấp nháy (`map-pulse-ring` removed) | ✅ |
| 01/11 | Bản đồ quần đảo **v2: nằm ngang tràn khung** (serpentine 3×1000px) + nền ảnh adventure của app | ✅ |
| 01/11 | Kiểm toán API: 189 route backend vs 185 lời gọi client — không thiếu route nào; 5 endpoint 404 do **server chạy `npm start` cũ** → restart nodemon + sửa `start-all.bat` sang `npm run dev`; probe lại 20/20 LIVE | ✅ |
