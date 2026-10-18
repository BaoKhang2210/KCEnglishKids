# Phân tích & Đề xuất Hệ thống Phần thưởng — KCEnglishKids

> Báo cáo READ-ONLY. Mọi kết luận về hành vi hệ thống đều có dẫn chứng `file:line`. Một số điểm cần kiểm tra thêm được ghi rõ "chưa verify được".
> Tóm tắt 1 câu: Hệ thống hiện có 4 loại thưởng (sao / huy hiệu / sticker / rương báu) nhưng **khung thưởng đang thiếu nhất quán**: streak hứa thưởng sao nhưng không bao giờ trao, huy hiệu "kỹ năng" mô tả một đường nhưng mở khóa theo đường khác, mastery từ vựng hoàn toàn tách rời economy, và sao thưởng của giáo viên chấm bài có thể bị mất. Đề xuất: thống nhất về "sao = tiền tệ/progress, huy hiệu = thành tựu mốc, sticker = sưu tập theo unit, rương = phần thưởng bất ngờ khi hết unit", và hiện thực hóa các phần thưởng đang "hứa suông".

---

## 0. TÓM TẮT TRẢ LỜI TRỰC TIẾP CHO USER

**Câu hỏi 1 — "Làm gì thì mới được thưởng?" (thực tế trong code hiện tại):**
- Làm activity (game/bài tập) đúng ≥50% → nhận **0–3 sao/lesson** (sao = điểm tốt nhất trên 1 activity của lesson, server chấm). (`learningService.js:7-15`, `:158-172`)
- Hoàn thành TRỌN unit (tất cả lesson của unit) → server tự **+5 sao bonus + 1 sticker** (deterministic theo unit). (`rewardService.js:58-61`, `:92-120`)
- Tham gia lớp học trực tiếp (Classroom Session) → giáo viên **tặng sao thủ công**. (`classroomSessionController.js:210-270`)
- **KHÔNG** có thưởng cho: streak ngày liên tục (hứa 10/25/50/100 sao nhưng **không bao giờ trao**), mastery từ vựng, hoàn thành 1 lesson riêng lẻ (chỉ có sao activity).

**Câu hỏi 2 — "Thưởng như thế nào thì hợp lý?" (đề xuất, chi tiết §6):**
- Giữ vai trò 4 loại: **sao = tiền tệ + progress**, **huy hiệu = thành tựu mốc (không tiêu xài)**, **sticker = sưu tập theo unit (không trùng)**, **rương = phần thưởng bất ngờ kết thúc unit**.
- Thêm thưởng thật cho streak (trao đúng lúc chạm mốc), cho mastery từ vựng, và sửa huy hiệu "kỹ năng" để mở khóa đúng theo mô tả.
- Trả lời đầy đủ ở §6.

---

## 1. BẢNG TỔNG QUAN — TẤT CẢ LOẠI PHẦN THƯỞNG HIỆN CÓ

| Loại | Định nghĩa | Đơn vị | Hiển thị ở đâu | Nguồn cấp (BE/FE) | Giới hạn / trần |
|---|---|---|---|---|---|
| **Sao vàng (star)** | Tiền tệ + chỉ báo progress. `totalStars = earnedStars + bonusStars + classroomStars` | số nguyên | Header (`ChildHeader.tsx`), banner tab badges, modal `ChildBadgesModal`, `ChestRevealModal` | BE = single source of truth (`rewardService.js:175`) | earned ≤ 3/lesson (max single-activity); bonus +5/unit; không có trần tổng |
| **Huy hiệu (badge)** | Thành tựu mốc, **không tiêu xài**, **không lưu trên server** — được TÍNH lại trên FE mỗi lần render | boolean unlocked / 20 huy hiệu | Tab "Bộ sưu tập" → Huy hiệu; modal `ChildBadgesModal` | FE tính (`ChildHomePage.tsx:578-585`, `ChildBadgesModal.tsx:58-72`) | 20 huy hiệu cố định trong `badges.ts`, không mở rộng động |
| **Sticker** | Đồ sưu tập, mở qua rương báu khi hết unit; **deterministic** (cùng unit luôn ra cùng sticker) | 15 sticker, id `st_*` | Tab "Bộ sưu tập" → Sticker; `ChestRevealModal` | BE cấp (`rewardService.js:pickSticker`), FE hiển thị | 15 sticker, 1/unit → tối đa 9 sticker/child cho 9 unit; `st_star` là sticker khởi điểm miễn phí |
| **Rương báu (chest)** | "Wrapper" phần thưởng kết thúc unit: chứa +5 sao + 1 sticker. "Mở rương" là COSMETIC (rewards đã cấp lúc hoàn thành unit) | 1 rương / unit hoàn thành | Kệ rương `ChestShelfModal`, mở rương `ChestRevealModal` | BE tạo `UnitCompletion` (`rewardService.js:grantUnitCompletion`) | 1/unit, idempotent (unique index {child, unit}) |
| **Streak (chuỗi ngày)** | Đếm số ngày học liên tiếp, hiển thị ngọn lửa cấp 1–4 | số ngày | `DailyStreakBadge` header, `DailyStreakModal` | BE (`streakController.js`) | cấp 1/2/3/4 = 1/3/7/14+ ngày; **rewardStars hiển thị nhưng KHÔNG trao** |
| **Mastery từ vựng** | Trạng thái nắm từ (MASTERED/REVIEW/LEARNING), score 0–100% | bản ghi/vocabulary | Sổ từ vựng (tab vocab) | FE localStorage + sync BE (`vocabMasteryService.ts`), BE `vocabMasteryController.js` | **KHÔNG kết nối economy — chỉ là dashboard** |
| **Classroom stars** | Sao giáo viên tặng trong session lớp học trực tiếp | số nguyên | Cộng thẳng vào totalStars (không hiển thị riêng cho child) | BE (`classroomSessionController.js:210-270`) | Không trần, giáo viên quyết định |

---

## 2. HÀNH ĐỘNG → THƯỞNG (HIỆN TẠI) — truy vết CODE

| Hành động của trẻ | Được gì | Nơi cấp phát | Giá trị | Dẫn chứng |
|---|---|---|---|---|
| Làm 1 activity đúng | 0–3 sao (best attempt) | BE: `processActivityResult` upsert Progress `$max stars` | 3 sao nếu ≥90% đúng, 2 nếu ≥70%, 1 nếu ≥50%, 0 nếu <50% | `learningService.js:7-15` (calculateStars), `:158-172` ($max), route `POST /api/learning/activity-results` (`learningRoutes.js:14`, `learningController.js:56-89`) |
| Hoàn thành TẤT CẢ activity của 1 lesson | lesson `completed=true` (KHÔNG thêm sao bonus riêng) | BE: `progress.completed=true` khi `session.status==='COMPLETED'` | +0 sao thưởng hoàn thành, chỉ đếm vào completedLessons | `learningService.js:177-179` |
| Hoàn thành TRỌN unit (mọi lesson của unit) | +5 sao bonus + 1 sticker (+ 1 rương để mở) | BE: `checkAndGrantUnitCompletion` → `grantUnitCompletion` | sao: `STAR_BONUS_PER_UNIT=5` (`rewardService.js:18`); sticker deterministic (`pickSticker` `:43-48`) | `rewardService.js:58-61`, `:92-120` |
| Mở rương báu (click reveal) | KHÔNG thêm gì — chỉ cosmetic | BE: `revealChest` set `revealedAt` | +0 (rewards đã cấp lúc hoàn thành unit) | `rewardService.js:186-205`, `rewardController.js:revealChildChest` |
| Học liên tiếp N ngày (streak) | HIỂN THỊ hứa +10/25/50/100 sao nhưng **KHÔNG trao** | BE: `getChildStreak` chỉ tăng biến đếm | +0 sao thực tế | `streakController.js:76-80` (rewardStars display), `:94-160` (không grant) |
| Đạt mastery từ vựng (MASTERED) | KHÔNG có thưởng | FE localStorage + sync BE | +0 sao/badge/sticker | `vocabMasteryService.ts` (toàn bộ), `vocabMasteryController.js:recordPractice` |
| Tham gia lớp trực tiếp, được GV tặng | sao thủ công | BE: `scoreStudent`/`scoreBulk` | do GV | `classroomSessionController.js:210-270` |
| GV chấm bài tập + bonus sao | `student.stars += addedStars` — **NHƯNG User schema không có field `stars`** → khả năng cao KHÔNG được lưu (Mongoose strict) | BE: `reviewAssignmentSubmission` | thêm vào User.stars (không persist) | `teacherController.js:351-353`, `models/User.js` (không có `stars`) |

### Đường ống sao (data flow) chi tiết
```
Child làm activity
  → POST /api/learning/activity-results  (learningRoutes.js:14)
  → processActivityResult (learningService.js:118)
     ├─ gradeActivityAnswers: server chấm lại, KHÔNG tin isCorrect của client (learningService.js:20-72)
     ├─ calculateStars(score, maxScore) → 0-3 sao (learningService.js:7-15)
     ├─ Progress.findOneAndUpdate $max{stars, highestScore}, $inc{attempts} (learningService.js:158-172)
     ├─ nếu session.status==='COMPLETED' → progress.completed=true (learningService.js:177-179)
     └─ nếu progress.completed → checkAndGrantUnitCompletion(childId, lessonId) (learningService.js:225-227)
        → nếu mọi ACTIVE lesson của unit đều completed → grantUnitCompletion
           → UnitCompletion.create{rewards:[STAR 5, STICKER]}  (rewardService.js:58-72, :92-120)

UI đọc:
  → GET /api/children/:childId/rewards  (childrenRoutes.js)
  → computeRewards (rewardService.js:123-181)
     ├─ earnedStars  = Σ Progress.stars
     ├─ bonusStars   = Σ UnitCompletion.STAR.amount  (5/unit)
     ├─ classroomStars = Σ ClassroomSession.studentScores.stars
     └─ totalStars = earnedStars + bonusStars + classroomStars  (rewardService.js:175)
  → RewardContext.tsx (FE single source) → ChildHeader / ChildHomePage / modals
```

---

## 3. LOGIC HIỆN TẠI CHI TIẾT

### 3.1 Sao được tính thế nào
- **Backend là single source of truth**, đúng như comment `RewardContext.tsx` (dòng 1-13) và `ChildHomePage.tsx` §1.2.18.
- Công thức: `totalStars = earnedStars + bonusStars + classroomStars` (`rewardService.js:175`).
  - `earnedStars` = Σ `Progress.stars` — mỗi lesson đóng góp **tối đa 3** = sao tốt nhất trên **1 activity** của lesson (dùng `$max` khi upsert, `learningService.js:165-167`). Tức là lesson 5 activity, trẻ 3-sao 1 game và 0-sao 4 game còn lại → lesson vẫn đóng góp 3 sao.
  - `bonusStars` = +5 mỗi unit hoàn thành (`rewardService.js:18`, `:148`).
  - `classroomStars` = sao giáo viên tặng trong ClassroomSession (`rewardService.js:142-146`).
- **Có cộng bonus unit** đúng như comment gợi ý, và còn cộng cả classroom stars.
- Hai đầu ra "totalStars" tồn tại song song và KHÁC nhau:
  - `progressController.getChildProgress` → `totalStars = Σ progress.stars` (KHÔNG có bonus/classroom) (`progressController.js:20-27`).
  - `rewardService.computeRewards` → có bonus + classroom (`rewardService.js:175`).
  - FE ưu tiên `rewards.totalStars` (computeRewards), chỉ fallback về progress khi loading (`ChildHomePage.tsx` §1.2.18). Nhất quán ở UI.

### 3.2 Badge reqType / ngưỡng
- Định nghĩa trong `badges.ts` (20 huy hiệu, 3 nhóm: journey/stars/skills, 4 tier đồng/bạc/vàng/kim cương).
- `reqType` xác định **dùng số nào** để so `>= requirement` (logic FE, `ChildHomePage.tsx:578-585` & `ChildBadgesModal.tsx:58-72`):
  - `star` → so `totalStars` (gồm bonus + classroom)
  - `unit` → so `completedUnits` (số UnitCompletion)
  - `lesson` → so `completedLessons` (số Progress.completed)
- **Huy hiệu KHÔNG lưu trên server** — chỉ tính lại trên FE mỗi render, không có audit trail, không persistence. Mở khóa = pure derived.
- **Mâu thuẫn mô tả vs logic (nghiêm trọng, nhóm 'skills'):**
  - `b_quiz_master` "Đúng 100% câu hỏi" reqType=lesson req=2 → mở khóa khi `completedLessons≥2` (bất kỳ lesson nào), KHÔNG phải khi đúng 100% 1 quiz. (`badges.ts` b_quiz_master, logic `ChildHomePage.tsx:582-584`)
  - `b_memory` "Chiến thắng trò chơi tìm cặp" lesson req=4 → mở khi `completedLessons≥4`, không liên quan memory game. (tương tự)
  - `b_pronounce` "phát âm chuẩn" lesson req=6 → mở khi `completedLessons≥6`. (tương tự)
  - `b_chest` "Mở khóa 2 hộp quà" unit req=2 → mở khi `completedUnits≥2` → tương quan với rương (mỗi unit = 1 rương) nên gần đúng.
  - `b_master` "Tích lũy 30 sao & hoàn thành xuất sắc" star req=30 → chỉ kiểm tra totalStars≥30, không kiểm tra "hoàn thành xuất sắc".
- **Mâu thuẫn nhẹ nhóm 'journey' theo chủ đề:** `b_animals/food/toys/nature/home` mô tả theo chủ đề (động vật/đồ ăn/đồ chơi/thiên nhiên/nhà) nhưng mở khóa theo **tổng số lesson hoàn thành** bất kể chủ đề nào (`badges.ts` b_animals req=2 ... b_home req=6).
- `b_streak` tên/giải thích gợi ý "chăm chỉ/streak" nhưng reqType=star req=8 → chỉ là "đạt 8 sao", KHÔNG phải streak ngày.

### 3.3 Sticker mở khóa khi nào
- Đúng như comment `stickers.ts` (dòng cuối) và `RewardContext` §1.2.16: sticker **chỉ do server cấp khi hoàn thành unit**, mở qua rương báu. `st_star` là sticker khởi điểm miễn phí (`ChildHomePage.tsx` unlockedStickers, `ChildBadgesModal.tsx`).
- **Deterministic per unit**: `pickSticker(unit)` = `STICKER_IDS[((bookNumber-1)*9 + (unitNumber-1)) % 15]` (`rewardService.js:43-48`). Cùng unit → cùng sticker, không random. → **KHÔNG phải "random surprise"** như tên "rương báu" gợi ý; sticker là phần thưởng cố định.
- localStorage `stickerService` cũ (awardRandomSticker) đã bị xóa (`stickers.ts` comment), server là nguồn duy nhất. Tốt.

### 3.4 Chest / rương báu hoạt động ra sao
- 1 UnitCompletion/unit khi hoàn thành trọn unit, idempotent (unique index `{child, unit}`, catch E11000, `UnitCompletion.js`, `rewardService.js:64-72`).
- `rewards` = [{type:STAR, amount:5}, {type:STICKER, refId}] được cấp **ngay lúc tạo** UnitCompletion.
- `revealedAt` chỉ là cosmetic: rewards **không mất** nếu không mở (`rewardService.js:186-205`, comment trong `UnitCompletion.js`).
- FE: "Kệ rương" (Màn 1, `ChestShelfModal`) hiển thị 3 trạng thái (chưa đủ điều kiện / có quà mới `revealedAt=null` / đã mở). "Mở rương" (Màn 2, `ChestRevealModal`) gọi `revealChest` (cosmetic) rồi show +5 sao + sticker.
- **Trùng lặp khái niệm:** chest = sticker + sao bonus, tức trùng hoàn toàn với thưởng hoàn thành unit. Rương không phải một loại thưởng riêng, chỉ là **cách trình bày** phần thưởng unit. Về mặt economy, chỉ có "sao bonus" và "sticker".

### 3.5 Trùng lặp / không nhất quán FE vs BE
- **Streak reward HỨA SUÔNG**: FE `DailyStreakModal.tsx` hiển thị "+{nextMilestone.rewardStars} ⭐ Thưởng" và "Còn X ngày nữa để mở khóa!", nhưng BE `streakController.js` không bao giờ grant sao đó. Đây là **false promise** rõ ràng nhất.
- **Sao giáo viên chấm bài có thể bị mất**: `teacherController.js:351-353` `student.stars += addedStars`, nhưng `models/User.js` **không có field `stars`** → với Mongoose strict (default), field này **không được persist**; `studentStars` trả về chỉ là giá trị in-memory. Cần verify bằng test, nhưng theo schema đây là reward path hỏng. (Lưu ý: classroom stars qua `ClassroomSession.studentScores` thì ĐÚNG persist và có trong totalStars.)
- **Mastery từ vựng tách rời**: `vocabMasteryService.ts` (localStorage + sync BE `vocabMasteryController.js`) không kết nối sao/badge/sticker. Một hệ thống progress riêng, trẻ "master" từ không được thưởng gì.
- **Badge FE-only**: badge không có bản ghi server → không audit, không nhất quán nếu totalStars/completedUnits tính khác nhau ở 2 đầu (hiện đang nhất quán vì đều từ computeRewards, nhưng dễ vỡ).
- **"completed" không đòi hỏi pass**: lesson `completed=true` chỉ cần làm hết activity, không cần ≥50% đúng (`learningService.js:177-179`). Trẻ làm hỏng hết vẫn "hoàn thành" → completedLessons tăng nhưng stars=0. Hợp lý cho trẻ nhỏ (áp lực thấp) nhưng làm badge đếm lesson mất ý nghĩa "thành tích".

---

## 4. ĐÁNH GIÁ TÍNH HỢP LÝ

### Điểm mạnh
- Server là single source of truth cho sao/sticker/chest (`RewardContext` đúng thiết kế). Idempotent, có audit log (`AuditLog` trong `rewardService.js`).
- Chấm điểm server-side, không tin client (`learningService.js:20-72`) — chống gian lận.
- Best-attempt (`$max`) cho sao: trẻ chơi lại để cải thiện, không bị phạt — phù hợp trẻ nhỏ, thiên mastery.
- Rương báu cosmetic không mất thưởng — trẻ quên mở vẫn không thiệt.
- UX phần thưởng phong phú: medal 3D, sticker puffy, confetti, mascot — instant feedback tốt.

### Điểm yếu / KHÔNG RÕ RÀNG
1. **Streak hứa thưởng nhưng không trao** (§3.5) — thất hứa với trẻ, phá niềm tin.
2. **Huy hiệu "kỹ năng" mở khóa sai logic** (§3.2) — "Đúng 100%" nhưng mở theo số lesson; trẻ không hiểu làm gì để nhận.
3. **Mastery từ vựng không có thưởng** — trẻ nắm nhiều từ không được công nhận, bỏ lỡ đòn bẩy học từ.
4. **Sao trùng công dụng với badge nhóm stars** (b_star_5/12/25/40): cả sao và badge đều đo "tích lũy sao" →badge nhóm stars chỉ là "cột mốc" của cùng đại lượng, không thêm thông tin.
5. **Rương = sticker + sao bonus** → trùng hoàn toàn thưởng unit, không có yếu tố "bất ngờ" (sticker deterministic). Tên "rương báu" lừa cảm giác random.
6. **Sao giáo viên chấm bài có thể mất** (§3.5) — GV tưởng tặng được nhưng có khi không lưu.
7. **Không có thưởng hoàn thành 1 lesson riêng** — trẻ hết 1 lesson chỉ thấy sao activity, không có "moment" hoàn thành lesson (trừ khi đó là lesson cuối của unit mới có rương).
8. **Trẻ khó biết "làm gì để nhận X"**: sticker thì rõ (hết unit), nhưng badge nhóm skills/journey theo chủ đề thì mô tả không khớp điều kiện → trẻ bối rối.

### Reward có vấn đề cụ thể
- **Dead/false reward**: streak milestone stars (10/25/50/100) — hiển thị nhưng không trao.
- **Reward không bao giờ đạt được theo đúng mô tả**: b_quiz_master ("đúng 100%") không có đường đạt đúng mô tả (chỉ đạt qua đếm lesson). Tương tự b_memory/b_pronounce.
- **Action đáng thưởng mà không có thưởng**: mastery từ vựng; streak thực sự; hoàn thành lesson đầu tiên (b_first_step mở theo completedLessons≥1 OK, nhưng không có "phễu" cảm nhận).
- **Quá dễ / quá khó**: b_star_40 (40 sao) dễ đạt nếu hoàn thành 8 unit (8×5=40 bonus) dù lesson học kém; b_unit_all (9 unit) là mục tiêu xa hợp lý. Streak cấp 4 (14 ngày) khó với trẻ mầm non.

---

## 5. THAM CHIẾU BEST PRACTICE (gamification cho trẻ em học app)

Tóm tắt nguyên tắc (tham chiếu các nguồn gamification cho giáo dục/trẻ em — material rephrased cho compliance):

- **Immediate, clear feedback**: thưởng/feedback ngay sau hành động, rõ ràng nhân quả ("đúng → sao").
- **Variable / surprise reward**: thưởng bất ngờ giữ engagement (đúng vai trò "rương báu" — nhưng phải thật random).
- **Collection drive**: sưu tập (sticker) tạo động lực dài hạn.
- **Mastery over completion**: thưởng theo mức độ thành thạo, không chỉ "đã làm xong" — tránh over-justification (phần thưởng ngoại sinh làm lụy động lực nội sinh). Phần thưởng nên "chứng nhận" điều trẻ thực sự làm được, kéo trẻ tới hành động ý nghĩa tiếp theo.
- **Tránh over-justification**: sticker chart/prize ngắn hạn được nhưng dạy trẻ "làm để lấy quà" thì hại động lực dài hạn; kết hợp khen nỗ lực + thành tựu thật.
- **Fairness, no pressure**: với trẻ mầm non, tránh áp lực, cho retry, không so sánh công khai gây áp lực.
- **Clear path**: trẻ phải hiểu "làm X → được Y" — mô tả reward phải khớp điều kiện thật.
- **Badges phải "certify"**: huy hiệu chứng nhận một kỹ năng/thành tựu cụ thể, không phải decoration đếm số chung.

(Nguồn tham chiếu: Educational Psychology Review meta-analysis về gamification; Yu-kai Chou "badge gamification"; các bài về over-justification ở trẻ em. Nội dung được diễn lại, không trích nguyên văn.)

---

## 6. ĐỀ XUẤT GIẢI PHÁP TỐT NHẤT — REWARD ECONOMY THỐNG NHẤT

### 6.1 Phân vai trò 4 loại (tránh chồng chéo)
| Loại | Vai trò | Tiêu xài được? | Cấp khi nào |
|---|---|---|---|
| **Sao** | Tiền tệ + progress (đo nỗ lực) | Không (chỉ tích lũy hiển thị) | mỗi activity đúng + hoàn thành lesson + unit bonus |
| **Huy hiệu** | Thành tựu MỐC (certify) — cố định, không tiêu | Không | chạm ngưỡng cụ thể (mastery/streak/unit) |
| **Sticker** | Sưu tập theo unit — không trùng sao | Không | hết unit (như hiện tại) |
| **Rương báu** | Phần thưởng BẤT NGỜ kết thúc unit | — | hết unit (như hiện tại) nhưng nên random sticker |

### 6.2 Bảng HÀNH ĐỘNG → THƯỞNG (đề xuất, có công thức + lý do)

| Hành động | Thưởng đề xuất | Công thức | Vì sao hợp lý |
|---|---|---|---|
| Làm activity đúng | sao activity (giữ) | 3/2/1/0 sao theo ≥90/70/50% | immediate feedback, mastery, best-attempt giữ |
| Hoàn thành 1 lesson (mọi activity) | **+1 sao bonus lesson** (MỚI) | cộng vào Progress khi `completed=true` | hiện tại hoàn thành lesson không có "moment"; +1 tạo cảm giác thành tựu vừa đủ, không lạm phát |
| 3-sao 1 lesson (xuất sắc) | giữ 3 sao activity (đã có) | — |奖励 nỗ lực tốt |
| Hoàn thành trọn unit | **+5 sao bonus + 1 sticker** (giữ) + mở rương random | giữ STAR_BONUS_PER_UNIT=5 | mốc lớn, sticker sưu tập |
| Streak 3/7/14/30 ngày | **TRAO THẬT** +10/+25/+50/+100 sao tại mốc (SỬA) | grant khi `streak` chạm target (idempotent bằng cột `streakRewardClaimed`) | sửa false promise; nuôi thói quen |
| Đạt mastery 1 cụm từ (MASTERED) | **+2 sao/từ khi mới master** (MỚI, có trần/ngày) | grant lúc masteryLevel 0→3, cap 5 từ/ngày | kết nối economy với học từ, tránh farm |
| GV tặng trong lớp | giữ classroom stars | do GV | công nhận học lớp |
| GV chấm bài + bonus | **sửa**: lưu vào đúng chỗ (ActivityResult.teacherFeedback + cộng classroom-style hoặc Progress) | KHÔNG ghi User.stars | sửa bug không persist |
| Mở rương | giữ cosmetic | — | không thay đổi |

### 6.3 Mức thưởng cụ thể đề xuất
- **Sao/lesson**: activity 0–3 (best attempt) + **+1 bonus khi completed** (mới).
- **Bonus unit**: +5 (giữ) + 1 sticker random (đề xuất random thay deterministic để rương thật "bất ngờ"; hoặc giữ deterministic nếu muốn trẻ biết trước — chọn 1, khuyến nghị random để đúng vai trò rương).
- **Badge thresholds** (SỬA cho khớp mô tả):
  - Nhóm journey: giữ theo unit/lesson count nhưng **sửa mô tả** cho khớp ("Hoàn thành X lesson") thay vì gắn chủ đề.
  - Nhóm stars: giữ (5/12/25/40) — đây là mốc sao, hợp lý.
  - Nhóm skills: **đổi reqType/điều kiện thật**:
    - `b_quiz_master`: mở khi có ≥1 lesson đạt 3 sao (đúng 100% 1 activity) — cần backend expose "lessonMaxStars===3".
    - `b_memory`: mở khi hoàn thành 1 activity MEMORY_CARD (`activityType==='MEMORY_CARD'`, đã có `ActivityResult`).
    - `b_pronounce`: cần metric phát âm — nếu chưa có, **đổi mô tả** thành "Hoàn thành X lesson nghe/nói" với điều kiện thật hoặc tạm bỏ.
    - `b_master`: mở khi totalStars≥30 VÀ ≥X lesson 3-sao.
- **Sticker unlock**: 1/unit (giữ); đề xuất random trong pool chưa có để tránh trùng → nhưng đơn giản nhất giữ deterministic.
- **Chest drop**: 1/unit, chứa +5 sao + 1 sticker (giữ); reveal cosmetic (giữ).

### 6.4 Cần thay đổi gì ở CODE (file cụ thể)
**Backend (ưu tiên):**
1. `streakController.js`: thêm grant sao thật khi chạm mốc. Cần thêm trường `streakRewardClaimed` (mảng milestone đã nhận) trên `User.js` để idempotent; khi `isNewDayIncrement && streak chạm target` → tạo reward STAR. Ưu tiên cao — sửa false promise.
2. `models/User.js`: thêm `stars` field HOẶC chuyển `reviewAssignmentSubmission` sang cộng vào `Progress`/`ActivityResult`. Sửa bug GV chấm bài.
3. `learningService.js`: thêm +1 sao bonus khi `progress.completed` chuyển true lần đầu (lesson completion bonus). Cần idempotent (dùng cờ hoặc kiểm tra `completed` cũ).
4. `rewardService.js` + `models/Progress.js` hoặc `VocabularyMastery.js`: thêm grant +2 sao khi mastery 0→3 (cap/ngày). Cần hook khi `recordPractice`/`syncMastery` phát hiện lên level 3.
5. `rewardService.js`/API: expose metric cho badge "skills" thật: lessonMaxStars, activityType completed (MEMORY_CARD). Mở rộng `RewardSummary` thêm các trường này; FE `badges.ts` + `ChildHomePage.tsx`/`ChildBadgesModal.tsx` đổi điều kiện `unlocked`.
6. `badges.ts`: sửa mô tả cho khớp điều kiện (journey theo chủ đề → đổi thành "hoàn thành X lesson" hoặc gắn topic thật); sửa `b_streak` thành streak thật.

**Frontend:**
7. `badges.ts` + `ChildHomePage.tsx:578-585` + `ChildBadgesModal.tsx:58-72`: cập nhật `reqType`/điều kiện cho badge skills; nếu thêm điều kiện mới (mastery/memory/3-star) thì thêm field vào `BadgeItem` và logic eval.
8. `DailyStreakModal.tsx`: khi đã trao thật, hiển thị trạng thái "đã nhận" cho milestone (cần backend trả `claimedMilestones`).
9. (Tùy chọn) `ChestRevealModal.tsx`: nếu đổi sticker random, cập nhật text/giữ UX.

**Không nên làm:** không tạo bảng badge lưu server nếu chưa cần audit — hiện derived là OK nếu conditions nhất quán; ưu tiên sửa logic trước.

### 6.5 Trả lời trực tiếp 2 câu hỏi
- **"Làm gì thì mới được thưởng?" (đề xuất):** làm activity đúng ≥50% (sao), hoàn thành lesson (+1 sao mới), hoàn thành trọn unit (+5 sao + sticker + rương), học liên tiếp 3/7/14/30 ngày (sao streak thật), master từ vựng (+2 sao/từ), và tham gia lớp được GV tặng.
- **"Thưởng như thế nào thì hợp lý?":** sao = tiền tệ/progress (tích lũy, không tiêu), huy hiệu = thành tựu mốc chứng nhận kỹ năng thật (mở khóa đúng theo mô tả), sticker = sưu tập theo unit, rương = bất ngờ kết thúc unit; mỗi phần thưởng phải khớp "làm gì → được gì" và không hứa suông. Cụ thể số liệu ở §6.2–6.3.

---

## 7. DANH MỤC DẪN CHỨNG CHÍNH (file:line)

| Claim | Dẫn chứng |
|---|---|
| totalStars = earned+bonus+classroom | `KCEnglishKids_BE/src/services/rewardService.js:175` |
| bonus 5/unit, sticker deterministic | `rewardService.js:18`, `:43-48`, `:58-61` |
| sao activity 0-3 theo % | `learningService.js:7-15` |
| Progress.stars=$max (best single activity) | `learningService.js:158-172` |
| completed khi session COMPLETED (không cần pass) | `learningService.js:177-179` |
| unit completion hook | `learningService.js:225-227` |
| reveal chest cosmetic | `rewardService.js:186-205` |
| streak rewardStars display-only, không grant | `streakController.js:76-80`, `:94-160` |
| GV chấm bài ghi User.stars (không có field) | `teacherController.js:351-353`, `models/User.js` |
| classroom stars do GV | `classroomSessionController.js:210-270` |
| badge eval FE-only | `ChildHomePage.tsx:578-585`, `ChildBadgesModal.tsx:58-72` |
| sticker chỉ server cấp | `stickers.ts` (comment cuối), `RewardContext.tsx:1-13` |
| mastery tách rời economy | `vocabMasteryService.ts`, `vocabMasteryController.js` |
| progress totalStars không có bonus | `progressController.js:20-27` |

## 8. CÁC ĐIỂM CHƯA VERIFY ĐƯỢC (cần kiểm tra thêm)
- **User.stars không persist**: kết luận dựa vào schema không có field + default Mongoose strict. Cần test thực tế (tạo user, gọi reviewAssignmentSubmission, reload) để xác nhận `student.stars` có lưu hay không.
- **Số activity/lesson thực tế mỗi unit** (để tinh chỉnh ngưỡng badge): cần query DB seed; báo cáo này đọc schema/logic, không chạy dữ liệu.
- **Có tồn tại badge "dead" không bao giờ hiển thị**: 20 badge đều render, không có dead-render; nhưng `b_pronounce` (phát âm) nếu không có metric phát âm thì mô tả không khớp — cần xác nhận có activity pronunciation hay không.
- **Wiki `Reward Showcase Integration.md` đã cũ** (mô tả localStorage stickerService đã xóa) — dùng làm tham khảo thiết kế, không dùng làm nguồn sự thật hiện tại.
