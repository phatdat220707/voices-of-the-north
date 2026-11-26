/* Execute the combined source's i18n/assistant modules and badge functions.
 * Node DOM doubles verify behavior; they do not establish browser layout,
 * hit-testing, screen-reader output, or real media playback.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
let checks = 0;
function check(label, condition) {
  assert.ok(condition, label);
  checks += 1;
  console.log('PASS ' + label);
}
const nodes = [];
class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag; this.attrs = {}; this.children = [];
    this.hidden = false; this.className = ''; this.innerHTML = '';
    this.textContent = ''; this.style = { setProperty() {} };
    this.classList = { contains: name => this.className.split(/\s+/).includes(name) };
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'text') this.textContent = value;
      else this.setAttribute(key, value);
    }
    nodes.push(this);
  }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (key === 'class') this.className = String(value);
    if (key === 'id') this.id = String(value);
  }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key); }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  addEventListener() {}
  querySelector(selector) {
    const name = selector.startsWith('.') ? selector.slice(1) : null;
    for (const child of this.children) {
      if (name ? child.classList.contains(name) : child.tagName === selector) return child;
      const found = child.querySelector(selector); if (found) return found;
    }
    return null;
  }
}
const shell = new Element('div', { id: 'appShell' });
const filter = new Element('button', { id: 'filterToggle' });
const template = fs.readFileSync(path.join(ROOT, 'frontend/src/html/app.template.html'), 'utf8');
const filterTag = template.match(/<button[^>]*id="filterToggle"[^>]*>/)[0];
filter.setAttribute('data-i18n-aria', filterTag.match(/data-i18n-aria="([^"]+)"/)[1]);
const document = {
  body: shell, documentElement: new Element('html'), title: '',
  getElementById: id => nodes.find(node => node.id === id) || null,
  addEventListener() {},
  querySelectorAll: selector => {
    const match = selector.match(/^\[([^\]]+)\]$/);
    return match ? nodes.filter(node => node.hasAttribute(match[1])) : [];
  }
};
const listeners = {};
const VTN = {
  KEYS: { hint: 'synthetic-test-hint' },
  store: { getPref: () => 'zh-HK' },
  api: { aiState: () => ({ state: 'offline', reason: 'unchecked' }) },
  util: {
    fmtTime: value => String(value),
    node: (tag, attrs, children) => {
      const node = new Element(tag, attrs);
      (children || []).forEach(child => node.appendChild(child)); return node;
    },
    escapeHtml: value => String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]),
    on: (name, callback) => { (listeners[name] ||= []).push(callback); },
    emit: (name, detail) => { (listeners[name] || []).forEach(fn => fn({ detail })); }
  }
};
const window = { VTN, console, addEventListener() {}, localStorage: { getItem: () => null } };
const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
function source(file) { return fs.readFileSync(path.join(ROOT, 'frontend/src/js', file), 'utf8'); }
vm.runInContext(source('05-i18n.js'), context, { filename: '05-i18n.js' });
vm.runInContext(source('50-assistant.js'), context, { filename: '50-assistant.js' });
VTN.assistant.mount();
// Run these private functions verbatim in a narrow test scope. Their algorithms
// are not reimplemented here, and the production module/export surface is intact.
context.U = VTN.util;
context.t = (key, vars) => VTN.i18n.t(key, vars);
function loadFunction(file, name) {
  const text = source(file);
  const start = text.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, 'Function exists: ' + name);
  const end = text.indexOf('\n  }', start);
  return vm.runInContext('(' + text.slice(start, end + 4) + ')', context, { filename: file + ':' + name });
}
const storyBadge = loadFunction('30-stories.js', 'confidenceBadge');
const recordingBadge = loadFunction('40-recorder.js', 'recConfidenceBadge');
const mediaFooter = loadFunction('33-media.js', 'appendMediaFooter');
const expected = {
  'zh-HK': { filter: '篩選', fab: '開啟村落問答助手', unavailable: '無法取得', demo: '示範' },
  'zh-CN': { filter: '筛选', fab: '打开村落问答助手', unavailable: '无法获取', demo: '示例' },
  en: { filter: 'Filter', fab: 'Open the village Q&A assistant', unavailable: 'unavailable', demo: 'Demo' }
};
for (const [lang, text] of Object.entries(expected)) {
  VTN.i18n.setLang(lang);
  check(lang + ' filter name follows language', filter.getAttribute('aria-label') === text.filter);
  check(lang + ' mounted assistant name updates through language event',
    nodes.find(node => node.className === 'vtn-ai-fab').getAttribute('aria-label') === text.fab);
  check(lang + ' visible assistant hint updates',
    nodes.find(node => node.className === 'vtn-ai-hint').innerHTML.includes(VTN.util.escapeHtml(VTN.i18n.t('assistant.hint'))));
  const missing = storyBadge({ confidence: null });
  check(lang + ' absent story confidence is unavailable', missing.children[0].textContent === text.unavailable);
  check(lang + ' story confidence has visible demo label', missing.children[1].textContent === text.demo);
  check(lang + ' real recording confidence is unavailable without a demo tag',
    recordingBadge(null).textContent === text.unavailable && recordingBadge(null).children.length === 0);
  for (const [value, level] of [[0.8, 'high'], [0.5, 'mid'], [0.49, 'low']]) {
    check(lang + ' story/recording threshold ' + value + ' remains ' + level,
      storyBadge({ confidence: value }).children[0].getAttribute('data-i18n') === 'conf.' + level &&
      recordingBadge(value).getAttribute('data-i18n') === 'conf.' + level);
  }
  const box = new Element('div');
  mediaFooter(box, { id: 'SYNTHETIC', rolePlayed: true }, 'image');
  check(lang + ' mock media footer has visible demo label',
    box.children[0].className === 'vtn-demo-tag' && box.children[0].textContent === text.demo);
}
check('no missing translation keys', VTN.i18n.missing().length === 0);

async function integrationChecks() {
  // Exercise the actual empty-catalog update, not a copy of its condition.
  context.VTN = VTN;
  context.DATA = { stories: [{ id: 'STALE' }] };
  context.render = () => {};
  const refreshCatalog = loadFunction('30-stories.js', 'refreshFromServer');
  VTN.api.stories = async () => [];
  check('successful empty catalog removes previously loaded stories',
    await refreshCatalog() === true && context.DATA.stories.length === 0);
  VTN.api.stories = async () => [{ id: 'CURRENT' }];
  check('successful catalog replaces the corpus',
    await refreshCatalog() === true && context.DATA.stories[0].id === 'CURRENT');
  VTN.api.stories = async () => { throw new Error('synthetic network failure'); };
  check('failed catalog request preserves last successful corpus',
    await refreshCatalog() === false && context.DATA.stories[0].id === 'CURRENT');

  const lists = {};
  let role = 'admin'; let queueCalls = 0;
  const submitted = { id: 'OTHER-OWNER', owner: 'other@example.test', status: 'done',
    reviewStatus: 'submitted', scope: 'private', formalText: 'Synthetic transcript', words: [], qaList: [] };
  VTN.store.role = () => role;
  VTN.store.scopeOf = rec => rec.scope || 'private';
  VTN.store.records = { list: () => [], counts: () => ({ audioBytes: 0 }) };
  VTN.SCOPE_META = { private: { labelKey: 'scope.private' } };
  VTN.ui = { announce() {} };
  VTN.api.contributions = { list: async status => {
    queueCalls += 1;
    assert.equal(status, 'submitted'); return { records: [submitted] };
  } };
  context.reviewerQueue = []; context.reviewerQueueLoading = false;
  context.renderList = (id, empty, records) => { lists[id] = records; };
  context.renderAll = loadFunction('45-recordings.js', 'renderAll');
  const loadQueue = loadFunction('45-recordings.js', 'loadReviewerQueue');
  await loadQueue();
  check('admin loads submitted queue', queueCalls === 1);
  check('another owner reaches the actual Done rendering input',
    lists.recListDone.length === 1 && lists.recListDone[0].id === submitted.id);
  check('foreign submission is marked review-only', lists.recListDone[0]._reviewOnly === true);
  context.audioNode = () => null; // Synthetic review card has no audio source.
  const renderDoneBody = loadFunction('45-recordings.js', 'renderDoneBody');
  const start = nodes.length;
  renderDoneBody(submitted, new Element('div'), { reviewOnly: true });
  const actions = nodes.slice(start).filter(node => node.tagName === 'button').map(node => node.textContent);
  check('review-only card renders approve and reject actions',
    actions.includes(VTN.i18n.t('review.approve')) && actions.includes(VTN.i18n.t('review.reject')));
  check('review-only card omits owner scope, withdrawal and delete controls',
    !['story.scope', 'story.withdraw', 'rec.deleteRecord'].some(key => actions.includes(VTN.i18n.t(key))));
  role = 'member';
  await loadQueue(); context.renderAll();
  check('member session does not load the reviewer queue', queueCalls === 1);
  check('reviewer queue is cleared from member rendering', lists.recListDone.length === 0);
  console.log('ALL PASSED: ' + checks + ' frontend module checks (DOM doubles; no browser)');
}
integrationChecks().catch(error => { console.error(error); process.exitCode = 1; });
