/* =============================================================================
 * 33-media — 萬能媒體區塊（三級頁 Overlay）
 * -----------------------------------------------------------------------------
 * * 三級頁：全屏 Overlay，封裝 renderUniversalMedia（影片 / 圖片 / 音頻降級）
 * * 二級頁（半拉抽屜）有媒體時由 30-stories.js 顯示「查看多媒體故事」入口，點擊呼叫 open()
 * * 影像載入失敗時，有錄音才切換至音頻；關閉 Overlay 時暫停播放
 * ========================================================================== */

(function () {
  'use strict';

  var VTN = window.VTN;
  var U = VTN.util;
  var t = (VTN.i18n && VTN.i18n.t) ? VTN.i18n.t : function (k) { return k; };

  var overlayEl = null;
  var currentStory = null;

  function storyTitleSafe(story) {
    if (VTN.stories && VTN.stories.storyTitle) return VTN.stories.storyTitle(story);
    return (story && (story.title || story.id)) || '';
  }

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = U.node('div', {
      class: 'media-overlay', id: 'mediaOverlay', hidden: true,
      role: 'dialog', 'aria-modal': 'true'
    });
    overlayEl.setAttribute('aria-label', t('media.overlayAria'));

    var scrim = U.node('div', { class: 'media-overlay__scrim', 'data-close': '' });
    var panel = U.node('div', { class: 'media-overlay__panel' });

    var header = U.node('div', { class: 'media-overlay__header' });
    var closeBtn = U.node('button', {
      class: 'media-overlay__close', type: 'button', 'data-close': '', 'aria-label': t('media.close')
    });
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    var kicker = U.node('p', { class: 'media-overlay__kicker', text: t('media.overlayKicker') });
    var title = U.node('h2', { class: 'media-overlay__title' });
    header.appendChild(closeBtn);
    header.appendChild(kicker);
    header.appendChild(title);

    var mediaHost = U.node('div', { class: 'media-overlay__media', id: 'universalMedia' });
    var transcriptHost = U.node('div', { class: 'media-overlay__transcript' });

    panel.appendChild(header);
    panel.appendChild(mediaHost);
    panel.appendChild(transcriptHost);
    overlayEl.appendChild(scrim);
    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', function (event) {
      if (event.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlayEl && !overlayEl.hidden) close();
    });
    return overlayEl;
  }

  function pauseAll() {
    var v = document.getElementById('storyVideo');
    if (v && !v.paused) { try { v.pause(); } catch (e) { /* ignore */ } }
    if (VTN.audio && VTN.audio.pauseStory) VTN.audio.pauseStory();
  }

  function close() {
    if (!overlayEl || overlayEl.hidden) return;
    pauseAll();
    overlayEl.hidden = true;
    document.body.classList.remove('media-overlay-open');
    var m = overlayEl.querySelector('.media-overlay__media');
    var tr = overlayEl.querySelector('.media-overlay__transcript');
    if (m) m.textContent = '';
    if (tr) tr.textContent = '';
    currentStory = null;
  }

  function open(story, playAt) {
    if (!story || !VTN.stories || !VTN.stories.resolveMedia) return;
    var media = VTN.stories.resolveMedia(story);
    if (media.type === 'none') return;
    ensureOverlay();
    currentStory = story;

    var mediaHost = overlayEl.querySelector('.media-overlay__media');
    var transcriptHost = overlayEl.querySelector('.media-overlay__transcript');
    mediaHost.textContent = '';
    transcriptHost.textContent = '';
    overlayEl.querySelector('.media-overlay__title').textContent = storyTitleSafe(story);

    var audioSeek = story.audio ? function (sec) { VTN.audio.playStory(story.id, sec); } : null;
    var seek = audioSeek;
    function renderTranscript() {
      if (!VTN.stories.buildTranscript) return;
      transcriptHost.textContent = '';
      transcriptHost.appendChild(VTN.stories.buildTranscript(story, seek && function (sec) { seek(sec); }));
    }

    if (media.type === 'audio') {
      renderAudioFallback(story, mediaHost, false);
    } else {
      var videoSeek = renderRichMedia(story, media, mediaHost, function () {
        seek = audioSeek;
        renderAudioFallback(story, mediaHost, true);
        if (!seek) renderTranscript();
      });
      if (videoSeek) seek = videoSeek;
    }
    renderTranscript();

    overlayEl.hidden = false;
    document.body.classList.add('media-overlay-open');

    if (playAt !== undefined && playAt !== null) {
      setTimeout(function () {
        if (currentStory === story && seek) seek(Number(playAt) || 0);
      }, 80);
    }
  }

  function appendMediaFooter(box, story, type) {
    var isImage = type === 'image';
    var hintKey = isImage ? 'atlas.storyImageHint' : 'atlas.storyVideoHint';
    if (story.rolePlayed) {
      box.appendChild(U.node('span', { class: 'vtn-demo-tag', text: t('badge.demo') }));
      hintKey = isImage ? 'atlas.imageHint' : 'atlas.videoHint';
    }
    var hint = U.node('p', { class: 'universal-media__hint' });
    hint.innerHTML = '<i class="fa-solid ' + (isImage ? 'fa-image' : 'fa-video') +
      '" aria-hidden="true"></i><span>' +
      U.escapeHtml(t(hintKey)) + '</span>';
    box.appendChild(hint);

    if (story.rolePlayed) {
      box.appendChild(U.node('p', { class: 'universal-media__disclosure', text: t('atlas.mediaDisclosure') }));
    }

    var btn3d = U.node('button', { class: 'universal-media__3d vtn-btn vtn-btn--sm', type: 'button' });
    btn3d.innerHTML = '<i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><span>' +
      U.escapeHtml(t('atlas.video3d')) + '</span>';
    btn3d.addEventListener('click', function () {
      if (VTN.sheet) VTN.sheet.close('media-3d');
      if (VTN.map) {
        if (VTN.map.set3D) VTN.map.set3D(true);
        if (VTN.map.focusStory) VTN.map.focusStory(story.id);
      }
    });
    box.appendChild(btn3d);
  }

  function renderRichMedia(story, media, host, onError) {
    host.textContent = '';
    var box = U.node('div', { class: 'universal-media' });
    var frame = U.node('div', { class: 'universal-media__frame' });
    var mediaEl;
    var seek = null;

    if (media.type === 'video') {
      var video = U.node('video', {
        id: 'storyVideo', class: 'universal-media__video',
        controls: true, playsinline: true, preload: 'metadata',
        src: media.url, 'aria-label': t('atlas.videoAria')
      });
      mediaEl = video;
      seek = function (sec) {
        if (video.error) { VTN.ui.toast(t('atlas.videoError'), 'error'); return; }
        if (VTN.audio && VTN.audio.pauseStory) VTN.audio.pauseStory();
        var dur = video.duration;
        if (!(typeof dur === 'number' && isFinite(dur))) dur = story.durationSec || 0;
        var s = Math.max(0, Math.min(dur, Number(sec) || 0));
        function start() {
          try { video.currentTime = s; } catch (e) { /* ignore */ }
          var p = video.play();
          if (p && p.catch) p.catch(function () {
            VTN.ui.toast(t('atlas.videoSeekHint', { t: U.fmtTime(s) }), 'info');
          });
        }
        if (video.readyState >= 1) start();
        else video.addEventListener('loadedmetadata', start, { once: true });
      };
    } else {
      mediaEl = U.node('img', {
        class: 'universal-media__img', src: media.url,
        alt: t(story.rolePlayed ? 'atlas.imageAlt' : 'atlas.storyImageAlt', { title: storyTitleSafe(story) }),
        loading: 'lazy'
      });
    }

    mediaEl.addEventListener('error', function () {
      if (host.contains(mediaEl)) onError();
    });
    frame.appendChild(mediaEl);
    box.appendChild(frame);
    appendMediaFooter(box, story, media.type);
    host.appendChild(box);
    return seek;
  }

  function renderAudioFallback(story, host, failed) {
    host.textContent = '';
    var message = failed ? (story.audio ? 'media.fallback' : 'media.transcriptFallback') : 'media.noMedia';
    var box = U.node('div', { class: 'universal-media universal-media--audio' });
    var fallback = U.node('div', { class: 'universal-media__fallback' });
    fallback.appendChild(U.node('span', {
      class: 'universal-media__fallbackIcon', html: '<i class="fa-solid fa-photo-film" aria-hidden="true"></i>'
    }));
    fallback.appendChild(U.node('p', {
      class: 'universal-media__fallbackText',
      text: t(message)
    }));
    box.appendChild(fallback);

    if (story.audio) box.appendChild(VTN.stories.audioPlayerNode(story));
    host.appendChild(box);

    if (failed && VTN.ui && VTN.ui.toast) VTN.ui.toast(t(message), 'info');
  }

  VTN.media = {
    open: open,
    close: close,
    pauseAll: pauseAll,
    isOpen: function () { return !!overlayEl && !overlayEl.hidden; }
  };
})();
