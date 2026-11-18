/* Run the actual store, API and account modules with controlled fetch replies.
 * DOM doubles exercise the real withdrawal-button callbacks without claiming
 * browser layout or backend authorization acceptance.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = path.resolve(__dirname, '../../frontend/src/js');
const WITHDRAWN_AT = '2026-11-17T04:00:00+08:00';
let checks = 0;
function check(label, condition) {
  assert.ok(condition, label);
  checks += 1;
  console.log('PASS ' + label);
}
function source(name) { return fs.readFileSync(path.join(SOURCE, name), 'utf8'); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag;
    this.children = [];
    this.listeners = {};
    this.attrs = attrs;
    this.textContent = attrs.text || '';
    this.style = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  appendChild(node) { this.children.push(node); return node; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelector() { return null; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  click() { return this.listeners.click?.(); }
}
function descendants(element) {
  return [element, ...element.children.flatMap(descendants)];
}

function harness(options = {}) {
  const local = new Map();
  const events = [], requests = [], toasts = [], patches = [];
  const response = deferred();
  let nextId = 0;
  const renders = { recordings: 0, stories: 0, catalogue: 0, assistant: 0, route: 0 };
  const util = {
    parseJSON: (text, fallback) => {
      try { return JSON.parse(text) ?? fallback; } catch { return fallback; }
    },
    dataUrlBytes: () => 0,
    uid: prefix => prefix + (++nextId),
    emit: (name, detail) => events.push({ name, detail }),
    fmtTime: String,
    fmtDate: String,
    escapeHtml: String,
    node: (tag, attrs, children) => {
      const element = new Element(tag, attrs);
      (children || []).forEach(child => element.appendChild(child));
      return element;
    }
  };
  const keys = ['prefs', 'session', 'records', 'deleted', 'withdrawn', 'consent',
    'audit', 'chat', 'storyPatches', 'scopes', 'corrections', 'migration'];
  const scopes = ['private', 'family', 'community', 'public'];
  const VTN = {
    KEYS: Object.fromEntries(keys.map(key => [key, key])),
    SCOPES: scopes,
    ROLES: ['visitor', 'member', 'admin'],
    SCOPE_META: Object.fromEntries(scopes.map(key => [key, { labelKey: 'scope.' + key }])),
    config: { storageLimitChars: 3800000, consentPolicyVersion: 'SYNTHETIC',
      apiBase: 'http://synthetic.invalid' },
    util,
    i18n: { t: (key, vars) => key === 'scope.label' ? key + ':' + vars.scope : key },
    ui: {
      confirm: () => Promise.resolve(options.confirm !== false),
      toast: (text, kind) => toasts.push({ text, kind })
    }
  };
  const context = vm.createContext({
    window: {
      VTN,
      localStorage: {
        getItem: key => local.get(key) ?? null,
        setItem: (key, value) => local.set(key, value),
        removeItem: key => local.delete(key)
      }
    },
    document: {}, Blob, FormData, setTimeout, clearTimeout, console,
    fetch: (url, init) => {
      requests.push({ url, method: init.method, headers: clone(init.headers), body: init.body });
      return response.promise;
    }
  });
  for (const file of ['10-store.js', '15-api.js', '65-account.js']) {
    vm.runInContext(source(file), context, { filename: file });
  }
  VTN.store.setSession({ email: 'owner@example.test', role: 'member',
    token: 'synthetic-signed-token' });
  const input = {
    id: 'REC-WITHDRAWAL', owner: 'owner@example.test', status: 'done',
    scope: 'public', reviewStatus: 'approved', sync: 'synced', source: 'live',
    formalText: 'Synthetic approved transcript', words: [], qaList: []
  };
  if (Object.hasOwn(options, 'segments')) input.segments = options.segments;
  const record = options.noRecord ? input : VTN.store.records.save(input).record;
  const patch = VTN.store.records.patch;
  VTN.store.records.patch = (...args) => {
    patches.push(clone(args));
    return patch(...args);
  };
  VTN.recordings = { renderAll: () => { renders.recordings += 1; } };
  VTN.stories = {
    render: () => { renders.stories += 1; },
    refreshFromServer: () => { renders.catalogue += 1; return Promise.resolve(true); }
  };
  VTN.assistant = { refresh: () => { renders.assistant += 1; } };
  VTN.router = {
    current: () => ({ view: 'stories' }),
    go: () => { renders.route += 1; }
  };
  function reply(status, body = { ok: true, withdrawnAt: WITHDRAWN_AT }) {
    response.resolve({
      ok: status >= 200 && status < 300, status,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(body)
    });
  }
  return { VTN, context, record, local, events, requests, toasts, patches,
    renders, reply, reject: response.reject };
}

function canonical(h, recordId) {
  const record = h.VTN.store.records.get(recordId);
  return record && record.scope === 'private' && record.reviewStatus === 'withdrawn'
    && record.sync === 'synced' && record.withdrawnAt === WITHDRAWN_AT;
}

function keepOverride(h, item) {
  h.VTN.store.setScope(item, 'public');
  return h.VTN.store.scopeExceptions([item]).length === 1;
}

// Execute private rendering functions verbatim to check their actual event
// callbacks. Only surrounding DOM/media helpers are doubled.
function loadFunction(context, file, name) {
  const text = source(file);
  const start = text.indexOf('  function ' + name + '(');
  const end = text.indexOf('\n  }', start);
  assert.ok(start >= 0 && end > start, 'Function exists: ' + name);
  return vm.runInContext('(' + text.slice(start, end + 4) + ')', context,
    { filename: file + ':' + name });
}

function renderedScopeBadge(h) {
  Object.assign(h.context, {
    VTN: h.VTN, U: h.VTN.util, t: h.VTN.i18n.t, audioNode: () => null,
    openSubmission() {}, reviewSubmission() {}, exportRecord() {}, removeRecord() {}
  });
  const renderRecording = loadFunction(h.context, '45-recordings.js', 'renderDoneBody');
  const card = new Element('div');
  renderRecording(h.VTN.store.records.get(h.record.id), card, {});
  const badge = descendants(card).find(node =>
    String(node.textContent).startsWith('scope.label:'));
  return badge && badge.textContent;
}

async function main() {
  for (const [name, options] of [
    ['missing segments', {}], ['empty segments', { segments: [] }],
    ['nonempty segments', { segments: [{ start: 0, end: 1, text: 'Synthetic' }] }]
  ]) {
    const h = harness(options);
    const task = h.VTN.account.openWithdraw(h.record, { kind: 'record' });
    await flush();
    h.reply(200);
    check(name + ' recording accepts server withdrawal', await task === true);
    check(name + ' recording receives canonical local state', canonical(h, h.record.id));
    check(name + ' recording patches with suppressSync', h.patches.length === 1
      && h.patches[0][2].suppressSync === true);
    check(name + ' recording is persisted as withdrawn',
      JSON.parse(h.local.get('records'))[0].reviewStatus === 'withdrawn'
      && h.VTN.store.withdrawn.is(h.record.id));
  }
  {
    const h = harness();
    // Deliberately distinct IDs catch a blind patch of the story's ID.
    const story = { id: 'PUBLISHED-PROJECTION', sourceRecordId: h.record.id, segments: [] };
    const task = h.VTN.account.openWithdraw(story, { kind: 'story' });
    await flush(); h.reply(200);
    check('published projection accepts withdrawal', await task === true);
    check('published projection updates its existing source record', canonical(h, h.record.id)
      && h.patches[0][0] === story.sourceRecordId);
    check('published projection does not change API story-route identity',
      h.requests[0].url.endsWith('/api/stories/PUBLISHED-PROJECTION/withdraw'));
    check('published projection is locally hidden', h.VTN.store.withdrawn.is(story.id));
  }
  {
    const h = harness({ noRecord: true });
    const story = { id: 'PUBLISHED-NO-COPY', sourceRecordId: 'UNLOADED-RECORD', segments: [] };
    const task = h.VTN.account.openWithdraw(story, { kind: 'story' });
    await flush(); h.reply(200);
    check('published projection without local copy still succeeds', await task === true);
    check('published projection does not create a synthetic local record',
      h.patches.length === 0 && h.VTN.store.records.all().length === 0);
  }
  {
    const h = harness({ segments: [{ start: 0, end: 1, text: 'Synthetic' }] });
    check('recording override starts public', keepOverride(h, h.record));
    const task = h.VTN.account.openWithdraw(h.record, { kind: 'record' });
    await flush();
    h.reply(200);
    check('recording withdrawal succeeds with saved override', await task === true);
    check('recording withdrawal clears only the canonical record override',
      h.VTN.store.scopeExceptions([h.record]).length === 0
      && h.VTN.store.scopeOf(h.VTN.store.records.get(h.record.id)) === 'private');
    check('recording withdrawal persists the cleared override',
      JSON.parse(h.local.get('scopes'))[h.record.id] === undefined);
    check('recording badge renders canonical private scope',
      renderedScopeBadge(h) === 'scope.label:scope.private', renderedScopeBadge(h));
  }
  {
    const h = harness();
    const story = {
      id: 'PUBLISHED-OVERRIDE', sourceRecordId: h.record.id,
      owner: 'owner@example.test', scope: 'public', segments: []
    };
    check('story and source record overrides start public',
      keepOverride(h, h.record) && keepOverride(h, story));
    const untouched = { id: 'UNTOUCHED-RECORD', scope: 'public' };
    keepOverride(h, untouched);
    const task = h.VTN.account.openWithdraw(story, { kind: 'story' });
    await flush();
    h.reply(200);
    check('story withdrawal succeeds with saved overrides', await task === true);
    check('story withdrawal clears its projection and source-record overrides',
      h.VTN.store.scopeExceptions([story, h.record]).length === 0
      && h.VTN.store.scopeOf(h.VTN.store.records.get(h.record.id)) === 'private');
    check('story withdrawal leaves unrelated overrides intact',
      h.VTN.store.scopeExceptions([untouched]).length === 1);
    check('story withdrawal persists only the two cleared overrides',
      JSON.parse(h.local.get('scopes'))[story.id] === undefined
      && JSON.parse(h.local.get('scopes'))[h.record.id] === undefined
      && JSON.parse(h.local.get('scopes'))[untouched.id] === 'public');
    check('story withdrawal updates the source recording badge to private',
      renderedScopeBadge(h) === 'scope.label:scope.private', renderedScopeBadge(h));
  }
  {
    const h = harness();
    const before = clone(h.VTN.store.records.get(h.record.id));
    const story = { id: h.record.id, segments: [] };
    const task = h.VTN.account.openWithdraw(story, { kind: 'story' });
    await flush(); h.reply(200);
    check('static story withdrawal succeeds', await task === true);
    check('static story cannot patch a same-ID local record', h.patches.length === 0
      && JSON.stringify(h.VTN.store.records.get(h.record.id)) === JSON.stringify(before));
  }
  {
    const h = harness({ segments: [] });
    let settled = false;
    const task = h.VTN.account.openWithdraw(h.record, { kind: 'record' })
      .then(result => { settled = true; return result; });
    await flush();
    check('pending request uses actual member bearer API', h.requests.length === 1
      && h.requests[0].method === 'POST'
      && h.requests[0].headers.Authorization === 'Bearer synthetic-signed-token');
    check('pending response does not resolve withdrawal', !settled);
    check('pending response preserves publication and withdrawn list',
      h.VTN.store.records.get(h.record.id).reviewStatus === 'approved'
      && h.VTN.store.records.get(h.record.id).scope === 'public'
      && h.VTN.store.withdrawn.list().length === 0 && h.patches.length === 0);
    check('pending response produces no success or refresh', h.toasts.length === 0
      && Object.values(h.renders).every(value => value === 0));
    h.reply(200);
    check('acknowledged pending request applies canonical state', await task === true
      && canonical(h, h.record.id));
    check('acknowledgement refreshes all related views',
      Object.values(h.renders).every(value => value === 1));
  }
  for (const failure of ['403', '500', 'network']) {
    const h = harness({ segments: [] });
    const before = clone(h.VTN.store.records.get(h.record.id));
    const task = h.VTN.account.openWithdraw(h.record, { kind: 'record' });
    await flush();
    if (failure === 'network') h.reject(new TypeError('Synthetic network rejection'));
    else h.reply(Number(failure), { detail: 'Synthetic failure' });
    check(failure + ' failure returns false', await task === false);
    check(failure + ' failure preserves exact local record',
      JSON.stringify(h.VTN.store.records.get(h.record.id)) === JSON.stringify(before));
    check(failure + ' failure writes no local withdrawal or patch',
      h.VTN.store.withdrawn.list().length === 0 && h.patches.length === 0);
    check(failure + ' failure shows only error feedback', h.toasts.length === 1
      && h.toasts[0].text === 'withdraw.failed' && h.toasts[0].kind === 'error');
    check(failure + ' failure does not refresh or hide content',
      Object.values(h.renders).every(value => value === 0));
  }
  for (const kind of ['record', 'story']) {
    {
      const h = harness({ segments: [] });
      const item = kind === 'record' ? h.record :
        { id: 'PUBLISHED-FAILURE', sourceRecordId: h.record.id, scope: 'public', segments: [] };
      keepOverride(h, h.record);
      if (kind === 'story') keepOverride(h, item);
      const items = kind === 'story' ? [h.record, item] : [h.record];
      const task = h.VTN.account.openWithdraw(item, { kind });
      await flush();
      h.reply(500, { detail: 'Synthetic failure' });
      check(kind + ' failure with override returns false', await task === false);
      check(kind + ' failure preserves saved sharing overrides',
        h.VTN.store.scopeExceptions(items).length === (kind === 'story' ? 2 : 1)
        && h.VTN.store.scopeOf(h.VTN.store.records.get(h.record.id)) === 'public');
    }
    {
      const h = harness({ confirm: false, segments: [] });
      const item = kind === 'record' ? h.record :
        { id: 'PUBLISHED-CANCEL', sourceRecordId: h.record.id, scope: 'public', segments: [] };
      keepOverride(h, h.record);
      if (kind === 'story') keepOverride(h, item);
      const items = kind === 'story' ? [h.record, item] : [h.record];
      check(kind + ' cancellation with override returns false',
        await h.VTN.account.openWithdraw(item, { kind }) === false);
      check(kind + ' cancellation preserves saved sharing overrides',
        h.requests.length === 0
        && h.VTN.store.scopeExceptions(items).length === (kind === 'story' ? 2 : 1));
    }
  }
  {
    const h = harness({ confirm: false });
    check('cancellation returns false',
      await h.VTN.account.openWithdraw(h.record, { kind: 'record' }) === false);
    check('cancellation makes no request or local mutation', h.requests.length === 0
      && h.toasts.length === 0 && h.patches.length === 0
      && h.VTN.store.withdrawn.list().length === 0);
  }
  {
    const h = harness({ segments: [] });
    const task = h.VTN.account.openWithdraw(h.record, { kind: 'record' });
    await flush();
    h.VTN.store.records.remove(h.record.id);
    h.reply(200);
    check('record removed during pending request is not recreated', await task === true
      && h.patches.length === 0 && h.VTN.store.records.get(h.record.id) === null);
  }
  {
    const h = harness({ segments: [] });
    const calls = [];
    h.VTN.account.openWithdraw = (item, options) => calls.push({ item, options });
    Object.assign(h.context, {
      VTN: h.VTN, U: h.VTN.util, t: key => key, audioNode: () => null,
      openSubmission() {}, reviewSubmission() {}, exportRecord() {}, removeRecord() {}
    });
    const renderRecording = loadFunction(h.context, '45-recordings.js', 'renderDoneBody');
    const card = new Element('div');
    renderRecording(h.record, card, {});
    const button = descendants(card).find(node => node.textContent === 'story.withdraw');
    assert.ok(button, 'Recording withdrawal button exists');
    button.click();
    check('actual recording button passes explicit record kind', calls.length === 1
      && calls[0].item === h.record && calls[0].options.kind === 'record');

    const story = { id: 'STORY-CALLER', scope: 'public', segments: [] };
    const host = new Element('div');
    Object.assign(h.context, {
      document: { getElementById: id => id === 'storyDetail' ? host : null },
      state: { selectedId: story.id }, get: () => story, isWithdrawn: () => false,
      storyTypeOf: () => 'oral', typeIcon: () => 'fa-file', typeLabel: String,
      eraLabel: String, storyTitle: () => 'Synthetic story',
      confidenceBadge: () => new Element('span'), villageLabel: String,
      durationLabel: () => '1', moodTagOf: () => null, badge: () => new Element('span'),
      resolveMedia: () => ({ type: 'audio' }), audioPlayerNode: () => new Element('audio'),
      mediaLaunchNode: () => new Element('div'), buildTranscript: () => new Element('div')
    });
    const renderStory = loadFunction(h.context, '30-stories.js', 'renderDetail');
    renderStory();
    const storyButton = descendants(host).find(node =>
      node.tagName === 'button' && node.attrs.class === 'vtn-btn vtn-btn--danger');
    assert.ok(storyButton, 'Story withdrawal button exists');
    storyButton.click();
    check('actual story button passes explicit story kind', calls.length === 2
      && calls[1].item === story && calls[1].options.kind === 'story');
  }
  console.log('ALL PASSED: ' + checks + ' withdrawal frontend checks (DOM/fetch doubles; no browser)');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
