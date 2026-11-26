/* Place search is independent of the story filter and uses public village centers. */
(function () {
  'use strict';

  var VTN = window.VTN;
  var U = VTN.util;
  var villages = [
    { key: 'fanling', center: [114.1435, 22.4965], names: ['粉嶺', '粉岭', 'fanling', 'fan ling'] },
    { key: 'sheung-shui', center: [114.1285, 22.5025], names: ['上水', 'sheung shui', 'sheungshui'] },
    { key: 'kuk-po', center: [114.2400, 22.5300], names: ['谷埔', 'kuk po', 'kukpo'] }
  ];

  function t(key) { return VTN.i18n.t(key); }

  function open(focusPlace, canGeocode) {
    var form = U.node('form', { class: 'atlas-place-form' });
    var input = U.node('input', {
      type: 'search', required: 'required', maxlength: '120', autocomplete: 'off',
      'data-autofocus': '', 'data-i18n-aria': 'atlas.locate', 'data-i18n-ph': 'atlas.locateExample'
    });
    var submit = U.node('button', {
      type: 'submit', class: 'vtn-btn vtn-btn--solid', 'data-i18n': 'atlas.locateSearch'
    });
    var status = U.node('p', { class: 'vtn-modal__note', role: 'status' });
    var results = U.node('div', { class: 'atlas-place-results' });
    form.appendChild(input);
    form.appendChild(submit);
    form.appendChild(status);
    form.appendChild(results);
    var closed = false;
    var dialog = VTN.ui.dialog({
      titleKey: 'atlas.locate', body: form,
      onClose: function () { closed = true; }
    });
    VTN.i18n.apply(form);

    function report(key) {
      status.hidden = !key;
      status.textContent = key ? t(key) : '';
      if (key) status.setAttribute('data-i18n', key);
      else status.removeAttribute('data-i18n');
    }

    function show(places) {
      results.replaceChildren();
      places.forEach(function (place) {
        var label = place.key ? VTN.stories.villageLabel(place.key) : place.label;
        var button = U.node('button', {
          class: 'vtn-btn vtn-btn--quiet', type: 'button', text: label
        });
        button.addEventListener('click', function () {
          if (focusPlace(place.center)) dialog.close('place');
          else report('atlas.locateMapUnavailable');
        });
        results.appendChild(button);
      });
    }

    report('');
    show(villages);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var query = input.value.trim();
      if (!query || submit.disabled) return;
      var name = query.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
      var village = villages.find(function (place) { return place.names.indexOf(name) !== -1; });
      if (!canGeocode()) {
        show(village ? [village] : villages);
        report(village ? '' : 'atlas.locateOffline');
        return;
      }
      submit.disabled = true;
      show([]);
      report('atlas.locateLoading');
      VTN.api.request('/api/map/geocode', {
        method: 'POST', timeout: 7500,
        body: { query: query, language: VTN.i18n.lang() === 'en' ? 'en' : 'zh' }
      }).then(function (data) {
        if (closed) return;
        var places = Array.isArray(data && data.places) ? data.places : [];
        if (village) {
          places = places.filter(function (place) {
            return Math.abs(place.center[0] - village.center[0]) < 0.025 &&
              Math.abs(place.center[1] - village.center[1]) < 0.025;
          });
        }
        show(places.length ? places : village ? [village] : []);
        report(places.length || village ? '' : 'atlas.locateNoResults');
      }).catch(function () {
        if (closed) return;
        show(village ? [village] : villages);
        report(village ? '' : 'atlas.locateOffline');
      }).finally(function () { submit.disabled = false; });
    });
  }

  VTN.mapSearch = {
    init: function (button, focusPlace, canGeocode) {
      if (button) button.addEventListener('click', function () { open(focusPlace, canGeocode); });
    }
  };
})();
