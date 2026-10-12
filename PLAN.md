# KẾ HOẠCH NÂNG CẤP TOÀN BỘ HỆ THỐNG KCEnglishKids — v2

**Ngày lập:** 2026-10-10 · **Phiên bản:** 2 (thay thế hoàn toàn bản v1)

Phạm vi: audit toàn bộ 3 phân hệ — `KCEnglishKids_BE` (Express + Mongoose), `client` (React trẻ em + giáo viên), `admin` (React quản trị).
Căn cứ: 4 nhận xét mới nhất của GVHD + kết quả đọc code toàn dự án.

### Nguyên tắc điều hành của bản v2

1. **CODE TRƯỚC — TÀI LIỆU SAU.** Toàn bộ mục §8 được dời xuống **Phase 9, làm cuối cùng**. Lý do: viết tài liệu trước khi code ổn định là viết lại 2 lần.
2. **Mọi ID công việc giữ nguyên như bản v1** (`1.1.1`, `2.2.3`, `3.1.5`…) — chỉ **thứ tự thực thi** thay đổi. Thứ tự nằm ở bảng Phase đầu file.
3. **§1.2 đã được viết lại hoàn toàn** — bỏ nhánh "chọn hướng A hay hướng B", thay bằng thiết kế reward đã chốt.
4. Mọi đường dẫn dưới đây là **tương đối so với `D:\Dulieu\KLTN\KCEnglishKids`**.

---

## MỤC LỤC

- [Cách dùng file này](#cách-dùng-file-này)
- [Lộ trình 9 Phase](#lộ-trình-9-phase)
- [0. Hiện trạng chức năng](#0-hiện-trạng-chức-năng)
- [1. P0-A — 4 nhận xét của giáo viên](#1-p0-a--4-nhận-xét-của-giáo-viên)
- [2. P0-B — Chặn build & chết demo](#2-p0-b--chặn-build--chết-demo)
- [3. P0-C — Bảo mật dữ liệu trẻ em](#3-p0-c--bảo-mật-dữ-liệu-trẻ-em)
- [4. P1-A — Sai nghiệp vụ backend](#4-p1-a--sai-nghiệp-vụ-backend)
- [5. P1-B — Sai nghiệp vụ frontend](#5-p1-b--sai-nghiệp-vụ-frontend)
- [6. P1-C — Admin portal thiếu so với tài liệu](#6-p1-c--admin-portal-thiếu-so-với-tài-liệu)
- [7. P2 — Nợ kỹ thuật & dọn dẹp](#7-p2--nợ-kỹ-thuật--dọn-dẹp)
- [8. Đồng bộ tài liệu — LÀM CUỐI (Phase 9)](#8-đồng-bộ-tài-liệu--làm-cuối-phase-9)
- [9. Checklist nghiệm thu trước bảo vệ](#9-checklist-nghiệm-thu-trước-bảo-vệ)

---

## CÁCH DÙNG FILE NÀY

### Ba kỷ luật bắt buộc

| # | Kỷ luật | Vì sao |
|---|---|---|
| 1 | **Một lần chỉ làm MỘT mục con** (ví dụ chỉ `1.2.4`, không phải "làm §1.2") | Mỗi mục con là một đơn vị verify được. Làm cả §1.2 một lúc = không biết chỗ nào hỏng |
| 2 | **Verify trước, code sau** — mọi `file:dòng` trong file này phải được đối chiếu lại với code hiện tại | Số dòng trôi rất nhanh sau mỗi lần sửa. Plan này lập ngày 2026-10-10 |
| 3 | **Tick `[x]` ngay sau khi xong** một mục | Đây là cơ chế chống quên duy nhất; đồng thời cho thấy tiến độ với GVHD |

### Ba mẫu prompt dùng với file này

**(a) Kiểm tra một mục còn đúng không — trước khi code:**
```
Đọc D:\Dulieu\KLTN\KCEnglishKids\PLAN.md mục §<số>.
Đối chiếu từng file:line trong mục đó với code hiện tại,
báo chỗ nào còn đúng / chỗ nào đã lệch. CHƯA sửa gì cả.
```

**(b) Thực thi một mục:**
```
Thực hiện mục <số> trong PLAN.md.
- Làm đúng các subtask đã liệt kê, KHÔNG mở rộng phạm vi
- Tuân thủ ràng buộc ghi trong mục đó (nếu có)
- Xong chạy: cd client && npx tsc -b --pretty false  → báo kết quả
- Tick các checkbox đã hoàn thành trong PLAN.md
```

**(c) Chốt một Phase:**
```
Chạy `cd client && npm run build` và `cd admin && npm run build`.
Cập nhật §9 checklist nghiệm thu theo kết quả THẬT (không đoán).
Liệt kê những file:line ở các Phase sau đã bị lệch do sửa đổi vừa rồi.
```

> Ba thành phần **bắt buộc** trong mọi prompt: **ID mục** + **hàng rào phạm vi** ("không mở rộng") + **lệnh verify**. Thiếu một trong ba là sẽ nhận về code lan man.

---

## LỘ TRÌNH 9 PHASE

**Tổng khối lượng: ~30 công-ngày.**

| Phase | Tên | Mục | Công | Cắt được? |
|---|---|---|---|---|
| **0** | Làm xanh build | §2.1 | 0.5 | ❌ KHÔNG |
| **1** | Thông luồng học cốt lõi | §2.2, §2.3 | 1.5 | ❌ KHÔNG |
| **2** | **4 nhận xét của GVHD** | §1.4 → §4.11 → §1.2 → §1.3 → §1.1 | 8 | ❌ KHÔNG |
| **3** | Bảo mật dữ liệu trẻ em | §3 | 2.5 | ❌ KHÔNG (trừ §3.4.7) |
| **4** | Content & game engine | §2.4, §2.5, §2.6 | 3 | ⚠️ Một phần |
| **5** | Đúng nghiệp vụ backend | §4 | 3 | ⚠️ Một phần |
| **6** | Đúng nghiệp vụ frontend | §5 | 3 | ⚠️ Một phần |
| **7** | Admin portal | §6 | 3 | ✅ Cắt nhiều được |
| **8** | Nợ kỹ thuật & kiểm thử | §7 | 3 | ✅ Cắt nhiều được |
| **9** | **TÀI LIỆU (làm cuối)** | §8 | 2.5 | ❌ KHÔNG |

> Nếu chỉ còn 4 tuần (~24 công-ngày): phải cắt ~6 ngày. Cắt theo đúng thứ tự dưới.

### Thứ tự cắt khi hết thời gian

| # | Cắt gì | Thay bằng | Tiết kiệm |
|---|---|---|---|
| 1 | §7.2 tách file >600 dòng | không làm | 1.0 ngày |
| 2 | §6.2–6.5 Admin CRUD | §6.8 thu hẹp Bảng 1.1 trong `.docx` | 2.0 ngày |
| 3 | §7.4.2–7.4.3 bật `strict` + oxlint | chỉ giữ §7.4.4 | 0.5 ngày |
| 4 | §2.4.3(a) viết engine mới | §2.4.3(b) đổi 30 activity trong seed | 1.0 ngày |
| 5 | §4.6(b) tích hợp email | §4.6(a) default `'DRAFT'` | 1.0 ngày |
| 6 | §7.7.3 vùng chạm ≥44px | chỉ sửa 3 nút hay dùng nhất | 0.5 ngày |

> **Tuyệt đối không cắt:** Phase 0, Phase 1, Phase 2, §3.1, §3.2.1, §3.5.1, §8.

### Đồ thị phụ thuộc

```
§2.1 build xanh
 ├──> §2.2 + §2.3  (luồng học chạy được — KHÔNG có cái này thì §1.2 không test được)
 │       ├──> §4.11  (định nghĩa "lesson complete" = Progress.completed)
 │       │       └──> §1.2  REWARD  ──> §1.3  UI KHO BÁU
 │       └──> §2.4 engine (song song được)
 ├──> §1.4  Unit–Lesson   (độc lập, rẻ nhất → làm NGAY sau §2.1)
 └──> §1.1  roster A-Z    (độc lập; cần §4.1 + §4.2 nếu chọn port file chết ở 1.1.10)

§3  bảo mật   (độc lập về code, nhưng PHẢI xong trước khi demo công khai)
§8  tài liệu  (PHẢI sau TẤT CẢ — vì số liệu trong tài liệu lấy từ code đã chốt)
```

**Phụ thuộc dễ bỏ sót nhất:** §1.2 **không thể làm đúng trước §4.11**. `lessonController.js:49` đang định nghĩa "hoàn thành bài" bằng `ar.stars > 0`, trong khi `Progress.js:23` **đã có sẵn** field `completed: Boolean`. Nếu cấp rương báu theo định nghĩa sai, trẻ chỉ cần may mắn ở 1 activity là được thưởng cả Unit — và hệ thống reward trở thành một chức năng giả mới, đúng thứ hội đồng sẽ chất vấn.

---

## 0. Hiện trạng chức năng

### 0.1 Đánh giá theo module

| Module | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập trẻ (avatar + PIN 4 số) | ✅ Chạy | Nhưng **không giới hạn số lần thử sai**, avatar trùng lặp giữa các bé |
| Đăng nhập Admin / Teacher (JWT) | ✅ Chạy | `changePin` ghi đè cả `password` |
| Curriculum 3 Book / 27 Unit / 108 Lesson / 234 Activity | ✅ Seed đủ | Chỉ **Book 1 – Unit 5** có nội dung giàu; còn lại phần lớn là `LISTEN_CHOOSE` sinh tự động |
| Luồng học 3 chặng của trẻ | ⚠️ Hỏng một phần | Chặng 1 **kẹt vô hạn**; Chặng 2 **không lưu gì**; chỉ Chặng 3 ghi DB |
| 12 mini-game engine | ⚠️ Thiếu 6 loại | Backend có 18 `activityType`, client chỉ xử lý 12; 6 loại rơi vào engine sai |
| Arcade (chơi tự do) | ❌ Sao không lưu | Tính sao cục bộ, không gọi API → reload là mất |
| Sao / Huy hiệu / Sticker | ❌ Không persist | Backend **không có model Badge/Sticker/Reward**; sticker ở localStorage |
| Rương báu cuối Unit ("mở khóa sao") | ❌ Nút no-op | `handleClaim` chỉ đóng modal |
| Sổ từ vựng / VocabularyMastery | ⚠️ Rò rỉ | Filter `length === 24` loại nhiều id; mastery không sinh sao |
| Giáo viên: danh sách lớp | ⚠️ Chưa xong | Không sort, không collation tiếng Việt |
| Giáo viên: giao bài (Assignment) | ⚠️ Nằm trong file chết | Chỉ tồn tại ở `TeacherDashboardPage.tsx` — **không được route** |
| Giáo viên: phiên học trên lớp (ClassroomSession) | ⚠️ Chạy nhưng nguy hiểm | Endpoint GET **có side-effect xóa** session của giáo viên khác |
| Giáo viên: nhận xét trẻ (TeacherNote) | ⚠️ API có, UI chết | Nằm trong file chết |
| Phụ huynh: thông báo (ParentNotification) | ❌ Stub | Không có kênh gửi thật nhưng hardcode `status: 'SENT'` |
| Admin: dashboard KPI | ✅ Chạy thật | Số liệu `countDocuments`, không hardcode |
| Admin: quản lý người dùng | ✅ Chạy | Response **trả kèm hash password + PIN** |
| Admin: quản lý chủ đề / bài học / activity / từ vựng / media / nhóm tuổi | ❌ Không có | Chỉ xem curriculum read-only + toggle trạng thái topic |
| Admin: nhật ký hệ thống (AuditLog) | ⚠️ Một phần | Chỉ 4/6 action được ghi |
| Build production `client` | ❌ FAIL | 6 lỗi TypeScript |
| Build production `admin` | ✅ Pass | — |
| Kiểm thử tự động | ❌ Không có giá trị | `test-api.js` phủ 13/74 endpoint, **không có assertion**, luôn exit 0 |

### 0.2 Số liệu quy mô

| Hạng mục | Số lượng |
|---|---|
| Endpoint backend | 74 (11 file routes, 12 controllers) |
| Endpoint public không cần token | 20 — trong đó **11 endpoint phải khóa** |
| Mongoose model | 21 (2 model mồ côi về API: `LanguageContent`, `AuditLog` chỉ ghi không đọc đủ) |
| File `.tsx` phía client > 600 dòng | 6 (lớn nhất `LiveSessionPage.tsx` 1468 dòng) |
| Code chết phía client | `TeacherDashboardPage.tsx` 1382 + `VocabularyCard.tsx` 71 + `App.css` 184 = **1637 dòng** |
| Số lần dùng `any` phía client | 164 |
| URL ảnh Unsplash hardcode | 25 (mất mạng là vỡ toàn bộ demo) |
| Error Boundary | **0** — mọi lỗi render = trắng màn hình |

---

## 1. P0-A — 4 nhận xét của giáo viên

> Đây là nhóm **phải làm đầu tiên**, vì là nhận xét trực tiếp của GVHD.
> **Thứ tự thực thi trong nhóm: §1.4 → §4.11 → §1.2 → §1.3 → §1.1.**

### 1.4 "Sửa lại Unit- bài thành Unit - Lesson. ở phần đầu"

*(Đặt lên đầu vì rẻ nhất — ~30 phút, xong là báo thầy được ngay.)*

**Đã tìm thấy đúng chuỗi cần sửa** (phần đầu = nhãn yêu cầu ở đầu thẻ huy hiệu):

| # | File:dòng | Hiện tại | Sửa thành |
|---|---|---|---|
| 1 | `components/child/BadgeShowcaseModal.tsx:45` | `` `${badge.requirement} Unit bài học 🎒` `` | `` `${badge.requirement} Unit – Lesson 🎒` `` |
| 2 | `components/child/ChildBadgesModal.tsx:240` | `` {badge.reqType === 'star' ? '⭐' : 'bài'} `` | thêm nhánh `unit` → `Unit`, `lesson` → `Lesson` |
| 3 | `pages/child/ChildHomePage.tsx:688` | y hệt dòng 240 (copy-paste) | y hệt |

Lỗi ở #2 và #3 là **nhãn sai cho huy hiệu dạng unit**: `b_unit_1`, `b_unit_3`, `b_unit_5`, `b_unit_all`, `b_chest` (`data/badges.ts:35, 125, 140, 155, 294`) đều hiện "2/3 **bài**" trong khi đúng ra là "2/3 **Unit**".

**Việc cần làm:**

- [ ] **1.4.1** Sửa 3 vị trí trên. Tốt nhất viết 1 hàm dùng chung `getReqUnitLabel(reqType)` trong `data/badges.ts` rồi import ở cả 3 nơi — tránh copy-paste lần nữa.
- [ ] **1.4.2** Rà soát các nhãn "bài / bài học" còn lại để thống nhất thuật ngữ **Unit – Lesson** toàn app:
      - `ChildHomePage.tsx:373` — `Unit {unit.unitNumber}: {unit.topicName || unit.storyTitle || 'Bài học'}`
      - `ChildHomePage.tsx:392` — `{completedLessonCount} / {totalLessonCount} bài đã xong`
      - `ChildHomePage.tsx:402` — `'Khám phá bài học'`
      - `ChildHomePage.tsx:470` — `{topic.lessonCount || 0} bài học`
      - `ChildHomePage.tsx:238` — `'Hành trình 9 Unit phiêu lưu'` (hardcode số 9)
      - `ChildHomePage.tsx:792` — lặp lại dòng 373
      - `SecretGiftModal.tsx:179, 188` — `{completedLessons}/{totalLessons} bài học`
      - `LessonDetailPage.tsx:190, 205, 367, 393, 400, 484, 569`
      - `BigInteractiveFlashcard.tsx:106, 579`
      - `ChildVocabNotebookSection.tsx:257`
      - `TeacherDashboardPage.tsx:801, 1288, 1300, 1321` (file chết — chỉ sửa nếu chọn port ở 1.1.10)
- [ ] **1.4.3** Tạo bảng thuật ngữ dùng chung `client/src/data/labels.ts` — chốt: **"Unit"** giữ nguyên tiếng Anh, **"Lesson"** thay cho "bài / bài học" ở mọi nhãn đếm và tiêu đề cấp 2. Tài liệu `.docx` cũng phải theo bảng này (xem §8, làm ở Phase 9).
- [ ] **1.4.4** Đồng bộ phía giáo viên: `TeacherDashboardPage.tsx:463` (`Unit ${unit.unitNumber}: ${unit.title}`), `:1264` ("1. Chọn Unit giáo trình *"), `:1288` ("2. Chọn Bài học (Lesson) *") — đang dùng lẫn lộn.
- [ ] **1.4.5** Đồng bộ phía admin: `admin/src/pages/AdminDashboardPage.tsx:318, 344, 362, 382` đang dùng "Curriculum Units", "27 Units", "Unit {n}" — kiểm tra nhất quán.

**Tiêu chí nghiệm thu:** grep `"Unit bài"` = 0 kết quả; huy hiệu dạng unit hiện đúng đơn vị "Unit"; thuật ngữ Unit/Lesson nhất quán ở cả 3 phân hệ (tài liệu đối chiếu sau, ở Phase 9).

---

### 1.2 "Xem và mở khóa ngôi sao (2 chức năng trong 1) đang bị sai vì chỉ xem không mở khóa được"

> **Đây là mục lớn nhất của Phase 2 (~4 công-ngày) và là mục đã được thiết kế lại hoàn toàn ở bản v2.** Bản v1 để ngỏ 2 hướng A/B — đã chốt.

#### 1.2.0 Chẩn đoán

Màn hình bị GVHD nói tới là `client/src/components/child/SecretGiftModal.tsx` — "Rương báu Unit". **6 nguyên nhân gốc:**

1. `SecretGiftModal.tsx:54-58` — `handleClaim` **hoàn toàn rỗng về nghiệp vụ**:
   ```ts
   const handleClaim = () => { sfx.playPop(); onClose(); if (onContinue) onContinue(); };
   ```
   Không gọi API, không ghi localStorage, không cộng sao.

2. **2 chức năng bị gộp vào 1 modal** — nhánh locked sneak-peek ở `SecretGiftModal.tsx:146-204`, nhánh "Rương Báu Mở Khóa!" ở `:82-145`. Nút vào ở `ChildHomePage.tsx:920-974`, nhãn đổi theo `unit.isCompleted ? 'Mở quà ➔' : 'Xem rương'` (`ChildHomePage.tsx:971`).

3. Ba phần thưởng chỉ là **chữ tĩnh**: "+5 Sao Vàng" (`SecretGiftModal.tsx:110-116`), "Huy Hiệu Unit" (`:119-125`), "Sticker Mới" (`:128-134`).

4. Backend **không có bất kỳ endpoint claim/reward/badge/sticker nào** — grep `claim|reward|bonus|badge|sticker` trong `KCEnglishKids_BE/src` chỉ trúng 1 dòng text tiếng Anh trong `src/seeds/lessonData.js:696`. Trong 21 model **không có model phần thưởng**.

5. **Client đọc 2 field không tồn tại trên model.** `Progress.js` chỉ có `child, topic, lesson, completed, stars, highestScore, attempts, weakVocabulary` — **không có `totalStars`, không có `completedLessonsCount`**. Nhưng `ChildHomePage.tsx:171-173` đọc cả hai:
   ```tsx
   const totalStars = progress?.totalStars || units.reduce((acc, u) => acc + (u.totalUnitStars || 0), 0) || 0;
   const completedLessons =
     progress?.completedLessonsCount || units.reduce((acc, u) => acc + (u.completedLessons || 0), 0) || 0;
   ```
   → luôn `undefined`, luôn rơi vào nhánh `reduce`. Chuỗi `||` còn làm **giá trị 0 hợp lệ bị coi là falsy** (xem §7.3.3).

6. Prop `completedUnits` **không bao giờ được truyền** vào `ChildBadgesModal` (`ChildHeader.tsx:253-259`, `ChildBottomNav.tsx:111-117`, `ChildHomePage.tsx:1028-1033`) dù đã tính sẵn ở `ChildHomePage.tsx:175` → **5 huy hiệu `reqType: 'unit'` vĩnh viễn khóa** (`data/badges.ts:35, 125, 140, 155, 294`). Trong khi tab inline `?tab=badges` (`ChildHomePage.tsx:522-532`) lại mở được → **cùng một dữ liệu, hai nơi hiển thị mâu thuẫn**.

#### 1.2.1 Quyết định kiến trúc (ĐÃ CHỐT — thay cho nhánh A/B của bản v1)

> **Tách "quyền sở hữu phần thưởng" khỏi "khoảnh khắc mở quà".**
> Backend **cấp phát tự động** khi Unit hoàn thành. Client chỉ **bóc tem** (lễ mở quà).
> Nút "Mở quà" là cosmetic + idempotent — **không phải điều kiện để có quà**.

Lỗi hiện tại **không phải** là "thiếu API" — mà là *quyền sở hữu phần thưởng bị treo vào một nút bấm không làm gì*. Thiết kế mới xử lý cả 3 vế trong nhận xét của thầy:

| Vấn đề GVHD nêu | Thiết kế mới giải quyết thế nào |
|---|---|
| "2 chức năng trong 1" | Tách thành **2 màn / 2 route**: kệ rương (chỉ xem) và lễ mở quà (animation) |
| "chỉ xem không mở khóa được" | Mở khóa **xảy ra ở server, trước khi có nút**. Không còn trạng thái "có quà mà không lấy được" |
| "đang bị sai" | Sao thưởng nằm trong `UnitCompletion.rewards[]`, cộng vào `totalStars` do server tính → reload vẫn còn, không phụ thuộc localStorage |

**Vì sao không chọn thuần một hướng:**

- **Bỏ hẳn nút** → mất khoảnh khắc "wow" vốn là thứ giữ chân trẻ 3–6 tuổi, và mất luôn một điểm nhấn khi trình bày đồ án.
- **Giữ nút claim thật** (nút quyết định có quà hay không) → giữ nguyên đúng cấu trúc rủi ro đã gây lỗi: một lần `await` fail là trẻ bấm mà không có quà. Đó chính xác là điều thầy đang chê.

Hướng đã chốt lấy phần tốt của cả hai: có lễ mở quà, nhưng lễ đó **không nắm quyền sở hữu**.

#### 1.2.2 Quy tắc derive vs materialize

> **Thứ tính lại được từ dữ liệu đã có → DERIVE (không lưu).
> Thứ là sự kiện một-lần → MATERIALIZE (lưu thành document).**

| Đối tượng | Quyết định | Lý do |
|---|---|---|
| Huy hiệu (20 cái) | **DERIVE** từ `Progress` + `UnitCompletion` | Là hàm thuần của tiến độ; lưu ra là có 2 nguồn sự thật, lệch nhau ngay |
| Trạng thái sticker (đã mở / chưa mở) | **DERIVE** từ `UnitCompletion.rewards[]` | Sticker được cấp = sự kiện (materialize); "đã bóc tem" = trạng thái hiển thị (derive từ `revealedAt`) |
| `totalStars` | **DERIVE** = `Σ Progress.stars` + `Σ bonusStars` | Không bao giờ ghi sao thưởng vào `Progress.stars` — mất khả năng phân biệt sao-thật / sao-thưởng |
| Hoàn thành Unit | **MATERIALIZE** (`UnitCompletion`) | Là sự kiện một-lần, có thời điểm, cần idempotency |

#### 1.2.3 Việc cần làm — Backend

- [ ] **1.2.4** Tạo `KCEnglishKids_BE/src/models/UnitCompletion.js` — một document / (child, unit):
      ```js
      const UnitCompletionSchema = new Schema({
        child:       { type: ObjectId, ref: 'User', required: true },
        unit:        { type: ObjectId, ref: 'CurriculumUnit', required: true },
        unitCode:    String,                        // 'B1_U5' — denormalize cho UI nhanh
        completedAt: { type: Date, default: Date.now },
        source:      { type: String, enum: ['LESSON_PROGRESS', 'MANUAL_SYNC', 'SEED_BACKFILL'] },
        rewards: [{
          type:      { type: String, enum: ['STAR', 'STICKER'], required: true },
          refId:     String,                        // 'st_lion' (chỉ STICKER)
          amount:    Number,                        // chỉ STAR
          grantedAt: { type: Date, default: Date.now }
        }],
        revealedAt: { type: Date, default: null }   // COSMETIC — null vẫn không mất quà
      }, { timestamps: true });

      UnitCompletionSchema.index({ child: 1, unit: 1 }, { unique: true });
      ```
      Lưu ý `rewards[]` **không chứa BADGE** — huy hiệu là derive (1.2.2), không phải sự kiện.

- [ ] **1.2.5** Tạo `src/services/rewardService.js` — idempotent bằng unique index, `create()` + bắt E11000, **không** `findOne` rồi `new`:
      ```js
      const STAR_BONUS_PER_UNIT = 5;

      // Tất định + không race: chọn theo unitNumber, KHÔNG theo số unit đã hoàn thành
      const pickSticker = (unit) => {
        const pool = STICKER_POOL_BY_TOPIC[unit.topicCode] ?? DEFAULT_STICKER_POOL;
        return pool[unit.unitNumber % pool.length];
      };

      exports.grantUnitCompletion = async ({ child, unit, source = 'LESSON_PROGRESS' }) => {
        const rewards = [
          { type: 'STAR',    amount: STAR_BONUS_PER_UNIT },
          { type: 'STICKER', refId: pickSticker(unit) }
        ];
        try {
          const doc = await UnitCompletion.create({ child, unit, unitCode: unit.code, source, rewards });
          return { doc, created: true };
        } catch (e) {
          if (e.code === 11000) return { doc: await UnitCompletion.findOne({ child, unit }), created: false };
          throw e;
        }
      };
      ```

- [ ] **1.2.6** Hàm `computeRewards(childId)` — **một nguồn sự thật duy nhất** cho mọi con số:
      ```js
      const [progress, unitCompletions] = await Promise.all([
        Progress.find({ child: childId }),
        UnitCompletion.find({ child: childId })
      ]);
      const earnedStars = progress.reduce((s, p) => s + (p.stars || 0), 0);
      const bonusStars  = unitCompletions.flatMap(u => u.rewards)
                           .filter(r => r.type === 'STAR').reduce((s, r) => s + (r.amount || 0), 0);
      const completedLessons = progress.filter(p => p.completed === true).length;   // dùng field THẬT
      const completedUnits   = unitCompletions.length;
      return { totalStars: earnedStars + bonusStars, earnedStars, bonusStars,
               completedUnits, completedLessons, grantedStickerIds, badges, stickers, chests };
      ```
      **Dùng `Progress.completed` (`Progress.js:23`) — không dùng `ar.stars > 0`.** Đây là lý do §4.11 phải làm trước.

- [ ] **1.2.7** Chuyển catalog huy hiệu + sticker xuống backend (hiện 20 badge ở `client/src/data/badges.ts` 323 dòng, 15 sticker ở `client/src/data/stickers.ts` 161 dòng). Tạo `src/seeds/rewardCatalogData.js` + `GET /api/rewards/catalog` (public, không PII), client fetch một lần rồi cache.
      *Fallback rẻ hơn nếu hết giờ:* giữ catalog ở client, server chỉ trả bộ đếm (`totalStars`, `completedUnits`, `completedLessons`, `grantedStickerIds`) — vẫn đạt "một nguồn sự thật cho các con số"; luật mở khóa nằm client (tamper được, chấp nhận vì huy hiệu là cosmetic).

- [ ] **1.2.8** Bốn endpoint mới:
      ```
      GET  /api/rewards/catalog                                        (public, không PII)
      GET  /api/children/:childId/rewards                              → computeRewards()
      POST /api/children/:childId/rewards/chests/:unitId/reveal        → set revealedAt, idempotent
      GET  /api/admin/rewards/summary                                  → thống kê, đóng một phần gap §6
      ```
      ⚠️ Ba endpoint có `:childId` **PHẢI** đi qua middleware xác thực CHILD + check sở hữu. Đừng lặp lại sai lầm ở `progressRoutes.js:5` (hiện không có middleware nào → IDOR, xem §3.1.2). Trẻ A không được đọc rương trẻ B.

- [ ] **1.2.9** Hook vào `src/services/learningService.js:126-141` (ngay sau khi upsert `Progress`): kiểm tra lesson vừa hoàn thành có phải **lesson ACTIVE cuối cùng** của unit không → gọi `grantUnitCompletion`. Liên kết Lesson→Unit đã có: `Lesson.js:64` (`ref: 'CurriculumUnit'`) — **verify lại đường dẫn field chính xác trước khi code**. `CurriculumUnit` **không** giữ mảng `lessons` → phải query ngược từ `Lesson`.

- [ ] **1.2.10** **Script backfill `src/scripts/backfillUnitCompletions.js`.** Trẻ đã hoàn thành Unit 1–3 trước khi model tồn tại → kệ rương trống trơn vào ngày demo. Quét `Progress`, gom theo unit, tạo `UnitCompletion` với `source: 'SEED_BACKFILL'`, `revealedAt: Date.now()` (tránh 27 chấm đỏ nhấp nháy).
      **Chạy TRƯỚC, không chạy sau.**

#### 1.2.11 Việc cần làm — Frontend

- [ ] **1.2.11** Tạo `client/src/services/rewardService.ts` — một lệnh gọi duy nhất `getRewards(childId)`, cache trong `RewardContext`. Xóa việc tính lại ở 3 nơi (`ChildHomePage.tsx:171`, `ChildBadgesModal.tsx:139-158`, `ChildHomePage.tsx:983-995`).

- [ ] **1.2.12** Thêm type vào `client/src/types/index.ts`: `RewardSummary`, `BadgeItem`, `StickerItem`, `UnitChest`, `RewardType`. Xóa `any` ở `ChildHomePage.tsx:99-100`, `ChildBadgesModal.tsx:36`, và `interface UnitData` cục bộ ở `SecretGiftModal.tsx:7-15`.

- [ ] **1.2.13** **Màn 1 — "Kệ rương"** (route `/child/treasure`, chỉ XEM): 27 rương, cuộn ngang, 3 trạng thái phân biệt bằng **màu + icon** (không chữ):

      | Trạng thái | Hình | Hành vi khi chạm |
      |---|---|---|
      | Chưa xong | 🔒 xám + vòng tiến độ lesson | Hiện vòng tiến độ, không mở |
      | Đã cấp, chưa mở | ✨ sáng + chấm đỏ nhấp nhô | → sang Màn 2 |
      | Đã mở | 🎁 rương mở, thấy vật phẩm | Hiện chi tiết vật phẩm |

- [ ] **1.2.14** **Màn 2 — "Mở quà"**: confetti → nắp rương bật → vật phẩm bay ra tuần tự (sao → sticker) → "Yay!" → tự đóng. Gọi `POST .../reveal`. Nếu request fail → **vẫn chiếu animation** (quà đã thuộc về trẻ từ 1.2.9), chỉ log. Tái sử dụng keyframes `index.css:61-437` (`sunburst-spin`, `badge-float`, `puffy-sticker`, `shimmer-sweep`).

- [ ] **1.2.15** **Xóa `SecretGiftModal.tsx`** sau khi 2 màn trên chạy. Không "sửa tại chỗ" — file này chính là hiện thân của việc gộp 2 chức năng.

- [ ] **1.2.16** **Bỏ `awardRandomSticker`** (`stickers.ts:144-160`) và kênh cấp sticker duy nhất ở `ResultModal.tsx:38-57`. Ngẫu nhiên → trẻ không hiểu nhân-quả, không tái hiện được ảnh chụp đồ án (cùng bệnh với `sort(() => Math.random()-0.5)` ở `activityData.js:74`).

- [ ] **1.2.17** Truyền `completedUnits` vào `<ChildBadgesModal>` tại `ChildHeader.tsx:253-259`, `ChildBottomNav.tsx:111-117`, `ChildHomePage.tsx:1028-1033`.
      *(Nếu làm đúng 1.2.11 thì prop này biến mất — component đọc từ `RewardContext`. Ưu tiên cách này.)*

- [ ] **1.2.18** **Xóa sao giả:** `ChildHomePage.tsx:891-893` render `[...Array(lesson.stars || 3)]` → bài chưa học vẫn hiện 3 sao.

- [ ] **1.2.19** **Arcade:** hoặc ghi sao qua `learningApi.submitActivityResult`, hoặc bỏ hiển thị sao. `ChildArcadeSection.tsx:189-201` tự tính cục bộ, file **không import `learningApi`** (import `:1-26`).

- [ ] **1.2.20** Sửa `learningService.js:126-138` — `findOne` + `new Progress()` trên unique index `{child, lesson}` (`Progress.js:61`) → E11000. Đổi sang `findOneAndUpdate(..., {upsert: true})`.

#### 1.2.21 Ràng buộc thiết kế phải tuân thủ

| # | Ràng buộc | Hậu quả nếu vi phạm |
|---|---|---|
| 1 | Reveal **không được** là điều kiện để có quà | Tái hiện đúng bug thầy đang chê |
| 2 | `totalStars` chỉ được tính ở **một** nơi (server) | Hiện có 3 cách tính → % tiến độ mâu thuẫn |
| 3 | Không ghi sao thưởng vào `Progress.stars` | Mất khả năng phân biệt sao-thật / sao-thưởng |
| 4 | Dùng `create()` + catch E11000, không `findOne` + `new` | E11000 khi trẻ bấm nhanh / 2 request song song |
| 5 | Chọn sticker theo `unitNumber`, **không** theo số unit đã hoàn thành | Race → cấp trùng hoặc bỏ sót sticker |
| 6 | 3 endpoint `:childId` phải có auth + check sở hữu | IDOR trên dữ liệu trẻ em |

**Tiêu chí nghiệm thu §1.2:** hoàn thành Unit → `UnitCompletion` xuất hiện trong DB → `totalStars` tăng thật → reload vẫn còn → kệ rương chuyển ✨ → bấm mở có animation → **bấm lần 2 không cấp thêm quà** → xóa localStorage + đăng nhập lại vẫn còn → `curl` endpoint trẻ A bằng token trẻ B trả 403.

---

### 1.3 "Huy hiệu, sao, sticker. Viết lại giao diện phần này sao cho hợp lí nhất có thể"

**Hiện trạng (đã đo):**

| Thành phần | File | Dòng | Vấn đề |
|---|---|---|---|
| Modal huy hiệu | `components/child/ChildBadgesModal.tsx` | 314 | Trùng lặp với tab badges của ChildHomePage |
| Tab huy hiệu inline | `pages/child/ChildHomePage.tsx:522-748` | ~227 | **Copy-paste** thuật toán unlock, grid khác, size khác |
| Chi tiết 1 huy hiệu | `components/child/BadgeShowcaseModal.tsx` | 200 | Overlay chồng overlay |
| Chi tiết 1 sticker | `components/child/StickerShowcaseModal.tsx` | 167 | `rarityMap:47-52` lặp `rarityConfig` của CuteStickerCard |
| Vẽ huy chương | `components/child/CuteRosetteMedal.tsx` | 141 | `:126` icon khóa hardcode `w-6 h-8` bất kể `size` |
| Vẽ sticker | `components/child/CuteStickerCard.tsx` | 140 | OK |
| Rương báu | `components/child/SecretGiftModal.tsx` | 209 | Phần thưởng giả (xem 1.2) → **xóa ở 1.2.15** |
| Kết quả game + trao sticker | `components/child/ResultModal.tsx` | 225 | Kênh cấp sticker **duy nhất** → bỏ ở 1.2.16 |
| Danh sách 20 huy hiệu | `data/badges.ts` | 323 | `color`, `badgeBg` là **field chết** |
| Danh sách 15 sticker | `data/stickers.ts` | 161 | Lưu localStorage key `kc_stickers_<childId>` |
| CSS/animation thưởng | `index.css` | ~150 | OK, giữ lại |
| **Tổng** | | **~1950–2050** | Diện tích viết lại thật ≈ 1500–1800 dòng |

**11 điểm bất hợp lý cần xử lý:**

1. **Hai bản cài đặt song song cho cùng một màn hình** — `ChildBadgesModal` (grid `grid-cols-2 sm:grid-cols-3`, medal `size="sm"`, dòng 190-247) vs tab badges của `ChildHomePage` (grid `...md:grid-cols-4 lg:grid-cols-5`, `size="md"`, dòng 636-695). Sửa một chỗ là lệch chỗ kia.
2. **Modal chồng modal** — `ChildBadgesModal.tsx:290-311` render cả `<BadgeShowcaseModal>` và `<StickerShowcaseModal>`; cả ba đều `fixed inset-0 z-50` → hai lớp overlay tối chồng nhau, không khóa scroll, ESC/back không xác định được lớp nào đóng.
3. **Số lượng huy hiệu bị hardcode lần 2** — `ChildHomePage.tsx:614-616`: `'🐾 Hành trình (10)'`, `'⭐ Ngôi sao (5)'`, `'🎯 Kỹ năng (5)'`, và `:558` `"mở khóa 20 huy hiệu danh giá"`. Sửa `badges.ts` là các con số này sai ngay.
4. **Rương báu nói dối** (xem 1.2).
5. **Sticker gần như không thể kiếm đủ** — đường cấp duy nhất là `ResultModal.tsx:38-57` (`if (stars >= 2) awardRandomSticker(childId)`), **chỉ chạy trong mini-game**. 15 sticker nhưng không có kênh nào từ bài học/unit. `awardRandomSticker` khi đã mở hết thì trả về sticker **không persist**; `useEffect` dep `[stars, childId]` dễ **trao trùng** dưới StrictMode.
6. **Chữ quá nhiều cho trẻ 3–6 chưa biết đọc** — `StickerShowcaseModal.tsx:122, 132-135`, `BadgeShowcaseModal.tsx:113/132/156`, `ChildBadgesModal.tsx:284`, `ChildHomePage.tsx:558-559`. CTA "Vào học để mở khóa ngay 🚀" (`BadgeShowcaseModal.tsx:176-195`) **chỉ gọi `onClose()`, không điều hướng** → bế tắc.
7. **Xung đột thuật ngữ "badge"** — huy hiệu thành tích (`data/badges.ts`) = nhãn độ tuổi của game (`game.badge`, `badgeColor` ở `ChildArcadeSection.tsx:466-604`) = token màu (`headerBadge` ở `ChildHomePage.tsx:259-308`).
8. **Xung đột thuật ngữ "sao"** — tiền tệ (`ChildHeader.tsx:174-194`) = điểm (`ChildArcadeSection.tsx:631-634` in `{score} sao tích lũy` trong khi `:807-810` in `{engineCorrectCount*10} điểm`) = % ghi nhớ (`ChildVocabNotebookSection.tsx:135-142` "⭐ Độ nhớ").
9. **Kích thước/màu không nhất quán** — cùng một badge hiển thị `sm` trong modal và `md` trong tab, kèm 2 kiểu tiêu đề (`ChildBadgesModal.tsx:139-158` banner vs `ChildHomePage.tsx:568-572` chip).
10. **Dead code** — `ChildBottomNav.tsx` nhận `totalStars`, `completedCount` nhưng **không hiển thị** (`:95-108`); nhánh `setShowBadges` không bao giờ chạy vì `ChildHomePage.tsx:1032` luôn truyền `onTabChange={goTab}` → `ChildBadgesModal.tsx:111-117` là code chết.
11. **Kiểu dữ liệu lỏng lẻo** — `types/index.ts` **không có** type Badge/Sticker/Reward (đã xử lý ở 1.2.12).

**Kiến trúc khi viết lại:**

- [ ] **1.3.1** **Một màn hình duy nhất** "Kho báu của bé" với **4 tab**: ⭐ **Sao** · 🏅 **Huy hiệu** · 🎁 **Sticker** · 🔒 **Rương** (tab Rương = Màn 1 của §1.2.13). Thay thế **cả** `ChildBadgesModal` **lẫn** tab badges inline trong `ChildHomePage`. Xóa ~227 dòng inline.
- [ ] **1.3.2** Chi tiết huy hiệu/sticker render dạng **panel trượt trong cùng modal** (không overlay thứ hai), đóng bằng ESC / nút back / chạm nền. **Khóa scroll nền** khi mở. Gộp `BadgeShowcaseModal` + `StickerShowcaseModal` thành 1 component `RewardDetailPanel`.
- [ ] **1.3.3** Toàn bộ số liệu đọc từ `RewardContext` (sinh ra ở 1.2.11) — **không** component nào tự tính unlock nữa.
- [ ] **1.3.4** Số lượng huy hiệu theo nhóm **derive từ catalog** thay vì hardcode ở `ChildHomePage.tsx:614-616`.
- [ ] **1.3.5** **Nguyên tắc "ít chữ" cho trẻ chưa biết đọc**: mỗi thẻ huy hiệu chỉ gồm icon + tên ngắn (≤3 từ) + thanh tiến độ. Mô tả dài và hướng dẫn chuyển vào panel chi tiết (nơi phụ huynh/giáo viên đọc). Nút CTA phải **điều hướng thật** (`navigate('/lessons/...')`), không chỉ `onClose()`.
- [ ] **1.3.6** Tách thuật ngữ: đổi `game.badge` / `badgeColor` (nhãn độ tuổi game) thành `ageTag` / `ageTagColor` trong `ChildArcadeSection.tsx:466-604`. Đổi `headerBadge` thành `headerChip`. Sau khi làm xong, grep `badge` trong `components/child` **chỉ được phép** trỏ tới huy hiệu thành tích.
- [ ] **1.3.7** Một component `<StarRow count={n} max={3} />` dùng chung cho header / unit card / lesson card / result modal. Xóa `lesson.stars || 3`.
- [ ] **1.3.8** Sticker: cấp theo **Unit** (kênh duy nhất, tất định — xem 1.2.5), điều kiện hiện rõ bằng icon. Đã bỏ `awardRandomSticker` ở 1.2.16.
- [ ] **1.3.9** Sửa `CuteRosetteMedal.tsx:126` — icon khóa scale theo prop `size`.
- [ ] **1.3.10** Xóa field chết `color`, `badgeBg` trong `data/badges.ts` (hoặc dùng chúng thật).
- [ ] **1.3.11** Xóa key localStorage `kc_stickers_<childId>` (`stickers.ts:136, 155`) + migration một-lần cho dữ liệu cũ (đọc key → bỏ qua, không ghi nữa). Xóa dead code `ChildBottomNav.tsx:95-117`.
- [ ] **1.3.12** Giữ lại toàn bộ keyframes/class trong `index.css:61-437` (`soft-bounce`, `pulse-glow`, `sunburst-spin`, `badge-float`, `shimmer-sweep`, `jelly-press`, `ribbon-flutter-*`, `medal-coin-*`, `puffy-sticker`, `holographic-foil`) — phần này làm tốt, chỉ tái sử dụng.

**Tiêu chí nghiệm thu §1.3:** chỉ còn **một** chỗ hiển thị huy hiệu; không còn overlay chồng; số sao/huy hiệu/sticker **giống nhau ở mọi màn hình và khớp header**; trẻ bấm vào huy hiệu chưa mở → được dẫn tới bài học cần làm; xóa localStorage + đăng nhập lại → huy hiệu vẫn còn.

---

### 1.1 "Chưa xong cái danh sách học sinh từ A-Z khi xem danh sách lớp"

**Nguyên nhân gốc (5 lớp chồng nhau):**

1. `KCEnglishKids_BE/src/controllers/teacherController.js:26` — `getClassDetail` populate `students` mà **không có `.sort()`**. `ClassRoom.students` là mảng ObjectId thuần (`src/models/ClassRoom.js:33-38`), nên thứ tự hiển thị = thứ tự `$addToSet` lúc thêm bé (`teacherController.js:43`) = tăng dần theo ObjectId, không phải A-Z. `getTeacherClasses:21` cũng populate students không sort.
2. Nghịch lý: 2 endpoint khác **có** sort — `teacherController.js:37` (`getEligibleStudents`) và `:51` (`getStudents`) đều `.sort({ name: 1 })`. Chỉ endpoint chi tiết lớp bị bỏ sót.
3. Toàn repo **không có một lệnh `localeCompare` hay `.collation()` nào** → kể cả thêm `.sort({name:1})`, MongoDB vẫn sort theo code point, tên Việt có dấu (Ánh, Ể, Ộ) bị đẩy xuống cuối → vẫn sai A-Z kiểu Việt Nam.
4. **🔴 Metric trắng ở màn đang chạy thật** *(mới phát hiện, mức nghiêm trọng cao hơn bản v1)*: `statsFor` (`teacherController.js:9`) trả về `{ _id, averageScore, stars, attempts, learningTime, lastActivity }`, và `:28` fallback `{ averageScore: 0, stars: 0, attempts: 0, learningTime: 0 }` — **không có `totalStars`, không có `completedLessons`**. Nhưng `TeacherWorkspace.tsx:38` (bản thật, đang chạy — `TeacherStudentDetail`) render `<Metric label="Stars" value={stats.totalStars}/>` và `<Metric label="Completed lessons" value={stats.completedLessons}/>` → **cả hai ô hiện TRẮNG ở màn chi tiết học sinh của giáo viên.** Bản v1 mô tả lỗi này như chỉ có trong file chết — **sai**.
5. Màn hình đang chạy thật là `client/src/dashboards/teacher/TeacherWorkspace.tsx:25` (`TeacherClassDetail`) — cũng không sort, không có error state. Còn màn roster **đẹp và đầy đủ hơn** lại nằm trong `TeacherDashboardPage.tsx:692-816` — **file chết, không được route**.

**Việc cần làm:**

- [ ] **1.1.1** Tạo util sắp xếp tên tiếng Việt dùng chung: `client/src/utils/sortStudents.ts`
      ```ts
      export const byNameVi = (a: {name: string}, b: {name: string}) =>
        a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
      ```
      Lưu ý: tên Việt sắp xếp theo **tên** trước, họ đệm sau (Nguyễn Văn **An** < Trần Văn **Bình**). Nếu muốn đúng chuẩn Việt Nam thì tách từ cuối làm khóa chính.
- [ ] **1.1.2** Backend: thêm sort + collation vào `teacherController.js:24-29`
      ```js
      .populate({ path: 'students', select: '...', options: { sort: { name: 1 } } })
      ```
      hoặc sort lại trong controller sau khi populate. Thêm `.collation({ locale: 'vi', strength: 2 })` cho các query `.sort({name:1})` ở `:21`, `:26`, `:37`, `:51`.
- [ ] **1.1.3** Bổ sung field còn thiếu vào populate (`teacherController.js:26`): `contact`, `parentContact`, `status`, `assignedClass` — hiện dòng "Phụ huynh:" ở `TeacherDashboardPage.tsx:787-791` **không bao giờ hiện** vì `student.contact` là `undefined`.
- [ ] **1.1.4** Sửa `statsFor` (`teacherController.js:9`) — hai lựa chọn:

      | | Cách làm | Đánh giá |
      |---|---|---|
      | **(a) Khuyến nghị** | Backend thêm `totalStars: { $sum: '$stars' }` vào `$group` ở `teacherController.js:9`, và `completedLessons` lấy từ `Progress` với `completed: true` | Đúng vì `TeacherDashboardPage.tsx:798, 801` và `SessionSummaryPage.tsx:120` **cũng** đọc `totalStars` — sửa client thôi là còn 2 chỗ lệch |
      | (b) Rẻ | Client đổi `stats.totalStars` → `stats.stars` và bỏ metric `completedLessons` | Chỉ vá được màn đang route; mất thông tin |

- [ ] **1.1.5** Tách 1 component dùng chung `client/src/components/teacher/StudentRosterTable.tsx` — hiện có **4 nơi** render roster với 4 cách khác nhau: `TeacherWorkspace.tsx:25`, `TeacherDashboardPage.tsx:763`, `LiveSessionPage.tsx:598 / 824 / 1009`, `SessionSummaryPage.tsx:151`.
- [ ] **1.1.6** Thêm đủ 4 trạng thái cho màn roster: loading (đã có `<Loader/>`), **empty** (lớp 0 học sinh), **error** (hiện `.then()` không có `.catch()`), success.
- [ ] **1.1.7** Thêm ô tìm kiếm + sắp xếp theo cột (tên / nhóm tuổi / sao / tiến độ) vào `TeacherClassDetail`.
- [ ] **1.1.8** Bỏ hardcode: `TeacherDashboardPage.tsx:785` (`Mã PIN: ****`, `|| '3-4'`), `:724` (`'2026-2027'`), `:777` (emoji 🦁).
- [ ] **1.1.9** Admin: `adminController.js:132` đang sort `createdAt: -1` → đổi thành sort theo tên + thêm pagination (hiện `limit(50)` cố định ở `:334-349`).
- [ ] **1.1.10** **Quyết định cần chốt:** xóa `TeacherDashboardPage.tsx` (1382 dòng chết) hay port nó thành bản thật? → **Khuyến nghị: port**. File chết này chứa toàn bộ UI giao bài tập / nhận xét trẻ / nội dung bài dạy mà `TeacherWorkspace.tsx` (38 dòng) không có. Nếu xóa thì mất luôn 3 tính năng đã viết. **Lưu ý: port thì phải làm §4.1 và §4.2 trước.**

**Tiêu chí nghiệm thu §1.1:** mở danh sách lớp 18 bé → tên hiển thị đúng A-Z tiếng Việt (có dấu), đủ cột sao / số bài / liên hệ phụ huynh, có search, có empty/error state, **không còn ô nào trống hay "0"**, và **không ô metric nào hiện trắng** ở màn chi tiết học sinh.

---

## 2. P0-B — Chặn build & chết demo

### 2.1 Build production của `client` đang FAIL — **PHASE 0, làm trước hết**

Đã kiểm chứng bằng `npx tsc -b --pretty false` trong `client/` — **6 lỗi**:

```
src/pages/child/ChildHomePage.tsx(9,3): error TS6133: 'BookOpen' is declared but its value is never read.
src/pages/child/ChildHomePage.tsx(71,9): error TS6133: 'userLevel' is declared but its value is never read.
src/utils/audio.ts(156,21): error TS18047: 'ctx' is possibly 'null'.
src/utils/audio.ts(157,22): error TS18047: 'ctx' is possibly 'null'.
src/utils/audio.ts(160,27): error TS18047: 'ctx' is possibly 'null'.
src/utils/audio.ts(165,22): error TS18047: 'ctx' is possibly 'null'.
```

Vì `package.json` khai `"build": "tsc -b && vite build"` → **không tạo được `dist`, không deploy được**.

- [ ] **2.1.1** `utils/audio.ts` — thêm `if (!ctx) return;` ngay sau `:153` (`const ctx = this.getContext();`).
- [ ] **2.1.2** `ChildHomePage.tsx:9` — xóa `BookOpen` khỏi import; `:71` — xóa biến `userLevel` (hoặc dùng nó).
- [ ] **2.1.3** Thêm script `"typecheck": "tsc -b --noEmit"` vào `client/package.json` và `admin/package.json`, chạy trước mỗi lần commit.
- [ ] **2.1.4** `admin/` build sạch — không cần sửa.

**Tiêu chí nghiệm thu §2.1:** `cd client && npm run build` → pass, có `dist/`.

### 2.2 Bốn bug giết demo trực tiếp — **PHASE 1**

> Phải làm **trước §1.2**: nếu bé kẹt ở Chặng 1 thì không bao giờ hoàn thành Lesson → không bao giờ hoàn thành Unit → **không có cách nào test hệ thống reward**.

- [ ] **2.2.1 Bé KẸT VĨNH VIỄN ở Chặng 1.** `BigInteractiveFlashcard.tsx:206` — `setDeck(prev => [...prev, currentItem])`: bấm "Chưa nhớ" nhét lại từ vào cuối bộ bài **vô hạn**. Điều kiện kết thúc `:93` (`currentIndex >= deck.length`) không bao giờ đạt → **màn hình hoàn thành Chặng 1 không bao giờ hiện → bé không sang Chặng 2 được**. Sửa: giới hạn tối đa 1 lần lặp/từ (đếm `repeatCount`).
- [ ] **2.2.2 Đáp án TỰ ĐẢO dưới ngón tay bé.** `InteractivePracticeStudio.tsx` gọi `Math.random()` **ngay trong thân render** tại `:123, 218-220, 311, 422, 518`. Mỗi `setSelectedOptionId` / `setFeedbackState` → re-render → xáo lại vị trí. Với lớp Lá (5–6 tuổi) phải ghép chữ, từ có chữ cái lặp lại thành **không thể ghép đúng**. Sửa: đưa vào `useMemo` keyed theo `currentWordIdx`.
- [ ] **2.2.3 Bấm xong mini-game → ĐỨNG HÌNH im lặng.** `ActivityPlayPage.tsx:179` — `lessonId: (activity as any).lesson?._id || (activity as any).lesson`; nếu BE không populate `lesson` thì `lessonId = undefined` → request lỗi → `:190` `catch` chỉ `console.error` → `isFinished` vẫn `false` → **ResultModal không hiện, không có thông báo lỗi**. Sửa: fallback `lessonId` + hiện modal lỗi kèm nút "Thử lại".
- [ ] **2.2.4 Sai tên trường khiến 2 chặng liệt kê y hệt nhau.** `types/index.ts:68` khai `activityType: string` nhưng `LessonDetailPage.tsx` lọc theo **`a.type`** ở `:64, 102, 103, 109` → luôn `undefined`. Hậu quả dây chuyền:
      - `:103` `gameActivities` luôn `[]` → fallback `:108-111` gán `finalGames = activities` (toàn bộ) → **Chặng 2 và Chặng 3 giống hệt nhau**.
      - `:96-99` bộ lọc game theo độ tuổi (`MAM_GAME_TYPES` / `CHOI_LA_GAME_TYPES`) **vô hiệu hoàn toàn**.
      - `:24-32` `GAME_TYPES` chứa `DRAG_DROP_WORD` và `SPELL_PUZZLE` — **không tồn tại** trong enum 18 giá trị của BE (BE là `DRAG_DROP`).
      Sửa: đổi `a.type` → `a.activityType`; sửa `GAME_TYPES` theo đúng enum BE.

### 2.3 Không có Error Boundary — **PHASE 1**

- [ ] **2.3.1** Toàn client **không có một Error Boundary nào** → mọi lỗi render = trắng màn hình trước mặt hội đồng. Thêm `client/src/components/ErrorBoundary.tsx` bọc `<Routes>` trong `App.tsx`, UI thân thiện + nút "Thử lại".

**Tiêu chí nghiệm thu Phase 1:** chạy hết luồng vàng (Chặng 1 → 2 → 3) không kẹt, không đứng hình; hai chặng liệt kê **khác nhau**; cố tình gây lỗi render thì hiện màn ErrorBoundary chứ không trắng.

### 2.4 6 loại activity không có engine — PHASE 4

Backend enum `activityType` có **18** giá trị (`KCEnglishKids_BE/src/models/Activity.js:76-95`), client chỉ có **12** engine. Sáu loại **không có engine**: `LISTEN_REPEAT`, `MATCHING`, `DRAG_DROP`, `MEMORY`, `FIND_OBJECT`, `CLASSIFICATION`.

Dispatch không phải `switch` mà là chuỗi ternary lồng (`ActivityPlayPage.tsx:272-349`), nhánh `else` cuối (`:341-349`) fallback về `ListenChooseEngine` → **render sai UI, không crash, khó phát hiện**. Arcade lặp lại y nguyên chuỗi ternary đó ở `ChildArcadeSection.tsx:814-895`.

**Lưu ý về dữ liệu thật:** DB hiện có 234 activity phân bố: `LISTEN_CHOOSE` 108, `MEMORY_CARD` 28, `IMAGE_WORD_MATCH` 27, `COUNT_OBJECTS` 27, `FIND_OBJECT` 18, `TRUE_FALSE` 8, `LISTEN_REPEAT` 4, `DRAG_DROP` 4, `CLASSIFICATION` 4, `MISSING_OBJECT` 3, `COLOR_RECOGNITION` 3. → **`FIND_OBJECT` (18), `LISTEN_REPEAT` (4), `DRAG_DROP` (4), `CLASSIFICATION` (4) = 30 activity đang render sai UI**.

- [ ] **2.4.1** Đổi dispatch từ ternary lồng sang **map object** `ENGINE_BY_TYPE: Record<ActivityType, Component>` — dùng chung cho `ActivityPlayPage` và `ChildArcadeSection` (dùng chung luôn với §7.2 khi tách `ChildArcadeSection`).
- [ ] **2.4.2** Nhánh không có engine: render màn **"Trò chơi đang hoàn thiện 🚧"** thay vì fallback nhầm sang `ListenChooseEngine`.
- [ ] **2.4.3** Chọn 1 trong 2: (a) viết thêm engine cho `FIND_OBJECT` (18 activity — đáng làm nhất) và `CLASSIFICATION`; (b) đổi 30 activity đó sang loại đã có engine trong seed. **(b) rẻ hơn 1 ngày — chọn (b) nếu hết giờ.**
- [ ] **2.4.4** Sửa `ChildArcadeSection.tsx:882` — đang gọi `handleEngineAnswer(true, opt.id)` cho `StarCatcherEngine` → **luôn tính đúng**, hứng sao sai vẫn được điểm.
- [ ] **2.4.5** Sửa `ChildArcadeSection.tsx:819` — `handleGameFinished(50, 5, 5)` hardcode → **luôn 50/50, 3 sao**. `MemoryCardEngine.tsx:104` gọi `onComplete()` không tham số, không đếm lượt, không có điều kiện thua.
- [ ] **2.4.6** Sửa `MissingObjectEngine.tsx:51` — dep array `[question.correctAnswer]` → 2 câu liên tiếp trùng đáp án thì **timer 4s không reset**. Đổi sang `question.id`.
- [ ] **2.4.7** Xóa giá trị enum chết trong `Activity.js:76-95`: `MATCHING`, `MEMORY`, `FEED_ANIMAL`, `BUBBLE_POP`, `TAP_PICTURE`, `ANIMAL_SOUND`, `STAR_CATCHER` không có trong DB — hoặc triển khai, hoặc bỏ. **Đây là con số sẽ bị hội đồng hỏi đầu tiên** ("tài liệu nói 7 loại trò chơi, code khai 18, DB dùng 11 — vậy thực tế là bao nhiêu?"). Chốt ở đây rồi mới ghi vào tài liệu ở Phase 9.

### 2.5 Ảnh phụ thuộc mạng ngoài — PHASE 4

- [ ] **2.5.1** **25 URL Unsplash hardcode**: `ChildArcadeSection.tsx` (15), `LiveSessionPage.tsx` (9), `InteractivePracticeStudio.tsx:37` (1). Mất mạng phòng bảo vệ là vỡ ảnh toàn bộ demo. Chuyển ảnh vào `client/public/` hoặc dùng fallback emoji như `BigInteractiveFlashcard.tsx:387-396`.
- [ ] **2.5.2** Seed đang hotlink audio `dict.youdao.com` (`src/seeds/index.js:261`) và tạo record ANIMATION với URL giả `placeholder://...` (`:272`) → link chết. Tự host media, xóa record placeholder.
- [ ] **2.5.3** Gộp `DEFAULT_PRESCHOOL_VOCAB` trùng lặp: `ChildArcadeSection.tsx:58-68` (10 từ) vs `LiveSessionPage.tsx:48` (8 từ).

### 2.6 Seed crash — PHASE 4

- [ ] **2.6.1** `src/seeds/index.js:597, 733, 735, 736` — dereference không null-guard (`topicsMap.animals._id`, `demoUnit5Ref.bigQuestion`, `petAnimalsLesson.title`, `.vocabularyItems.length`) → **seed crash, không có dữ liệu demo**. Thêm optional chaining + throw thông báo rõ.
- [ ] **2.6.2** `src/seeds/index.js:134-149` — re-seed `deleteMany({})` User/ClassRoom/Progress/Result/Session nhưng **KHÔNG xóa** Assignment, TeacherNote, ClassroomSession, VocabularyMastery, ParentNotification, AuditLog → ObjectId mồ côi, populate ra `null`. Bổ sung đủ. **Thêm `UnitCompletion` vào danh sách này ngay khi tạo model ở 1.2.4.**
- [ ] **2.6.3** `src/seeds/activityData.js:74` — `sort(() => Math.random()-0.5)`: seed **không tất định** + shuffle thiên lệch. Mỗi lần chạy thứ tự đáp án khác nhau → **không tái hiện được screenshot trong tài liệu**. Dùng Fisher-Yates với seeded PRNG.
- [ ] **2.6.4** Avatar trùng lặp (fox×4, lion×3, bear×4, rabbit×4, panda×4, koala×3 — `src/seeds/index.js:544-587`) trong khi `authController.js:107-117` đăng nhập bằng `findOne({avatar})` → **đăng nhập có thể vào nhầm bé khác**. Bắt buộc `childId`, hoặc unique index trên `avatar`.
- [ ] **2.6.5** `src/seeds/index.js:528-542` — bé Toby **không được xếp lớp** (trong khi README quảng cáo là tài khoản demo).
- [ ] **2.6.6** `src/seeds/activityData.js:114` + DB thật: **63/234 activity có `questionCount: 1` và `pointsPerQuestion: 100`** → 27% activity chỉ có "3 sao hoặc 0 sao", hệ thống sao vô nghĩa với chúng. Đảm bảo ≥3 câu/activity, `pointsPerQuestion = round(100/n)`.
- [ ] **2.6.7** `src/seeds/activityData.js:19-49` — `NUMERACY_PROGRESSION` tới `B3_U9: {count:100}` → activity bắt trẻ 5–6 tuổi **đếm 100 vật**. Giảm về tối đa 20.
- [ ] **2.6.8** `src/scripts/enrichCurriculumDatabase.js` **đang được git track nhưng là script hỏng**: `:110-120` `Activity.create` thiếu 3 field `required` (`activityType`, `ageGroup`, `ageGroupCode`) và dùng 2 field **không có trong schema** (`type`, `gameEngineType`) → ValidationError; `:174, 179` `promptText` **chính là** `correctAnswer` (câu hỏi tự lộ đáp án); `:242-244` 3 `updateMany` trong `Promise.all` trên tập `ageGroupCodes` giao nhau → difficulty thắng thua ngẫu nhiên. Sửa hoặc xóa khỏi repo.

---

## 3. P0-C — Bảo mật dữ liệu trẻ em — PHASE 3

> Đề tài liên quan trực tiếp tới **dữ liệu trẻ 3–6 tuổi**. Đây là nhóm hội đồng dễ chất vấn nhất, và cũng là nhóm có rủi ro pháp lý (Nghị định 13/2023/NĐ-CP).

### 3.1 Endpoint public lộ dữ liệu

**11 endpoint phải khóa ngay:**

| # | Endpoint | File:dòng | Hậu quả | Sửa |
|---|---|---|---|---|
| 3.1.1 | `GET /api/admin/public-stats` | `src/routes/adminRoutes.js:31` | Lộ toàn bộ KPI quản trị + `recentResults` kèm **tên/avatar trẻ** (`adminController.js:52-57` không filter) | Xóa route, hoặc thêm `protect, authorize('ADMIN')` |
| 3.1.2 | `GET /api/children/:id/progress` | `src/routes/progressRoutes.js:5` | **IDOR**: lộ hồ sơ + weakVocabulary + lịch sử chơi của **bất kỳ** trẻ nào; `progressController.js:10` còn không lọc `role:'CHILD'` | `protect` + check sở hữu |
| 3.1.3 | `POST /api/learning/activity-results` | `learningRoutes.js:12`, `learningController.js:59` | Không token vẫn ghi điểm/sao cho `childId` bất kỳ | `optionalProtect` → `protect` |
| 3.1.4 | `POST /api/learning/sessions` | `learningRoutes.js:10`, `learningController.js:10` | Như trên | Như trên |
| 3.1.5 | `GET /api/activities/:id` | `activityRoutes.js:5`, `activityController.js:10` | **Trả `questions.correctAnswer` + `options.isCorrect`** → lộ đáp án; không lọc `status:'ACTIVE'` | `.select('-questions.correctAnswer -questions.options.isCorrect')` |
| 3.1.6 | `GET /api/lessons/:id/activities` | `lessonController.js:180` | Lộ đáp án hàng loạt | Như trên |
| 3.1.7 | `POST /api/auth/lookup-student` | `authController.js:427-474` | Chỉ cần SĐT → trả name/email/phone/avatar/lớp. **Oracle dò PII**, không rate-limit | Xóa hoặc giới hạn field trả về + rate-limit |
| 3.1.8 | `POST /api/auth/child-register` | `authController.js:290-369` | Tự đăng ký công khai; `:333` `pin: pin \|\| '1234'` — **PIN mặc định hardcode** | Bắt buộc `pin`, validate `/^\d{4}$/`, chỉ Admin/Teacher được tạo |
| 3.1.9 | `GET /api/topics/:id/lessons?childId=` | `topicController.js:103-104` | Nhận `childId` từ query trên route public → IDOR progress | Lấy `childId` từ token |
| 3.1.10 | `GET /api/lessons/curriculum-path?childId=` | `lessonController.js:9` | IDOR tương tự | Như trên |
| 3.1.11 | `POST /api/children/:childId/vocabulary-mastery/:vocabId/record` | `vocabMasteryRoutes.js:13`, `vocabMasteryController.js:119-155` | **Không check sở hữu** → trẻ này sửa mastery của trẻ khác | Thêm `ownChildOr403` |
| 3.1.12 | 4 endpoint reward mới ở §1.2.8 | `rewardRoutes.js` (sẽ tạo) | Cùng loại IDOR nếu quên middleware | Áp dụng cùng mẫu `ownChildOr403`. **Tạo helper một lần trong `authMiddleware.js`, dùng lại** |

### 3.2 Chấm điểm tin client

- [ ] **3.2.1** `src/services/learningService.js:71-80` — server chấm điểm bằng `ans.isCorrect` **do client gửi lên** → mở DevTools là tự cho mình 100% / 3 sao. **Đây là lỗi nặng nhất về mặt nghiệp vụ.** Sửa: server tự đối chiếu `selectedOptionId` với `option.isCorrect` trong DB, bỏ field client.
- [ ] **3.2.2** `learningService.js:89-102, 105-111` — mỗi POST tạo 1 `ActivityResult` mới + cộng dồn `totalScore` **không giới hạn** → replay vô hạn. Thêm idempotency key hoặc cap 1 kết quả/activity/session.
- [ ] **3.2.3** `vocabMasteryController.js:67-98` — `syncMastery` tin `masteryLevel` client gửi. Server phải tự tính bằng `calculateMasteryLevel`.

### 3.3 Không có chống brute-force PIN

- [ ] **3.3.1** PIN chỉ 4 số = **10.000 tổ hợp**, mà `authController.js:99-157` **không có bộ đếm lần sai / khóa tài khoản / rate-limit**. `User.js` cũng **không có field `loginAttempts` / `lockUntil`** → không thể chống nếu không sửa schema. Thêm 2 field + `express-rate-limit` cho `/child-login`.
- [ ] **3.3.2** `authController.js:411-412` — `changePin` **ghi đè luôn `password`** → phụ huynh mất đăng nhập email. Chỉ set `child.pin`.

### 3.4 Thiếu hạ tầng bảo mật

- [ ] **3.4.1** `package.json:17-24` chỉ có 6 dependency — **không có helmet, express-rate-limit, express-mongo-sanitize, hpp, morgan**. Thêm cả 5.
- [ ] **3.4.2** `src/app.js:21-22` — CORS mở toàn bộ (`origin: '*'`), không allowlist; `express.json()` không giới hạn body. Sửa: allowlist origin + `express.json({ limit: '1mb' })`.
- [ ] **3.4.3** `src/middlewares/authMiddleware.js:10, 49` — JWT secret có **fallback hardcode**, trùng đúng giá trị trong `.env`. Bỏ fallback, `throw` khi thiếu `JWT_SECRET`.
- [ ] **3.4.4** `src/middlewares/errorMiddleware.js:12` — trả `err.stack` cho client vì `NODE_ENV=development`; không xử lý CastError / ValidationError / E11000. Thêm 3 nhánh.
- [ ] **3.4.5** **Token CHILD không bị giới hạn scope**: `protect` chỉ nạp user, `authorize` chỉ có ở `/admin` và `/teacher` → CHILD gọi được `POST /api/children/:id/vocabulary-mastery` với **mọi** childId.
- [ ] **3.4.6** `src/controllers/adminController.js:194, 283` — response tạo user **trả về document kèm hash password + PIN**. Thêm `.select('-password -pin')`.
- [ ] **3.4.7** `src/controllers/vocabularyController.js:13-18` — `$regex` dựng từ input **không escape** → ReDoS. Thêm `escapeRegExp()` + giới hạn độ dài. *(Mục duy nhất của §3 được phép cắt nếu hết giờ.)*

### 3.5 Rò rỉ trong chính repo

- [ ] **3.5.1** ⚠️ **LÀM NGAY, 2 phút.** `.gitignore` gốc **có** bỏ qua `.env` (dòng 16-23) nhưng **KHÔNG bỏ qua `data_backup/`** — mà `KCEnglishKids_BE/data_backup/users.json` (29 KB) đang **untracked và chứa hash password + PIN của 24 user**, tổng thư mục 7,1 MB. Một lệnh `git add .` là commit hết. **Thêm `data_backup/` vào `.gitignore` ngay.**
- [ ] **3.5.2** `KCEnglishKids_BE/scripts/migrate_to_atlas.js:117` — **hardcode connection string Atlas kèm user/password thật trong mã nguồn** (file đang untracked). Xóa dòng này, đọc từ env.
- [ ] **3.5.3** `src/scripts/enrichCurriculumDatabase.js:52` — **in cả connection string có mật khẩu** ra console.
- [ ] **3.5.4** `scripts/migrate_to_atlas.js:158` — `deleteMany({})` **xóa sạch collection đích không hỏi xác nhận**; `:191-193` `catch {}` **nuốt mọi lỗi tạo index** → unique index `{child, lesson}` của Progress có thể không tồn tại trên Atlas mà không ai biết. Thêm `--dry-run` + xác nhận.
- [ ] **3.5.5** `client/src/pages/child/StudentLoginPage.tsx:35-36, 65, 265-267, 384` — **pre-fill sẵn `leo@kcenglishkids.com` / `123456` và liệt kê công khai 3 tài khoản demo ngay trên màn hình đăng nhập**. Bọc trong `import.meta.env.DEV`.
- [ ] **3.5.6** Đổi mật khẩu MongoDB Atlas (đã nằm plaintext trong `.env` và `scripts/migrate_to_atlas.js`).

**Tiêu chí nghiệm thu §3:** `curl` không token vào cả 11+4 endpoint → 401/403; `GET /api/activities/:id` không còn `correctAnswer`; response admin không còn hash; sai PIN 5 lần bị chặn; `git status` không thấy `.env` / `data_backup/`; DevTools tự gửi `isCorrect: true` **không** được 3 sao.

---

## 4. P1-A — Sai nghiệp vụ backend — PHASE 5

> **Ngoại lệ: §4.11 phải làm ở PHASE 2, trước §1.2.**

- [ ] **4.1** `src/controllers/teacherController.js:7` — `studentsFor` **không có nhánh ADMIN** → mọi route `/students/:id/*` trả **403 với ADMIN** dù `authorize('TEACHER','ADMIN')` cho phép. Kéo theo `:13-14` dashboard ADMIN = 0.
- [ ] **4.2** `src/controllers/teacherController.js:54-56` — `totalStars` / `averageScore` / `totalActivitiesPlayed` tính trên `limit(20)` → **số liệu sai** với lớp >20 kết quả. Dùng `$group` aggregate toàn bộ.
- [ ] **4.3** `src/controllers/classroomSessionController.js:45-49` — **GET có side-effect xóa**: `deleteMany` session SCHEDULED/LIVE cũ **không scope theo `req.user`** → giáo viên này **xóa vĩnh viễn session của giáo viên khác** (DB thật đang có 4 session LIVE). Chuyển thành `$set status:'EXPIRED'` + scope theo teacher, hoặc chạy cron.
- [ ] **4.4** `src/controllers/classroomSessionController.js:363-411` — `recordQuestionResult` **không dedupe `(activityId, questionIndex)`** → bấm 2 lần là cộng dồn vô hạn.
- [ ] **4.5** `src/controllers/classroomSessionController.js:290, 328` và `vocabMasteryController.js:128-149` — read-modify-write + `markModified` thay vì `$inc` → **mất update khi bấm nhanh**.
- [ ] **4.6** `src/controllers/parentNotificationController.js` (301 dòng) — **tính năng stub**: không có kênh gửi thật (không email/SMS/Zalo/push) nhưng `:91, 171` hardcode `status:'SENT'`; model `ParentNotification.js:68-72` cũng default `'SENT'` → trạng thái `DRAFT` không thể đạt; `:78-81` comment tự nhận *"If a parent view is ever added"*. **Quyết định:** (a) **rẻ — chọn nếu hết giờ**: đổi default thành `'DRAFT'` và ghi rõ trong tài liệu đây là chức năng chuẩn bị cho tương lai; hoặc (b) tích hợp 1 kênh thật (email qua Nodemailer là rẻ nhất trong nhóm này).
- [ ] **4.7** `src/controllers/parentNotificationController.js:193` — `{teacher: req.user._id}` → **ADMIN không thấy gì**. `:213-229` — parent/child **không thể đọc** thông báo của mình (không có route PARENT).
- [ ] **4.8** `src/controllers/parentNotificationController.js:129-175` — `await` tuần tự trong `for` → N+1. `:40-41` `recipientContact` có thể rỗng. Mọi chỉ số lấy thẳng từ body → **giáo viên tự bịa điểm được**.
- [ ] **4.9** `src/models/VocabularyMastery.js:31` — chỉ cần `streak >= 3` là lên level 3 → **3 lần đoán mò liên tiếp = "MASTERED"**, bỏ qua accuracy. Sửa thành `streak>=3 && accuracy>=0.8 && attempts>=5` (khớp `MASTERY_CONFIG:5-17`). Lưu ý `pre('save'):90-93` **ghi đè** `masteryLevel` mà seed set cứng (`src/seeds/index.js:616, 626`).
- [ ] **4.10** `src/services/learningService.js:148-157` — `weakVocabulary` chỉ **tăng**, trả lời đúng sau này không xóa → danh sách từ yếu phình mãi. Giảm `mistakeCount` khi đúng ≥2 lần liên tiếp.
- [ ] **4.11** 🔴 **LÀM Ở PHASE 2 — điều kiện tiên quyết của §1.2.** `src/controllers/lessonController.js:49` — `ar.stars > 0` coi là **hoàn thành cả bài** chỉ vì 1 activity may mắn. Model **đã có sẵn** field đúng: `Progress.js:23` `completed: Boolean`. Đổi định nghĩa "lesson complete" sang `Progress.completed === true`, và chỉ set `completed` khi đạt đủ số activity hoặc ngưỡng điểm. **Nếu không sửa, `computeRewards` (1.2.6) và `grantUnitCompletion` (1.2.9) sẽ cấp rương báu cho trẻ chưa học xong.**
- [ ] **4.12** `src/controllers/teacherController.js:42` — **không thể chuyển học sinh giữa các lớp** (filter bắt `assignedClass: null`). `:70` deref `assignment.student._id` không null-guard. `:10` classroom không tồn tại → trả 403 thay vì 404.
- [ ] **4.13** `src/controllers/adminController.js:224-236` — trẻ 2 tuổi bị xếp vào nhóm `3-4` (thiếu nhánh `<3`). `classroomSessionController.js:121` — `ageGroup: ... || '5-6'` hardcode.
- [ ] **4.14** `src/controllers/topicController.js:54` — `findById` **không lọc `status:'ACTIVE'`** (nhánh slug `:56` thì có) → topic INACTIVE vẫn đọc được bằng ObjectId. `:20-33` N+1 `countDocuments`/topic.
- [ ] **4.15** `src/controllers/lessonController.js:117` — không validate ObjectId → CastError 500. `:85-89` fallback trang trí hardcode.
- [ ] **4.16** `src/models/Activity.js:140-143` — `pointsPerQuestion` default `10` ≠ fallback `25` ở `learningService.js:83`. Thống nhất một giá trị.
- [ ] **4.17** `src/models/LearningSession.js:57-58` — index `{child, lesson}` **không unique** → tạo được nhiều session IN_PROGRESS cho cùng cặp; enum `:40` có `ABANDONED` nhưng **không code nào set** (DB thật: 7 session IN_PROGRESS mồ côi).
- [ ] **4.18** `src/models/User.js:43-47` — `phone` khai `sparse` **không kèm `unique`** → no-op, trùng SĐT vẫn được, trong khi `childLogin` `findOne` theo phone. `:8` enum có `'PARENT'` nhưng **không có tính năng parent nào**.
- [ ] **4.19** `src/models/Assignment.js` và `src/models/TeacherNote.js` — **0 index** → collection-scan mọi query; Assignment không unique → tạo trùng thoải mái.
- [ ] **4.20** `src/models/Media.js:14-18` — `mediaKey` **không unique** trong khi `src/seeds/index.js:281` dùng nó như khóa unique. `Vocabulary.js` (`english`, `normalizedText`) và `Lesson.js:22-26` (`key`) cũng **không unique** → chống trùng phụ thuộc 100% vào code seed.
- [ ] **4.21** `src/models/ClassroomSession.js:69-73` — `ageGroup` là **String** trong khi `ClassRoom.ageGroup` là **ObjectId** → trùng tên khác kiểu, rất dễ bug. Đổi thành `ageGroupCode`. `:98-100` mảng `questionResults`/`studentScores` không giới hạn. Enum thiếu `CANCELLED`.
- [ ] **4.22** `src/models/AuditLog.js:12` — enum có 6 action nhưng `UPDATE_USER` và `TOGGLE_LESSON` **không bao giờ được ghi**; chỉ admin có audit, không log hoạt động học / classroom-session / parent-notification. **Thêm action `GRANT_REWARD` và `REVEAL_CHEST` cho §1.2** — hội đồng rất thích thấy reward có audit trail.
- [ ] **4.23** `LanguageContent` — 243 bản ghi đã seed nhưng **không controller/route nào expose** → mồ côi hoàn toàn về mặt API. Hoặc expose, hoặc bỏ khỏi tài liệu.
- [ ] **4.24** `src/config/db.js:12-16` — **fallback im lặng Atlas → `127.0.0.1` → `localhost`** → demo có thể chạy trên DB rỗng mà không ai biết. Log `warn` to, hoặc bỏ fallback khi `NODE_ENV !== 'development'`. `:6` `dns.setServers` ghi đè DNS toàn tiến trình.
- [ ] **4.25** `src/server.js:9, 17` — `connectDB()` **không `await`** trước `listen`; thiếu `uncaughtException` + graceful shutdown.

---

## 5. P1-B — Sai nghiệp vụ frontend — PHASE 6

### 5.1 Tiến độ học không được lưu

- [ ] **5.1.1** Chặng 1 + Chặng 2 phải ghi `Progress`. **Đây là điều kiện để §1.2 cấp rương báu** — nếu chỉ Chặng 3 ghi DB thì "hoàn thành Lesson" chỉ phản ánh một mini-game. Bảng dưới đây là vấn đề lớn nhất về mặt nghiệp vụ: **chỉ 1 trong 3 chặng ghi DB**.

| Giai đoạn | File | Ghi tiến độ? |
|---|---|---|
| Chọn Unit/Bài | `ChildHomePage.tsx:129-134` | chỉ đọc; `:161` `catch` chỉ `console.error` → **không có UI lỗi**, màn hình trống |
| Chặng 1 – Học flashcard | `TopicDetailPage.tsx:190`, `BigInteractiveFlashcard.tsx` | **không gọi API nào**; chỉ `vocabMasteryService.markMastered/markReview` (`:178, :202`) → localStorage + sync debounce 2s |
| Chặng 2 – Luyện tập | `InteractivePracticeStudio.tsx` (879 dòng) | **0 lệnh gọi API**, thuần state cục bộ |
| Chặng 3 – Mini-game | `ActivityPlayPage.tsx:171-192` | ✅ **duy nhất** `learningApi.submitActivityResult` |

- [ ] **5.1.2** `LessonDetailPage.tsx:425-427` — `onComplete={() => { handleCompleteStage2(); }}` **vứt bỏ `{score, stars}`** mà studio trả về.
- [ ] **5.1.3** `InteractivePracticeStudio.tsx:621-626` — tự hardcode `stars: 3`, `score: starsEarned*20` → dù có truyền lên cũng **luôn 3 sao**.
- [ ] **5.1.4** `ActivityPlayPage.tsx:144-155` — **chỉ ghi đáp án đúng** vào `answers` → `score` gửi lên luôn ~100%. Ghi cả đáp án sai.
- [ ] **5.1.5** `ActivityPlayPage.tsx:158-169` — `responseTimeMs: 2000` hardcode. Đo thật.
- [ ] **5.1.6** `services/api.ts:144-147` — `learningApi.startSession` + `getSession` **0 caller** → `sessionId` không bao giờ được gửi kèm kết quả (`api.ts:148-155`) → chuỗi `LearningSession → ActivityResult` bị đứt.

### 5.2 VocabularyMastery rò rỉ

- [ ] **5.2.1** `services/vocabMasteryService.ts:87` — filter `v.vocabId.length === 24` → mọi id demo (vd `ChildArcadeSection.tsx:66` `vocabId: 'def_star'`) **bị loại, không lên DB**.
- [ ] **5.2.2** `services/vocabMasteryService.ts:93` — hardcode `streak: 3` cho từ MASTERED → backend luôn trả level 3, lệch với `:202-208` (chỉ cần 1 lần bấm "Nhớ" đã là MASTERED).
- [ ] **5.2.3** `services/vocabMasteryService.ts:265-285` — `recordGameResult()` **0 caller** → `gamesPlayedCount` / `gamesCorrectCount` trong sổ từ vựng **không bao giờ được cập nhật** dù trẻ chơi hàng chục ván arcade. Nối vào `handleEngineAnswer` / `handleCompleteActivity`.
- [ ] **5.2.4** `services/vocabMasteryService.ts:290-332` (gọi từ `ChildHomePage.tsx:152`) — **tự set `rememberCount: 1`, `masteryScore: 65`, `masteredIds` cho từ bé CHƯA học** → dữ liệu giả.
- [ ] **5.2.5** `services/vocabMasteryService.ts:107-157` — local luôn thắng server; cho phép bản ghi server ghi đè.
- [ ] **5.2.6** `services/api.ts:312-315` — `recordPractice` trỏ tới route có thật (`vocabMasteryRoutes.js:13`) nhưng **không dòng nào trong client gọi** → dead code.

### 5.3 Gating giả

- [ ] **5.3.1** `LessonDetailPage.tsx:42` — `lockNotice` chỉ được gán `null` (`:142`) → toast khóa ở `:315-320` **không bao giờ render**.
- [ ] **5.3.2** `LessonDetailPage.tsx:140-145` — `handleSelectStage` **không kiểm tra mở khóa** → mọi nút chặng bấm được, "khóa" chỉ là `opacity-60` (`:253`).
- [ ] **5.3.3** Tiến độ chặng chỉ nằm ở localStorage (`LessonDetailPage.tsx:121, 127, 144, 149, 151, 156, 158`) → **xóa cache là mất sạch**. Đồng bộ lên `Progress`.

### 5.4 Hai tính năng GIẢ — rủi ro bị hội đồng chất vấn

- [x] **5.4.1** `BigInteractiveFlashcard.tsx` — đã thay fake timer bằng `childSpeechEngine` (Web Speech API thật, có so sánh giọng đọc + mascot feedback).
- [x] **5.4.2** `InteractivePracticeStudio.tsx` — đã thay `handleMicSimulate` bằng `handleMicListen` kết nối `childSpeechEngine` thật.
- [x] **5.4.3** Đã hiện thực phương án (a) `webkitSpeechRecognition` + Fuzzy matching cho trẻ em (hoàn toàn miễn phí, chạy mượt trên Chrome/Edge).

### 5.5 Auth & routing client

- [ ] **5.5.1** `context/AuthContext.tsx:31-34` — `JSON.parse(localStorage)` **không có try/catch** → JSON hỏng là crash ngay lúc khởi động, trắng toàn app.
- [ ] **5.5.2** `context/AuthContext.tsx:63-121` — các hàm login **không `throw` khi `res.success === false`** → resolve im lặng, UI tưởng đã đăng nhập.
- [ ] **5.5.3** `context/AuthContext.tsx:123-128` — `setAgeGroup` **chỉ ghi localStorage, không PATCH BE** → đổi nhóm tuổi không lưu server, reload là mất.
- [ ] **5.5.4** `App.tsx` — **`loginAdmin` (`AuthContext.tsx:105-112`) và nguyên khối `adminApi` (`services/api.ts:161-190`) phía client là dead code**, vì admin đã là app Vite riêng ở `admin/` (port 5174). Xóa khỏi client.
- [ ] **5.5.5** `App.tsx:41, 44` — `/` và `/home` trùng component. Bỏ một.
- [ ] **5.5.6** `App.tsx` — không có route PARENT dù `Role` khai `'PARENT'` và `api.ts:321-352` có `parentNotificationApi`. Quyết định: làm route Parent hoặc bỏ (chốt cùng §4.6).
- [ ] **5.5.7** Guard chỉ kiểm tra `user.role`, **không kiểm tra token hết hạn** phía client (`AuthContext.tsx:18-38`).

### 5.6 Loading / error state

- [ ] **5.6.1** **Không có error UI** tại: `ChildHomePage.tsx:161`, `TopicDetailPage.tsx:60`, `LessonDetailPage.tsx:82`, `ActivityPlayPage.tsx:190`, đa số method trong `TeacherWorkspace.tsx` (không `.catch()` → unhandled rejection).
- [ ] **5.6.2** `LiveSessionPage.tsx:121, 213, 292` — `catch {}` rỗng kèm comment *"silently handle fetch errors"* → session load fail thì `:297` hiện **loader vĩnh viễn**.
- [ ] **5.6.3** `services/api.ts:12-60` — mọi verb gọi `res.json()` **vô điều kiện** → body rỗng / trang HTML lỗi = lỗi parse khó hiểu. Thêm guard `res.status === 204` + check content-type + timeout (AbortController). (`admin/src/services/api.ts` mắc **đúng lỗi này** — sửa cả hai.)
- [ ] **5.6.4** `services/api.ts:1` — `BASE_URL = '/api'` phụ thuộc proxy dev (`vite.config.ts`) → deploy `dist` tĩnh **bắt buộc cần reverse proxy**. **Ghi rõ vào README ở §8.**
- [ ] **5.6.5** `ResultModal.tsx:41-48` — `catch(e){}` rỗng.
- [ ] **5.6.6** `ActivityPlayPage.tsx:206` — `handleFinish` → `navigate('/')` về **trang chủ** thay vì về bài học → bé mất ngữ cảnh, phải tìm lại unit.

### 5.7 Endpoint backend có nhưng client không gọi

- [ ] **5.7.1** `GET /teacher/students/:id/progress` (`teacherRoutes.js:31`), `GET /teacher/classes/:id/students` (`:14`), `POST /teacher/students/:id/notes` (`:34`), `GET /admin/public-stats` (`adminRoutes.js:31`) — thiếu trong `services/api.ts`.
- [ ] **5.7.2** `services/api.ts:193-239` — 11 hàm `teacherApi` không có UI gọi: `updateClass`, `getStudentHistory`, `getStudentNotes`, `updateAssignment`, `updateAssignmentStatus`, `deleteAssignment`, `getCurriculumOptions`, `getLesson`, `getActivity`, `updateNote`, `deleteNote`. Nối UI hoặc xóa.
- [ ] **5.7.3** `teacherRoutes.js:14` (`/classes/:id/students`) là **alias trỏ về cùng `getClassDetail`** (`:11`) — route trùng handler. `:19` + `teacherController.js:78` (`getContent`) cũng vậy.

---

## 6. P1-C — Admin portal thiếu so với tài liệu — PHASE 7

**Hiện trạng:** `admin/src/pages/AdminDashboardPage.tsx` (883 dòng) chỉ có **3 tab** (`:239, 251, 263`): `overview` (`:285`), `users` (`:451`), `audit` (`:596`).

**Tài liệu `.docx` mục 1.4.2 + Bảng 1.1 hứa 7 chức năng Admin.** Đối chiếu:

| Chức năng trong tài liệu | Có trong code? |
|---|---|
| Quản lý tài khoản người dùng | ✅ Tab `users` — tạo Teacher/Child, toggle status, search/filter theo role (`adminController.js:113-126`) |
| Quản lý nhóm tuổi | ❌ **Không có UI** (model `AgeGroup` tồn tại, không có route CRUD) |
| Quản lý giáo trình và chương trình học | ⚠️ **Chỉ xem** — `:338-390` render 3 Book / 27 Unit read-only, có badge `isUnit5` (`:371-383`) đánh dấu vertical slice |
| Quản lý nội dung bài học | ❌ **Không có UI, không có route** |
| Quản lý nội dung học tập và tài nguyên đa phương tiện | ❌ **Không có UI** (`Media`, `Vocabulary`, `LanguageContent` không có route admin) |
| Quản lý trò chơi tương tác | ❌ **Không có UI** (`Activity` không có route admin) |
| Quản lý báo cáo hệ thống | ⚠️ Chỉ tab `overview` KPI + tab `audit` (limit 50 cố định, `adminController.js:334-349`) |
| Quản lý chủ đề (mô tả ở 1.4.2 nhưng **thiếu trong Bảng 1.1**) | ⚠️ Chỉ `PATCH /admin/topics/:id/status` (toggle), không tạo/sửa/xóa |

**Việc cần làm:**

- [ ] **6.1** Tối thiểu để khớp tài liệu: thêm CRUD cho **Topic** và **Lesson** (2 tab mới) — đây là 2 entity giáo viên/admin cần nhất để thêm nội dung demo.
- [ ] **6.2** Thêm tab **Vocabulary / Media** (có upload ảnh + audio) — tài liệu hứa "quản lý tài nguyên đa phương tiện". *(Cắt được)*
- [ ] **6.3** Thêm tab **Activity** (chọn `activityType`, cấu hình `questions`, `starConfig`) — tài liệu hứa "quản lý trò chơi tương tác". *(Cắt được)*
- [ ] **6.4** Thêm tab **AgeGroup** — hiện `maxChoicesPerQuestion` / `defaultQuestionCount` chỉ đổi được bằng seed. *(Cắt được)*
- [ ] **6.5** Tab Curriculum: cho phép thêm/sửa Unit (hiện read-only). *(Cắt được)*
- [ ] **6.6** Tab `audit`: thêm phân trang + filter theo action / khoảng ngày (`adminController.js:334-349`). Thêm filter `GRANT_REWARD` / `REVEAL_CHEST` (sinh ra ở §4.22).
- [ ] **6.7** `admin/src/pages/AdminDashboardPage.tsx:425, 428, 535, 558, 977` — bỏ hardcode (`|| 'Pet Animals'`, emoji avatar, `'2026-2027'`).
- [ ] **6.8** 🔴 **QUAN TRỌNG NHẤT MỤC NÀY:** nếu cắt 6.2–6.5 thì **phải sửa lại tài liệu `.docx`** cho khớp (ở Phase 9) — thu hẹp Bảng 1.1 và mục 1.4.2 xuống đúng những gì đã có. Để tài liệu hứa 7 chức năng mà demo chỉ có 1,5 là **rủi ro lớn nhất khi bảo vệ**.
- [ ] **6.9** Toàn bộ 7 form Admin đang nhồi trong **1 file 883 dòng** — tách mỗi tab thành 1 component **trước khi** thêm tab mới.
- [ ] **6.10** Thêm tab/mục **"Phần thưởng"** đọc `GET /api/admin/rewards/summary` (§1.2.8) — cho thấy bao nhiêu trẻ đã mở rương, sticker nào phổ biến. Rẻ (~2 giờ) và là điểm cộng khi trình bày.

---

## 7. P2 — Nợ kỹ thuật & dọn dẹp — PHASE 8

### 7.1 Xóa code chết (giảm ~1700 dòng, tránh sửa nhầm file)

- [ ] **7.1.1** `client/src/components/child/VocabularyCard.tsx` (71 dòng) — 0 importer.
- [ ] **7.1.2** `client/src/App.css` (184 dòng) — `main.tsx:3` chỉ import `./index.css`.
- [ ] **7.1.3** `client/src/assets/hero.png`, `react.svg`, `vite.svg` — 0 tham chiếu.
- [ ] **7.1.4** `client/src/dashboards/teacher/TeacherDashboardPage.tsx` (1382 dòng) — **quyết định ở 1.1.10 trước khi xóa**. Chứa toàn bộ 6 `alert()` của dự án (`:225, 248, 251, 282, 296, 303`) và `confirm()` (`:269`).
- [ ] **7.1.5** `package.json` client khai `clsx` + `tailwind-merge` nhưng **0 lần import** trong `src` → dependency thừa.
- [ ] **7.1.6** `src/middlewares/authMiddleware.js:28-30` — dead code không thể tới (sau try/catch luôn return).
- [ ] **7.1.7** `src/scripts/syncDemoUsers.js` — hardcode 3 email, `require('dotenv').config()` không path, **không có trong npm scripts** → công cụ chết.
- [ ] **7.1.8** `src/app.js:41-42` — mount `/api/children` **hai lần** trên cùng prefix (`progressRoutes` + `vocabMasteryRoutes`). Gộp vào 1 router. **Lưu ý khi thêm `rewardRoutes` ở §1.2.8 — đừng thành lần mount thứ ba.**
- [ ] **7.1.9** Xóa `client/src/components/child/SecretGiftModal.tsx` (209 dòng) — đã thay bằng 2 màn ở §1.2.13 / §1.2.14.

### 7.2 Tách file quá lớn *(mục đầu tiên bị cắt nếu hết giờ)*

| File | Dòng | Đề xuất |
|---|---|---|
| `client/src/dashboards/teacher/LiveSessionPage.tsx` | 1468 | Tách: `LiveRoster`, `LiveQuestionPanel`, `LiveScoreboard`, `LiveControls` |
| `client/src/pages/child/ChildHomePage.tsx` | 1037 | Tách: `UnitJourneySection`, `TopicsSection`, `BadgesTab`, `StickersTab`, `UnitChestEntry`. **Lưu ý §1.3.1 đã xóa ~227 dòng tab badges ở đây** |
| `client/src/components/child/ChildArcadeSection.tsx` | 940 | Tách: `ArcadeGameGrid`, `ArcadePlayer`, `arcadeEngineMap.ts` (dùng chung với §2.4.1) |
| `client/src/components/child/InteractivePracticeStudio.tsx` | 879 | Tách theo loại bài tập |
| `admin/src/pages/AdminDashboardPage.tsx` | 883 | Tách theo tab (xem 6.9) |
| `client/src/components/child/BigInteractiveFlashcard.tsx` | 627 | Tách: `FlashcardDeck`, `FlashcardFace`, `MasteryButtons` |
| `KCEnglishKids_BE/src/controllers/teacherController.js` | 79 dòng cho **26 handler** (one-liner) | Ngược lại: **viết giãn ra**, tách helper sang `services/teacherService.js` |

### 7.3 Dữ liệu tĩnh đặt sai chỗ

- [ ] **7.3.1** `ChildHomePage.tsx:259-308` — `UNIT_THEMES` (6 object) khai báo **bên trong `.map()`** → cấp phát lại mỗi unit mỗi render. Đưa ra module scope.
- [ ] **7.3.2** `ChildHomePage.tsx:441-448` — `TOPIC_PALETTES` tương tự.
- [ ] **7.3.3** `ChildHomePage.tsx:171-174` — chuỗi `||` làm **giá trị 0 hợp lệ bị coi là falsy** (`progress?.totalStars || units.reduce(...)`). Dùng `??`. *(Sau §1.2.11 cả 4 dòng này bị xóa — đọc từ `RewardContext`. Nếu làm §1.2 trước thì bỏ qua mục này.)*
- [ ] **7.3.4** `ChildHomePage.tsx:174, 238` — `totalUnits = units.length || 9` và tiêu đề hardcode "Hành trình 9 Unit".

### 7.4 Kiểu dữ liệu & lint

- [ ] **7.4.1** **164 lần dùng `any`** phía client. Nặng nhất: `TeacherDashboardPage.tsx` 22, `LessonDetailPage.tsx` 15, `TeacherWorkspace.tsx` 15, `ChildHomePage.tsx` 12, `ClassroomSessionSetup.tsx` 12. Ưu tiên sửa ở `services/api.ts` + `types/index.ts` trước.
- [ ] **7.4.2** `tsconfig.app.json` — **không bật `strict`**; `lib` thiếu `DOM.Iterable`. Bật `strict` từng bước sau khi dọn `any`. *(Cắt được)*
- [ ] **7.4.3** `.oxlintrc.json` — chỉ bật **2 rule** (`rules-of-hooks`, `only-export-components`). Bật thêm bộ recommended. *(Cắt được)*
- [ ] **7.4.4** Thêm script `typecheck` cho cả `client` và `admin` (đã làm ở §2.1.3); cân nhắc pre-commit hook.
- [ ] **7.4.5** `ActivityPlayPage.tsx:100` — bỏ optional chaining trong dep array.
- [ ] **7.4.6** 19 `console.*` rải ở 8 file — thay bằng logger hoặc xóa.

### 7.5 Kiểm thử

- [ ] **7.5.1** `KCEnglishKids_BE/test-api.js` (152 dòng) — phủ **13/74 endpoint = 17,6%**; **không có assertion nào** (chỉ `console.log`); `:142` in cứng *"ALL 13 ENDPOINTS TESTED & PASSED PERFECTLY!"* dù kết quả là 401/500; `:143-148` `catch` chỉ log, `finally` gọi `process.exit(0)` → **luôn exit code 0**, CI không bao giờ phát hiện lỗi.
- [ ] **7.5.2** `test-api.js:32` — login `{avatar:'lion', pin:'1234'}`; sau khi `scripts/seed_20_students.js` thêm Noah(2004)/Mason(2012) cùng avatar `lion` → `findOne` trả về trẻ khác → **test fail không tất định** (liên quan §2.6.4).
- [ ] **7.5.3** `test-api.js` **ghi dữ liệu thật, không dọn dẹp** — tạo LearningSession + ActivityResult vào DB mà `.env` trỏ tới (**đang là Atlas production**).
- [ ] **7.5.4** `package.json:7` — `"test": "echo \"Error: no test specified\" && exit 1"`; `test-api.js` **không được nối vào npm script nào**. Không có jest/mocha/supertest.
- [ ] **7.5.5** Đề xuất tối thiểu để nói được trong đồ án: cài **Jest + Supertest**, viết test cho **6 luồng lõi** (child-login, curriculum-path, submit activity-result, child progress, teacher classes, **`grantUnitCompletion` idempotent** — gọi 2 lần → chỉ 1 `UnitCompletion`, sao không bị cộng đôi), có assertion thật, chạy trên DB local riêng (`kcenglishkids_test`), `npm test` exit theo số fail.

### 7.6 Scripts & vận hành

- [ ] **7.6.1** `check-db.js:16, 38` — nối vào Atlas thật và **in dữ liệu trẻ ra console**; `.find().toArray()` nạp toàn bộ collection rồi chỉ dùng `[0]`.
- [ ] **7.6.2** `scripts/export_local_db.js:26-28` — export **toàn bộ DB ra `data_backup/*.json` plaintext gồm hash password + PIN** (7,1 MB). Loại bỏ field nhạy cảm.
- [ ] **7.6.3** `scripts/check_curriculum_coverage.js:27` — đọc `MONGODB_URI_LOCAL` **không tồn tại trong `.env`**; `:65` kiểm tra collection `'units'` trong khi tên thật là `'curriculumunits'` → **nhánh chết**.
- [ ] **7.6.4** `scripts/check_db.mjs:4` — hardcode `mongodb://localhost`.
- [ ] **7.6.5** `scripts/seed_20_students.js:33` — `ClassRoom.findOne({status:'ACTIVE'})` chọn **lớp ACTIVE bất kỳ**, có thể nhét học sinh sai lớp; `:73-74, 78` phone/password hardcode; **trùng chức năng** với `src/seeds/index.js:544-587` (hai nguồn sự thật cho cùng 18 bé).
- [ ] **7.6.6** `src/models/ClassRoom.js:31` — `academicYear` default `'2026-2027'` hardcode.
- [ ] **7.6.7** `src/seeds/index.js:349-353` — nối vocabulary bằng `includes()` O(n×m) → **false-positive với từ ngắn** (`'a'`, `'sun'`).
- [ ] **7.6.8** `src/seeds/index.js:607` — `Vocabulary.find({}).limit(5)` không sort → dữ liệu mastery demo ngẫu nhiên.

### 7.7 UX cho trẻ chưa biết đọc

- [ ] **7.7.1** **95 chỗ** trong `components/child` + `pages/child` dùng **câu tiếng Việt dài làm nhãn hành động**. Ví dụ `BigInteractiveFlashcard.tsx:507-539` ba nút "Chưa nhớ" / "Lật nghĩa" / "Đã nhớ!" (gợi ý `(Trái)`/`(Phải)` bị ẩn dưới breakpoint `md`); `ResultModal.tsx:181-219` "Chơi tiếp"/"Chơi lại"/"Hoàn thành 🎉"/"Về bài học". Thêm **icon + màu khác biệt** cho mỗi nút để trẻ phân biệt không cần đọc.
- [ ] **7.7.2** **`aria-label` chỉ có 10 chỗ trên ~54 file**. Các nút loa phát âm trong 12 engine **hoàn toàn không có nhãn**: `ListenChooseEngine.tsx:31`, `BubblePopEngine.tsx:63`, `TapPictureEngine.tsx:66`, `FeedAnimalEngine.tsx:101`, `ColorRecognitionEngine.tsx:69`…
- [ ] **7.7.3** Kích thước chạm: 118 lần dùng `w-4/w-5/w-6 h-4/h-6`, 132 lần `text-xs`/`text-[10px]` trong khu vực trẻ em. Ví dụ nút xóa `w-8 h-8` (`ChildVocabNotebookSection.tsx:348`) — **dưới ngưỡng 44px** khuyến nghị. (Các thẻ đáp án `w-32 h-32` trở lên thì đạt.) *(Cắt được một phần — chỉ sửa 3 nút hay dùng nhất.)*
- [ ] **7.7.4** `TeacherWorkspace.tsx` (38 dòng, 9 trang giáo viên) **100% tiếng Anh** trong khi toàn app trẻ em tiếng Việt; `SessionSummaryPage.tsx:357` `'Failed to send reports'`; `ClassroomSessionSetup.tsx:80` `'Failed to create session'`. Thống nhất ngôn ngữ.
- [ ] **7.7.5** Thay 4 `confirm()` (`LiveSessionPage.tsx:287`, `TeacherWorkspace.tsx:25, 34`) bằng modal xác nhận — `window.confirm` không style được và trông rất "không phải app trẻ em".
- [ ] **7.7.6** **Điểm tốt cần giữ:** 40/40 thẻ `<img>` đều có `alt`; `hover:` chỉ dùng cho hiệu ứng trang trí, luôn kèm `active:scale-95`; **không có nội dung nào bị ẩn sau hover** → an toàn trên tablet.

---

## 8. Đồng bộ tài liệu — **LÀM CUỐI** (PHASE 9)

> 🔴 **KHÔNG BẮT ĐẦU MỤC NÀY TRƯỚC KHI Phase 0–8 đã chốt.** Số liệu trong tài liệu (số game, số model, số endpoint, UC reward, 7 chức năng Admin) **phụ thuộc vào kết quả code**. Viết trước = viết lại 2 lần.

**Nguyên tắc: sửa code cho khớp tài liệu, hoặc sửa tài liệu cho khớp code — không được để lệch.**

| Tài liệu nói | Code thực tế | Hướng xử lý | Chốt sau Phase |
|---|---|---|---|
| "7 loại trò chơi" (mục 1.4.2 + 3.1.2) | `Activity.activityType` có **18** enum; **12** engine trong client; DB thật dùng **11** loại | Sửa tài liệu theo con số chốt sau khi làm 2.4.7 | 4 |
| Không có chức năng phụ huynh | `ParentNotification` model + controller 301 dòng + 4 route | Thêm vào mục 1.4 + Bảng 1.1 + UC, **hoặc** làm 4.6 rồi mới thêm | 5 |
| Không có "phiên học trên lớp" | `ClassroomSession` + 4 màn giáo viên (Setup/Live/List/Summary) | Thêm vào mục 1.4.3 + Bảng 1.1 + UC mới | 5 |
| Cấu trúc chương trình phẳng | `CurriculumBook → CurriculumUnit → Lesson` (3 cấp) + `sourceType` | Vẽ lại sơ đồ ở Chương 3 | 4 |
| Đổi PIN: chỉ Admin/GV làm cho trẻ | `ChangePinPage.tsx` — **trẻ tự đổi PIN** (`handleCurrentPinComplete`, `handleNewPinComplete`); `:201` còn ghi "nếu bé quên mã PIN... liên hệ cô giáo" | Chốt nghiệp vụ rồi sửa 1 bên | 5 |
| UC24 huy hiệu/sticker/phần thưởng | Hiện **không có model**; sau §1.2 sẽ có `UnitCompletion` + catalog server-side + 4 endpoint | **Viết lại UC24 theo thiết kế §1.2** — tách rõ 2 UC: "Xem kệ rương" và "Mở rương (lễ hội)". Thêm sơ đồ tuần tự cho `grantUnitCompletion` | **2** |
| UC07 "lưu nhật ký hệ thống" | `AuditLog` có, chỉ ghi 4/6 action, có tab xem | Làm 4.22 | 5 |
| Chỉ "quản lý từ vựng" | **2 entity riêng**: `Vocabulary` và `LanguageContent` (9 loại, gồm ORACY/DIALOGUE) | Thêm `LanguageContent` vào tài liệu, hoặc expose API (4.23) | 5 |
| Game chỉ là Chặng 3 của bài học | Có `ChildArcadeSection` chơi tự do, nhưng `Activity.lesson` là `required` | Mô tả rõ 2 đường vào game | 4 |
| Mục 1.3 hứa Web Speech API STT + AI cá nhân hóa | **Không có** trong 1.4, Bảng 1.1, mọi UC, và **mọi dòng code** | Làm 5.4.3 | 6 |
| Admin có 7 chức năng | Chỉ có 1,5 (xem mục 6) | Làm 6.1–6.5 hoặc sửa Bảng 1.1 (6.8) | 7 |
| Chương 2 liệt kê Vite/Tailwind/lucide-react/clsx/Oxlint/Nodemon/Dotenv/Mongoose/bcryptjs/JWT | Đúng là stack thật (riêng `clsx` + `tailwind-merge` **không dùng** — 7.1.5) | Chuyển sang mục 1.3 / Chương 4; Chương 2 viết về SPA, REST, NoSQL, JWT, gamification, học qua chơi, tâm lý 3–6 tuổi, Thông tư 50/2020 | — |

**Các lỗi tài liệu thuần túy (không liên quan code) đã ghi nhận ở bản đánh giá trước:** mục lục cũ; `Error! Bookmark not defined.` ở cả 2 danh mục hình/bảng; heading level sai ở Chương 2 & 3; Bảng 2.1 trống 5/6 dòng; Chương 4 & 5 còn nguyên text mẫu; đoạn "Quản lý giáo trình và chương trình học" **bị dán trùng 2 lần**; ~10 lỗi chính tả ("mỏ rộng", "LearnEnglish Kids**.** để", dấu `..`, `0` thừa); LỜI MỞ ĐẦU §2 viết thì quá khứ ("đã hệ thống hóa", "thử nghiệm thành công") trong khi Chương 4–5 trống; tài liệu [11]–[14] không được trích dẫn.

**Cập nhật `docs/` + `README.md` trong repo (đang lỗi thời):**

- [ ] **8.1** `docs/database.md` liệt kê **13 model**, thực tế có **21** (và sẽ là **22** sau khi thêm `UnitCompletion` ở §1.2.4). Thiếu: `Assignment`, `AuditLog`, `ClassroomSession`, `LanguageContent`, `ParentNotification`, `TeacherNote`, `VocabularyMastery`, `UnitCompletion`, `index`.
- [ ] **8.2** `docs/api.md` liệt kê **~17 endpoint**, thực tế **74** (sẽ là **78** sau §1.2.8). Thiếu toàn bộ `/api/teacher/*` (31), `/api/teacher/classroom-sessions/*` (10), `/api/children/*/vocabulary-mastery` (3), `/api/teacher/parent-notifications` (4), `/api/rewards/*` (4).
- [ ] **8.3** `README.md:102` ghi "14 Mongoose Models" → **22**. `README.md:110` ghi "13 endpoints" → **78**. `README.md:121-123` mô tả `pages/admin` nằm trong `client/` — **sai**, admin là app riêng. `README.md:104, 106` nhắc `src/services/` + `src/middlewares/` (có thật) nhưng thiếu `src/scripts/`. `README.md:1` có ký tự `i` thừa đầu file.
- [ ] **8.4** `README.md:114` nhắc `components/admin/` + `components/teacher/` trong client — kiểm tra có tồn tại không, nếu không thì xóa khỏi README.
- [ ] **8.5** Ghi vào README: `BASE_URL = '/api'` (cả `client` lẫn `admin` ở `services/api.ts:1`) phụ thuộc proxy dev → **deploy `dist` tĩnh bắt buộc cần reverse proxy** (§5.6.4). Kèm lệnh chạy 3 tiến trình + port (5000 / 5173 / 5174) + script backfill `node src/scripts/backfillUnitCompletions.js` (§1.2.10).

---

## 9. Checklist nghiệm thu trước bảo vệ

**Build & chạy**
- [ ] `cd client && npm run build` → pass, có `dist/`
- [ ] `cd admin && npm run build` → pass
- [ ] `cd KCEnglishKids_BE && npm run seed` → chạy hết, không crash
- [ ] `node src/scripts/backfillUnitCompletions.js` (§1.2.10) → chạy được trên DB đã seed
- [ ] Backend khởi động, `/api/health` trả 200, log ghi rõ đang nối DB nào (không fallback im lặng — §4.24)
- [ ] Không còn `console.log` lộ thông tin nhạy cảm; không còn `.env` hay `data_backup/` trong `git status`

**4 nhận xét của GVHD**
- [ ] **§1.1** Danh sách lớp 18 bé sắp xếp **đúng A-Z tiếng Việt có dấu**, đủ cột, có search, có empty/error state, **không ô metric nào hiện trắng**
- [ ] **§1.2** Hoàn thành Unit → **`UnitCompletion` xuất hiện trong DB** → `totalStars` tăng thật → reload vẫn còn → kệ rương chuyển ✨ → bấm mở có animation → **bấm lần 2 không cấp thêm quà** → xóa localStorage + đăng nhập lại vẫn còn → **không còn nút nào bấm mà không có tác dụng**
- [ ] **§1.3** Chỉ còn **một** màn hình huy hiệu/sao/sticker (4 tab); không overlay chồng; số liệu giống nhau ở mọi nơi và khớp header; trẻ chưa mở được badge thì bấm vào sẽ **được dẫn tới bài học**
- [ ] **§1.4** `grep -rn "Unit bài" .` → **0 kết quả**; huy hiệu dạng unit hiện đúng đơn vị "Unit"; thuật ngữ Unit/Lesson nhất quán 3 phân hệ + tài liệu

**Luồng demo vàng (chạy thử đúng thứ tự này)**
- [ ] Đăng nhập bé bằng avatar + PIN → vào trang chủ, thấy **đúng số Unit** (không hardcode 9)
- [ ] Unit 1 mở, Unit 2 khóa; bấm Unit 2 → **có thông báo giải thích** (không phải chỉ `opacity-60`)
- [ ] Vào Lesson → Chặng 1: quẹt hết flashcard (bấm "Chưa nhớ" **không bị kẹt**) → hiện màn hoàn thành
- [ ] Chặng 2: các ô chữ **không tự đảo vị trí** khi bấm → làm xong có điểm → **điểm được ghi DB**
- [ ] **Chặng 2 và Chặng 3 liệt kê KHÁC nhau**
- [ ] Chặng 3: chơi mini-game → ResultModal hiện → sao được cộng
- [ ] Hoàn thành **lesson cuối của Unit** → rương tự cấp → **+5 sao** + 1 sticker
- [ ] Quay lại trang chủ → sao ở header đã tăng → mở "Kho báu" → **4 tab, số liệu khớp header**
- [ ] **Tắt mạng** → ảnh vẫn hiện (không vỡ vì Unsplash)
- [ ] **Xóa localStorage + đăng nhập lại** → tiến độ, huy hiệu, sticker vẫn còn
- [ ] Đăng nhập giáo viên → xem danh sách lớp → vào **chi tiết học sinh: 4 ô metric có số** → vào phiên học trực tiếp → chấm điểm → xem tổng kết
- [ ] Đăng nhập admin (port 5174) → dashboard KPI có số thật → tab users → tab audit → **tab phần thưởng**

**Không còn chức năng giả**
- [ ] **Không còn nút nào bấm mà không có tác dụng** — grep `handleClaim`, grep handler chỉ có `onClose()`
- [ ] Nút mic: hoặc có speech recognition thật, hoặc đã bỏ khỏi UI **và** bỏ khỏi tài liệu
- [ ] Rương báu: quà **đã thuộc về trẻ trước khi có nút**; nút chỉ là lễ mở
- [ ] Arcade: hoặc ghi sao qua API, hoặc không hiện sao
- [ ] `ParentNotification`: tài liệu không nói "đã gửi cho phụ huynh" nếu `status: 'SENT'` vẫn hardcode
- [ ] Không còn màn hình nào hiện 3 sao cho bài chưa học

**An toàn dữ liệu trẻ em**
- [ ] 11 endpoint ở mục 3.1 **+ 4 endpoint reward ở §1.2.8** đã khóa — test bằng `curl` không token → 401/403
- [ ] `curl` endpoint reward của trẻ A bằng token trẻ B → **403**
- [ ] `GET /api/activities/:id` không còn trả `correctAnswer` / `isCorrect`
- [ ] Response admin không còn `password` / `pin` hash
- [ ] Server tự chấm điểm, **không tin `isCorrect` client gửi** (§3.2.1)
- [ ] Đăng nhập sai PIN 5 lần → bị chặn hoặc chậm lại
- [ ] Màn hình đăng nhập không còn hiện sẵn tài khoản demo khi build production

---

## PHỤ LỤC — Thống kê nhanh để trích dẫn trong đồ án

> ⚠️ Các con số cột "Sau khi làm plan" **sẽ đổi** trong quá trình thực thi. Cập nhật lại ở Phase 9 trước khi in tài liệu.

| Chỉ số | Hiện tại | Sau khi làm plan |
|---|---|---|
| Endpoint backend | 74 | **78** (+4 ở §1.2.8) |
| Mongoose model | 21 | **22** (+`UnitCompletion`) |
| Controller | 12 | 13 (+`rewardController`) |
| Curriculum đã seed | 3 Book · 27 Unit · 19 Topic · 108 Lesson · 234 Activity · 840 Question · 243 LanguageContent · ~384 Vocabulary | không đổi |
| Ngôn ngữ `LanguageContent` | 9 loại: WORD, PHRASE, SENTENCE, QUESTION, ANSWER, INSTRUCTION, PATTERN, ORACY, DIALOGUE | không đổi |
| `activityType` enum | 18 (DB thật dùng 11) | **11** (sau §2.4.7) |
| Game engine phía client | 12 | 12 hoặc 14 (tùy §2.4.3) |
| **Activity render sai UI** | **30** | **0** |
| Huy hiệu | 20 (10 hành trình · 5 sao · 5 kỹ năng) | 20 — persist server-side |
| Sticker | 15 (4 độ hiếm) | 15 — cấp **tất định theo Unit** |
| **Sao thưởng mỗi Unit** | **0** (chỉ là text tĩnh) | **5** (§1.2.5) |
| Tài khoản demo | 1 ADMIN · 1 TEACHER · 22 CHILD | không đổi (nhưng avatar phải unique — §2.6.4) |
| Code chết phía client | 1637 dòng | ~0 |
| Số lần dùng `any` | 164 | giảm (ưu tiên `api.ts` + `types/index.ts`) |
| **Test có assertion** | **0** | **6 luồng lõi** (§7.5.5) |
| Công thức sao | `threeStarsMin: 90`, `twoStarsMin: 70`, `oneStarMin: 50` (tối đa 3 sao/activity) | không đổi |
| Ngưỡng mastered từ vựng | `streak >= 3` **hoặc** (`accuracy >= 0.80` **và** `attemptCount >= 5`) | `streak >= 3` **và** `accuracy >= 0.80` **và** `attemptCount >= 5` (§4.9) |
| Mức mastery | 0 Not Started · 1 Learning · 2 Practicing · 3 Mastered | không đổi |
| **Định nghĩa "lesson complete"** | `ar.stars > 0` (**sai**) | `Progress.completed === true` (§4.11) |
