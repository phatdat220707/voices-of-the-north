/* =============================================================================
 * 60-ask-story — 提問求古（Ask a Story）純前端閉環
 * -----------------------------------------------------------------------------
 * 追加式模組：不改寫既有故事 pin / 年代篩選 / 錄音核心函式。
 *   ① 主頁／地圖子母伴生小入口 → ② 二級填寫選點抽屜 → ③ 地圖提問圖標
 *   → ④ 詳情卡攜帶上下文跳轉 #recording → ⑤ 一問多答 answers[] 預留
 * 資料只存 VTN.KEYS.questions / askContext（localStorage），無任何後端程式碼。
 * ========================================================================== */

(function () {
  'use strict';

  var VTN = window.VTN;
  var U = VTN.util;

  function t(key, vars) { return VTN.i18n.t(key, vars); }
  function byId(id) { return document.getElementById(id); }
  function node(tag, attrs) { return U.node(tag, attrs); }

  /* ---- 村落座標字典（純前端常量；經緯度取自 data/stories.json 附近值）------ */
  var VILLAGES = [
    { name: '粉嶺聯和墟', lat: 22.4982, lng: 114.1435 },
    { name: '古洞村', lat: 22.5020, lng: 114.1040 },
    { name: '上水河上鄉', lat: 22.5100, lng: 114.1120 },
    { name: '荔枝窩', lat: 22.5320, lng: 114.1810 },
    { name: '谷埔', lat: 22.5290, lng: 114.1930 },
    { name: '沙頭角', lat: 22.5310, lng: 114.2100 },
    { name: '吉澳', lat: 22.5450, lng: 114.2280 }
  ];

  var ROLES = ['ask.role1', 'ask.role2', 'ask.role3', 'ask.role4'];
  var CHIPS = ['ask.chip1', 'ask.chip2', 'ask.chip3', 'ask.chip4', 'ask.chip5'];
  var DECADES = ['ask.dec1950', 'ask.dec1960', 'ask.dec1970', 'ask.dec1980', 'ask.dec1990', 'ask.decUnknown'];

  var DEFAULT_QUESTIONS = [
    {
      id: 'Q-FL-001',
      questionText: '請問有街坊記得 60 年代粉嶺聯和墟公秤喺邊個位置？當年係點樣睇秤㗎？',
      village: '粉嶺聯和墟', decade: 'ask.dec1960', askerRole: 'ask.role1',
      lat: 22.4982, lng: 114.1435, privacyRadiusMeters: 800,
      status: 'open', createdAt: '2026-11-15', answers: []
    },
    {
      id: 'Q-KT-002',
      questionText: '古洞村 1962 年溫黛風球嗰陣，村民點樣避難？有冇人記得當時嘅情況？',
      village: '古洞村', decade: 'ask.dec1960', askerRole: 'ask.role2',
      lat: 22.5020, lng: 114.1040, privacyRadiusMeters: 800,
      status: 'open', createdAt: '2026-11-15', answers: []
    },
    {
      id: 'Q-LCW-003',
      questionText: '荔枝窩村口以前嘅老士多賣啲乜？有冇街坊記得老闆嘅名字？',
      village: '荔枝窩', decade: 'ask.dec1950', askerRole: 'ask.role3',
      lat: 22.5320, lng: 114.1810, privacyRadiusMeters: 800,
      status: 'open', createdAt: '2026-11-15', answers: []
    }
  ];

  /* ---- 狀態 ------------------------------------------------------------- */
  var draft = null;
  var layer = null;
  var scrim = null;
  var sheet = null;
  var bodyEl = null;
  var card = null;
  var banner = null;
  var questionMarkers = {};
  var pinZoomBound = false;
  var openQuestionId = null;
  var activeContext = null;
  var prevOnChange = null;

  /* ---- 儲存（純前端）----------------------------------------------------- */
  function rawGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function rawSet(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; } }

  function loadQuestions() {
    var raw = rawGet(VTN.KEYS.questions);
    var list = null;
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = null; } }
    if (!Array.isArray(list) || !list.length) {
      list = DEFAULT_QUESTIONS.map(function (q) {
        return JSON.parse(JSON.stringify(q));
      });
      rawSet(VTN.KEYS.questions, JSON.stringify(list));
    }
    return list;
  }
  function saveQuestions(list) { rawSet(VTN.KEYS.questions, JSON.stringify(list)); }

  function loadContext() {
    var raw = rawGet(VTN.KEYS.askContext);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function saveContext(ctx) {
    if (!ctx) { try { window.localStorage.removeItem(VTN.KEYS.askContext); } catch (e) {} return; }
    rawSet(VTN.KEYS.askContext, JSON.stringify(ctx));
  }

  /* ---- 入口注入 ---------------------------------------------------------- */
  function makeEntry(id, classNames, html, ariaKey, onClick) {
    var btn = node('button', {
      type: 'button', id: id, class: classNames,
      'data-i18n-aria': ariaKey, 'data-i18n-title': ariaKey
    });
    btn.innerHTML = html;
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      onClick();
    });
    return btn;
  }

  function injectEntries() {
    var home = byId('startRecordBtn');
    if (home && !byId('askEntryHome')) {
      /* 從 CTA 內部移出，作為獨立區塊放在「開始錄音」正下方（塊級流，不干擾既有按鈕） */
      var companion = makeEntry('askEntryHome', 'ask-entry',
        '<i class="fa-solid fa-circle-question" aria-hidden="true"></i><span data-i18n="ask.entry"></span>',
        'ask.entryAria', openSheet);
      var row = node('div', { class: 'ask-entry-row' });
      row.appendChild(companion);
      home.parentNode.insertBefore(row, home.nextSibling);
    }

    var tools = document.querySelector('.atlas__tools');
    if (tools && !byId('askEntryMap')) {
      var mapEntry = makeEntry('askEntryMap', 'atlas-btn atlas-btn--ask',
        '<i class="fa-solid fa-circle-question" aria-hidden="true"></i>',
        'ask.entryAria', openSheet);
      tools.insertBefore(mapEntry, tools.firstChild);
    }
  }

  /* ---- 二級抽屜 ---------------------------------------------------------- */
  function ensureSheet() {
    if (sheet) return;

    layer = node('div', { class: 'ask-layer', id: 'askLayer' });
    scrim = node('div', { class: 'ask-scrim' });
    scrim.addEventListener('click', closeSheet);

    sheet = node('div', {
      class: 'ask-sheet', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': 'askSheetTitle'
    });
    sheet.appendChild(node('div', { class: 'ask-grab', 'aria-hidden': 'true' }));

    var head = node('div', { class: 'ask-head' });
    var titles = node('div', { class: 'ask-head__titles' });
    titles.appendChild(node('h2', {
      class: 'ask-head__title', id: 'askSheetTitle', 'data-i18n': 'ask.title'
    }));
    titles.appendChild(node('p', {
      class: 'ask-head__sub', 'data-i18n': 'ask.sub'
    }));
    var closeBtn = node('button', {
      type: 'button', class: 'ask-close', 'data-i18n-aria': 'ask.cancel'
    });
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    closeBtn.addEventListener('click', closeSheet);
    head.appendChild(titles);
    head.appendChild(closeBtn);
    sheet.appendChild(head);

    bodyEl = node('div', { class: 'ask-body' });
    sheet.appendChild(bodyEl);
    layer.appendChild(scrim);
    layer.appendChild(sheet);

    var shell = byId('appShell') || document.body;
    shell.appendChild(layer);
    VTN.i18n.apply(layer);
  }

  function openSheet() {
    ensureSheet();
    draft = {
      text: '', village: VILLAGES[0].name,
      lat: VILLAGES[0].lat, lng: VILLAGES[0].lng,
      role: ROLES[0], decade: DECADES[1]
    };
    renderForm();
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    (byId('appShell') || document.body).classList.add('is-modal-open');
    setTimeout(function () {
      var first = bodyEl && bodyEl.querySelector('textarea');
      if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
    }, 120);
  }

  function closeSheet() {
    if (!layer) return;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    (byId('appShell') || document.body).classList.remove('is-modal-open');
    draft = null;
  }

  function renderForm() {
    bodyEl.textContent = '';

    /* 1. 問題內容 */
    var qField = node('div', { class: 'ask-field' });
    qField.appendChild(node('label', {
      class: 'ask-label', 'data-i18n': 'ask.questionLabel', for: 'askQuestion'
    }));
    var textarea = node('textarea', {
      id: 'askQuestion', class: 'ask-textarea', maxlength: '60',
      'data-i18n-ph': 'ask.questionPh'
    });
    textarea.addEventListener('input', function () { draft.text = textarea.value; });
    qField.appendChild(textarea);

    var chipLabel = node('p', { class: 'ask-label', 'data-i18n': 'ask.inspireLabel' });
    qField.appendChild(chipLabel);
    var chipRow = node('div', { class: 'ask-chips' });
    CHIPS.forEach(function (key) {
      var chip = node('button', { type: 'button', class: 'ask-chip', 'data-i18n': key });
      chip.addEventListener('click', function () {
        textarea.value = t(key).replace(/^#/, '');
        draft.text = textarea.value;
        textarea.focus();
      });
      chipRow.appendChild(chip);
    });
    qField.appendChild(chipRow);
    bodyEl.appendChild(qField);

    /* 2. 提問者身份 */
    var roleField = node('div', { class: 'ask-field' });
    roleField.appendChild(node('p', { class: 'ask-label', 'data-i18n': 'ask.roleLabel' }));
    var roleRow = node('div', { class: 'ask-roles', role: 'group', 'data-i18n-aria': 'ask.roleLabel' });
    ROLES.forEach(function (key, index) {
      var chip = node('button', {
        type: 'button', class: 'ask-chip', 'data-i18n': key,
        'aria-pressed': key === draft.role ? 'true' : 'false'
      });
      chip.addEventListener('click', function () {
        draft.role = key;
        Array.prototype.forEach.call(roleRow.children, function (child, i) {
          child.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
      });
      roleRow.appendChild(chip);
    });
    roleField.appendChild(roleRow);
    bodyEl.appendChild(roleField);

    /* 3. 村落 + 微縮選點 */
    var placeField = node('div', { class: 'ask-field' });
    placeField.appendChild(node('label', {
      class: 'ask-label', 'data-i18n': 'ask.villageLabel', for: 'askVillage'
    }));
    var select = node('select', {
      id: 'askVillage', class: 'ask-select', 'data-i18n-aria': 'ask.villageLabel'
    });
    VILLAGES.forEach(function (v) {
      select.appendChild(node('option', { value: v.name, text: v.name }));
    });
    select.value = draft.village;
    var coord = node('p', { class: 'ask-coord' });
    function syncCoord() {
      coord.textContent = draft.lat.toFixed(4) + ', ' + draft.lng.toFixed(4);
    }
    select.addEventListener('change', function () {
      var found = VILLAGES.filter(function (v) { return v.name === select.value; })[0];
      if (found) { draft.village = found.name; draft.lat = found.lat; draft.lng = found.lng; syncCoord(); }
    });
    placeField.appendChild(select);

    var mini = node('div', { class: 'ask-mini-map', id: 'askMiniMap' });
    mini.appendChild(node('div', { class: 'ask-mini-map__privacy', 'aria-hidden': 'true' }));
    mini.appendChild(node('div', { class: 'ask-mini-map__pin', 'aria-hidden': 'true' }))
      .innerHTML = '<i class="fa-solid fa-location-pin" aria-hidden="true"></i>❓';
    mini.appendChild(node('p', { class: 'ask-coord', 'data-i18n': 'ask.mapHint' }));
    placeField.appendChild(mini);

    var dragging = false, sx = 0, sy = 0, sLat = 0, sLng = 0;
    mini.addEventListener('pointerdown', function (event) {
      dragging = true;
      mini.classList.add('is-dragging');
      sx = event.clientX; sy = event.clientY;
      sLat = draft.lat; sLng = draft.lng;
      try { mini.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    });
    mini.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      draft.lng = sLng + (event.clientX - sx) * 0.00018;
      draft.lat = sLat - (event.clientY - sy) * 0.00018;
      syncCoord();
    });
    function endDrag() { dragging = false; mini.classList.remove('is-dragging'); }
    mini.addEventListener('pointerup', endDrag);
    mini.addEventListener('pointercancel', endDrag);

    coord.textContent = draft.lat.toFixed(4) + ', ' + draft.lng.toFixed(4);
    placeField.appendChild(coord);
    bodyEl.appendChild(placeField);

    /* 4. 年代 */
    var eraField = node('div', { class: 'ask-field' });
    eraField.appendChild(node('p', { class: 'ask-label', 'data-i18n': 'ask.decadeLabel' }));
    var eraRow = node('div', { class: 'ask-decades', role: 'group', 'data-i18n-aria': 'ask.decadeLabel' });
    DECADES.forEach(function (key, index) {
      var chip = node('button', {
        type: 'button', class: 'ask-chip', 'data-i18n': key,
        'aria-pressed': key === draft.decade ? 'true' : 'false'
      });
      chip.addEventListener('click', function () {
        draft.decade = key;
        Array.prototype.forEach.call(eraRow.children, function (child, i) {
          child.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
      });
      eraRow.appendChild(chip);
    });
    eraField.appendChild(eraRow);
    bodyEl.appendChild(eraField);

    /* 5. 提交 */
    var submit = node('button', {
      type: 'button', class: 'ask-submit', id: 'askSubmit', 'data-i18n': 'ask.submit'
    });
    submit.addEventListener('click', submitQuestion);
    bodyEl.appendChild(submit);
    bodyEl.appendChild(node('p', { class: 'ask-tbd', 'data-i18n': 'ask.tbd' }));

    VTN.i18n.apply(bodyEl);
  }

  function submitQuestion() {
    if (!draft) return;
    var text = String(draft.text || '').trim().slice(0, 60);
    if (!text) {
      var field = byId('askQuestion');
      if (field) { field.focus(); field.classList.add('is-invalid'); }
      return;
    }
    var list = loadQuestions();
    var question = {
      id: 'Q-' + Date.now().toString(36).toUpperCase(),
      questionText: text,
      village: draft.village,
      decade: draft.decade,
      askerRole: draft.role,
      lat: Number(draft.lat.toFixed(4)),
      lng: Number(draft.lng.toFixed(4)),
      privacyRadiusMeters: 800,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
      answers: []
    };
    list.unshift(question);
    saveQuestions(list);
    closeSheet();
    if (VTN.ui && VTN.ui.toast) VTN.ui.toast(t('ask.saved'), 'success');
    VTN.router.go('stories', {});
    /* 地圖首次初始化需時；延遲並重試聚焦，確保 panTo 到新提問圖標後不會被 fitAll 覆蓋 */
    var focusAttempts = 0;
    function focusNewPin() {
      focusAttempts++;
      VTN.map.ensureVisible();
      syncQuestionPins();
      VTN.map.flyToLngLat(question.lng, question.lat, 13.5);
      var zoom = (VTN.map.debug() || {}).zoom;
      if ((zoom === undefined || zoom < 12) && focusAttempts < 6) {
        setTimeout(focusNewPin, 380);
      }
    }
    setTimeout(focusNewPin, 520);
  }

  /* ---- 模組 3：提問圖標（獨立圖層）--------------------------------------- */
  function matchesEra(question) {
    var all = byId('atlasEraAll');
    var range = byId('atlasEra');
    if (all && all.getAttribute('aria-pressed') === 'true') return true;
    if (question.decade === 'ask.decUnknown') return true;
    var index = range ? Number(range.value) : 0;
    var stopped = [1950, 1960, 1970, 1980, 1990];
    if (question.decade === 'ask.dec1990') return index === 4;
    var year = Number((question.decade || '').replace('ask.dec', ''));
    return isFinite(year) ? stopped[index] === year : true;
  }

  function questionPin(question) {
    var btn = node('button', {
      type: 'button', class: 'vtn-qpin',
      'data-question': question.id,
      'aria-label': t('ask.pinBadge') + '：' + question.questionText
    });
    var prefix = node('span', { class: 'vtn-qpin__label' });
    prefix.textContent = '❓ ' + t('ask.pinPrefix') +
      question.questionText.slice(0, 10) + '…';
    btn.appendChild(prefix);
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      openQuestion(question.id);
    });
    return btn;
  }

  function applyQuestionVisibility() {
    var map = VTN.map.raw && VTN.map.raw();
    if (!map) return;
    var zoom = map.getZoom && map.getZoom();
    var show = !(zoom !== undefined && zoom < 9.4);
    Object.keys(questionMarkers).forEach(function (id) {
      var el = questionMarkers[id].getElement();
      el.style.display = show ? '' : 'none';
      el.style.pointerEvents = show ? '' : 'none';
    });
  }

  function syncQuestionPins() {
    var map = VTN.map.raw && VTN.map.raw();
    if (!map) return;
    var list = loadQuestions().filter(matchesEra);
    var alive = {};
    list.forEach(function (question) {
      alive[question.id] = true;
      var marker = questionMarkers[question.id];
      if (!marker) {
        marker = new window.maplibregl.Marker({
          element: questionPin(question), anchor: 'bottom'
        }).setLngLat([question.lng, question.lat]).addTo(map);
        /* MapLibre 會把 element 的 aria-label 改成 "Map marker"，這裡重新寫回 */
        marker.getElement().setAttribute('aria-label',
          t('ask.pinBadge') + '：' + question.questionText);
        questionMarkers[question.id] = marker;
      } else {
        marker.setLngLat([question.lng, question.lat]);
      }
    });
    Object.keys(questionMarkers).forEach(function (id) {
      if (!alive[id]) {
        try { questionMarkers[id].remove(); } catch (e) { /* ignore */ }
        delete questionMarkers[id];
      }
    });
    if (!pinZoomBound) {
      map.on('zoom', applyQuestionVisibility);
      pinZoomBound = true;
    }
    applyQuestionVisibility();
  }

  /* ---- 模組 4：詳情卡 + 錄音上下文 --------------------------------------- */
  function ensureCard() {
    if (card) return;
    card = node('div', { class: 'ask-card', id: 'askQuestionCard', role: 'dialog' });
    var closeBtn = node('button', {
      type: 'button', class: 'ask-card__close', 'data-i18n-aria': 'ask.cancel'
    });
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    closeBtn.addEventListener('click', function () { card.classList.remove('is-open'); });
    var badge = node('p', { class: 'ask-card__badge' });
    badge.id = 'askCardBadge';
    var text = node('p', { class: 'ask-card__text' });
    text.id = 'askCardText';
    var answer = node('button', {
      type: 'button', class: 'ask-card__answer', id: 'askCardAnswer'
    });
    answer.addEventListener('click', answerQuestion);
    card.appendChild(closeBtn);
    card.appendChild(badge);
    card.appendChild(text);
    card.appendChild(answer);
    (byId('appShell') || document.body).appendChild(card);
    VTN.i18n.apply(card);
  }

  function openQuestion(id) {
    var question = loadQuestions().filter(function (q) { return q.id === id; })[0];
    if (!question) return;
    ensureCard();
    openQuestionId = id;
    byId('askCardBadge').textContent = t('ask.previewBadge', {
      village: question.village,
      decade: t(question.decade),
      role: t(question.askerRole)
    });
    byId('askCardText').textContent = '「' + question.questionText + '」';
    byId('askCardAnswer').textContent = t('ask.previewAnswer');
    card.classList.add('is-open');
  }

  function answerQuestion() {
    if (!openQuestionId) return;
    var question = loadQuestions().filter(function (q) { return q.id === openQuestionId; })[0];
    if (!question) return;
    activeContext = {
      questionId: question.id,
      questionText: question.questionText,
      village: question.village,
      decade: t(question.decade),
      lat: question.lat,
      lng: question.lng
    };
    saveContext(activeContext);
    if (card) card.classList.remove('is-open');
    VTN.router.go('recording', {});
    setTimeout(applyContextToRecorder, 120);
  }

  function ensureBanner() {
    if (banner) return;
    banner = node('div', { class: 'vtn-ask-banner', id: 'askAnswerBanner' });
    banner.hidden = true;
    var text = node('span', { class: 'vtn-ask-banner__text' });
    text.id = 'askBannerText';
    var unbind = node('button', {
      type: 'button', class: 'vtn-ask-banner__unbind', id: 'askBannerUnbind'
    });
    unbind.addEventListener('click', unbindQuestion);
    banner.appendChild(text);
    banner.appendChild(unbind);
    /* 放進錄音浮層 head 之後：浮層打開時橫幅仍可見可點（頁面級會被浮層遮住）。
       若浮層尚未建立，先放頁面 hero 後，applyContextToRecorder 會再搬進浮層。 */
    var sheetHead = document.querySelector('.vtn-rec-sheet__head');
    if (sheetHead && sheetHead.parentNode) {
      sheetHead.parentNode.insertBefore(banner, sheetHead.nextSibling);
    } else {
      var recording = document.querySelector('[data-view="recording"]');
      if (recording) {
        var hero = recording.querySelector('.hero');
        recording.insertBefore(banner, hero ? hero.nextSibling : recording.firstChild);
      }
    }
  }

  function unbindQuestion() {
    activeContext = null;
    saveContext(null);
    if (banner) banner.hidden = true;
    if (prevOnChange) {
      var select = document.querySelector('.vtn-rec-sheet select');
      if (select) {
        if (select._askOption) {
          try { select.removeChild(select._askOption); } catch (e) { /* ignore */ }
          select._askOption = null;
        }
        select.onchange = prevOnChange;
        select.value = '';
        prevOnChange();
      }
      prevOnChange = null;
    }
  }

  function applyContextToRecorder() {
    var ctx = activeContext || loadContext();
    if (!ctx) return;
    activeContext = ctx;
    ensureBanner();
    byId('askBannerText').textContent = t('ask.banner', {
      question: ctx.questionText, village: ctx.village, decade: ctx.decade
    });
    byId('askBannerUnbind').textContent = t('ask.unbind');
    banner.hidden = false;

    VTN.recorder.open();
    setTimeout(function () {
      var sheetHead = document.querySelector('.vtn-rec-sheet__head');
      if (sheetHead && sheetHead.parentNode && banner.parentNode !== sheetHead.parentNode) {
        sheetHead.parentNode.insertBefore(banner, sheetHead.nextSibling);
      }
      var select = document.querySelector('.vtn-rec-sheet select');
      if (!select) return;
      if (select._askBoundQuestionId === ctx.questionId && select.value === '__ask__') return;

      if (!prevOnChange && select.onchange) prevOnChange = select.onchange;
      if (select._askOption) {
        try { select.removeChild(select._askOption); } catch (e) { /* ignore */ }
      }
      var option = node('option', {
        value: '__ask__',
        text: t('ask.recOption', { question: ctx.questionText.slice(0, 22) })
      });
      select.insertBefore(option, select.firstChild);
      select._askOption = option;
      select._askBoundQuestionId = ctx.questionId;

      select.onchange = function () {
        if (select.value === '__ask__') {
          if (prevOnChange) {
            var restore = select.value;
            select.value = '';
            prevOnChange();
            select.value = restore;
          }
          var note = select.parentNode && select.parentNode.querySelector('.vtn-rec-note span');
          if (note) note.textContent = ctx.questionText + '（' + ctx.village + ' · ' + ctx.decade + '）';
        } else if (prevOnChange) {
          prevOnChange();
        }
      };
      select.value = '__ask__';
      select.onchange();
    }, 160);
  }

  /* ---- 事件綁定（追加，不改寫既有函式）----------------------------------- */
  /* 地圖為懶初始化：輪詢直到 map 實例存在，確保提問 pin 首次進入即出現 */
  function ensurePinsOnStories(attempt) {
    attempt = attempt || 0;
    if (VTN.map.raw && VTN.map.raw()) {
      syncQuestionPins();
      return;
    }
    if (attempt < 20) setTimeout(function () { ensurePinsOnStories(attempt + 1); }, 180);
  }

  function bindEvents() {
    window.addEventListener('hashchange', function () { setTimeout(function () { ensurePinsOnStories(0); }, 60); });
    var all = byId('atlasEraAll');
    var range = byId('atlasEra');
    if (all) all.addEventListener('click', function () { setTimeout(syncQuestionPins, 40); });
    if (range) {
      range.addEventListener('input', function () { setTimeout(syncQuestionPins, 40); });
      range.addEventListener('change', function () { setTimeout(syncQuestionPins, 40); });
    }
    window.addEventListener('vtn:stories-mode', syncQuestionPins);
    U.on('vtn:lang-changed', function () {
      if (layer && layer.classList.contains('is-open')) {
        renderForm();
        VTN.i18n.apply(layer);
      }
      if (card && card.classList.contains('is-open') && openQuestionId) openQuestion(openQuestionId);
      if (activeContext && banner && !banner.hidden) applyContextToRecorder();
      syncQuestionPins();
    });
  }

  function init() {
    bindEvents();
    injectEntries();
    ensureBanner();
    syncQuestionPins();
    ensurePinsOnStories(0);
    if (loadContext()) setTimeout(applyContextToRecorder, 260);
  }

  VTN.askStory = {
    init: init,
    open: openSheet,
    close: closeSheet,
    list: loadQuestions,
    syncPins: syncQuestionPins,
    answer: answerQuestion,
    unbind: unbindQuestion
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
