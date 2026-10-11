/**
 * Test E – Kiểm tra TopicCard không cắt chữ, không chồng nhau
 * Chạy trong DevTools Console tại http://localhost:5173/?tab=topics
 *
 * Cách dùng:
 *   1. Mở http://localhost:5173/?tab=topics
 *   2. Mở DevTools > Console
 *   3. Copy-paste toàn bộ script này và Enter
 */
(function runTopicCardTests() {
  const results = [];
  let pass = 0, fail = 0;

  function log(ok, msg) {
    const icon = ok ? 'PASS' : 'FAIL';
    console[ok ? 'log' : 'error'](`[${icon}] ${msg}`);
    results.push({ ok, msg });
    ok ? pass++ : fail++;
  }

  const cards = [...document.querySelectorAll('[aria-label^="Mo chu de"], [aria-label^="Mở chủ đề"]')];
  log(cards.length > 0, `Tim thay ${cards.length} the TopicCard`);

  cards.forEach((card, ci) => {
    const label = card.getAttribute('aria-label') || `Card ${ci}`;
    const cardRect = card.getBoundingClientRect();
    const chipEl = card.querySelector('span');
    const titleEl = card.querySelector('h3');

    // Test 1: scrollHeight check
    [chipEl, titleEl].filter(Boolean).forEach(el => {
      const ok = el.scrollHeight <= el.clientHeight + 2;
      log(ok, `[Card ${ci}] ${el.tagName} scrollH(${el.scrollHeight}) <= clientH(${el.clientHeight})+2`);
    });

    // Test 2: Ten chu de >= 22px
    if (titleEl) {
      const fs = parseFloat(getComputedStyle(titleEl).fontSize);
      log(fs >= 21.5, `[Card ${ci}] Ten fontSize=${fs.toFixed(1)}px (>=22px?): "${titleEl.textContent?.trim()}"`);
    }

    // Test 3: Chip 1 dong
    if (chipEl) {
      log(chipEl.scrollHeight <= chipEl.clientHeight + 2,
        `[Card ${ci}] Chip 1 dong`);
    }

    // Test 4: Ten nam trong the
    if (titleEl) {
      const tr = titleEl.getBoundingClientRect();
      const ok = tr.top >= cardRect.top - 3 && tr.bottom <= cardRect.bottom + 3;
      log(ok, `[Card ${ci}] Ten nam trong the (top:${tr.top.toFixed(0)} in ${cardRect.top.toFixed(0)}-${cardRect.bottom.toFixed(0)})`);
    }

    // Test 5: Chu >= 14px
    let minFs = 999;
    card.querySelectorAll('*').forEach(el => {
      if (!el.children.length && el.textContent?.trim()) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs > 0) minFs = Math.min(minFs, fs);
      }
    });
    log(minFs >= 13.5, `[Card ${ci}] Chu nho nhat = ${minFs.toFixed(1)}px (>=14px?)`);

    // Test 6: Khong chong nhau (chip vs title)
    if (chipEl && titleEl) {
      const a = chipEl.getBoundingClientRect();
      const b = titleEl.getBoundingClientRect();
      const overlap = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      log(!overlap, `[Card ${ci}] Chip va Ten khong chong nhau`);
    }
  });

  // Test 7: Trang khong tran ngang
  const pageOk = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2;
  log(pageOk, `Trang khong tran ngang (scrollW=${document.documentElement.scrollWidth}, clientW=${document.documentElement.clientWidth})`);

  console.log('');
  console.log(`=== KET QUA: ${pass} dat / ${fail} loi ===`);
  return { pass, fail, results };
})();
