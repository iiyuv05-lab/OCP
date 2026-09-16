/** Browser-owned, transactional adapter for the SAME OCP canonical command engine.
 * This is not cloud authorization and never reports Drive/server publication.
 */
import { emptyGraph, execute, digest, validateGraph, DomainError } from './core.mjs';

const req = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const completed = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = () => reject(tx.error || new Error('저장 트랜잭션이 취소됐습니다.'));
  tx.onerror = () => reject(tx.error || new Error('저장 실패'));
});
export async function openBrowserStore({ name = 'ocp-studio-personal-v81', seed = null } = {}) {
  if (!globalThis.indexedDB || !globalThis.crypto?.subtle) {
    throw new Error('이 브라우저에서는 안전한 로컬 저장소를 사용할 수 없습니다. localhost 실행본이나 최신 브라우저를 사용하세요.');
  }
  const opening = indexedDB.open(name, 1);
  opening.onupgradeneeded = () => {
    for (const table of ['state', 'objects']) opening.result.createObjectStore(table);
  };
  const db = await req(opening);
  db.onversionchange = () => db.close();
  const initial = seed ? structuredClone(seed) : emptyGraph('browser-personal');
  validateGraph(initial);
  const actor = { id: 'browser-owner:' + crypto.randomUUID(), role: 'admin' };
  const init = db.transaction(['state'], 'readwrite');
  const initDone = completed(init), state = init.objectStore('state');
  const read = state.get('graph');
  read.onsuccess = () => {
    if (!read.result) {
      state.put(initial, 'graph');
      state.put(actor, 'actor');
      state.put({ createdAt: new Date().toISOString(), scope: 'this-browser-only' }, 'installation');
    }
  };
  await initDone;
  const events = new EventTarget();
  let channel;
  try { channel = new BroadcastChannel(name); } catch { /* The CAS still protects same-origin tabs. */ }
  channel?.addEventListener('message', () => events.dispatchEvent(new Event('external-change')));
  async function readGraph() { return req(db.transaction('state').objectStore('state').get('graph')); }
  const localActor = await req(db.transaction('state').objectStore('state').get('actor'));
  async function snapshot() {
    return { graph: await readGraph(), actor: localActor, mode: 'browser-local',
      label: '편집 가능 · 이 브라우저에 저장 · 운영 계정/Drive 미연결' };
  }
  async function command(input) {
    const before = await readGraph();
    // An imported remote identity is never trusted for browser-owner decisions.
    const result = await execute(before, input, { actor: localActor });
    if (result.duplicate) return { ...result, ...(await snapshot()) };
    const eventBody = JSON.stringify(result.event);
    const eventSha = await digest(eventBody);
    const journal = result.graph.journal.at(-1);
    journal.status = 'indexeddb-confirmed;drive-not-connected';
    journal.sha256 = eventSha;
    const tx = db.transaction(['state', 'objects'], 'readwrite');
    const done = completed(tx), table = tx.objectStore('state'), objects = tx.objectStore('objects');
    let conflict;
    const head = table.get('graph');
    head.onsuccess = () => {
      if (head.result.revision !== before.revision) {
        conflict = new DomainError('CONFLICT', '다른 탭에서 먼저 저장했습니다. 최신 내용을 불러온 뒤 다시 시도하세요.', 409);
        tx.abort(); return;
      }
      for (const id of result.event.changedIds || []) {
        const n = result.graph.nodes.find(item => item.id === id);
        if (n?.body && n.source?.sha256 && n.immutable) {
          objects.put({ body: n.body, mime: 'text/plain;charset=utf-8', sha256: n.source.sha256 }, 'raw/' + n.source.sha256);
          n.bu = { key: 'raw/' + n.source.sha256, state: 'indexeddb-confirmed;drive-not-connected' };
        }
      }
      objects.put({ body: eventBody, mime: 'application/json', sha256: eventSha }, journal.path);
      table.put(result.graph, 'graph');
    };
    try { await done; } catch (error) { throw conflict || error; }
    channel?.postMessage({ revision: result.graph.revision });
    return { ...result, actor: localActor, mode: 'browser-local', label: '이 브라우저 저장 확인' };
  }
  async function putFile(file) {
    if (file.size > 20 * 1024 * 1024) throw Error('첨부 원본은 파일당 20MB까지 저장합니다.');
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const tx = db.transaction('objects', 'readwrite'), done = completed(tx);
    tx.objectStore('objects').put({ blob: new Blob([bytes], { type: file.type || 'application/octet-stream' }), name: file.name, sha256: hash, bytes: file.size }, 'attachment/' + hash);
    await done;
    return { key: 'attachment/' + hash, sha256: hash, name: file.name, bytes: file.size, mime: file.type };
  }
  async function getObject(key) { return req(db.transaction('objects').objectStore('objects').get(key)); }
  async function backup() {
    const tx = db.transaction(['state', 'objects']), done = completed(tx);
    const g = req(tx.objectStore('state').get('graph'));
    const keys = req(tx.objectStore('objects').getAllKeys());
    const values = req(tx.objectStore('objects').getAll());
    const [graph, objectKeys, objectValues] = await Promise.all([g, keys, values]);
    await done;
    const objects = [];
    for (let i = 0; i < objectKeys.length; i++) {
      const value = { ...objectValues[i] };
      if (value.blob) {
        const data = new Uint8Array(await value.blob.arrayBuffer());
        let text = '';
        for (let offset = 0; offset < data.length; offset += 8192) text += String.fromCharCode(...data.subarray(offset, offset + 8192));
        value.base64 = btoa(text); value.mime = value.blob.type; delete value.blob;
      }
      objects.push({ key: objectKeys[i], ...value });
    }
    return { format: 'ocp.browser.backup/1', storage: 'browser-local', exportedAt: new Date().toISOString(), graph, objects };
  }
  async function restore(bundle) {
    if (bundle?.format !== 'ocp.browser.backup/1') throw Error('OCP 작업공간 백업 파일이 아닙니다.');
    const graph = structuredClone(bundle.graph);
    validateGraph(graph);
    if (!Array.isArray(bundle.objects) || bundle.objects.length > 20000) throw Error('백업 객체 수가 허용 범위를 초과합니다.');
    const objects = [];
    for (const record of bundle.objects) {
      if (typeof record.key !== 'string' || record.key.includes('..')) throw Error('백업 객체 키가 잘못됐습니다.');
      const value = { ...record }; delete value.key;
      if (value.base64) {
        const bytes = Uint8Array.from(atob(value.base64), c => c.charCodeAt(0));
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== value.sha256) throw Error('첨부 파일 해시가 일치하지 않습니다.');
        value.blob = new Blob([bytes], { type: value.mime }); delete value.base64;
      } else if (typeof value.body === 'string' && value.sha256 && await digest(value.body) !== value.sha256) throw Error('원문 또는 이벤트 해시가 일치하지 않습니다.');
      objects.push([record.key, value]);
    }
    // Keep the prior workspace as a recovery copy. Only this browser is restored.
    const tx = db.transaction(['state', 'objects'], 'readwrite'), done = completed(tx), state = tx.objectStore('state');
    const old = state.get('graph');
    old.onsuccess = () => {
      state.put(old.result, 'before-restore'); state.put(graph, 'graph');
      for (const [key, value] of objects) tx.objectStore('objects').put(value, key);
    };
    await done;
    channel?.postMessage({ revision: graph.revision });
    return snapshot();
  }
  return {
    snapshot, command, putFile, getObject, backup, restore, events,
    async detail(id) { const graph = await readGraph(); const node = graph.nodes.find(n => n.id === id); if (!node) throw Error('원문을 찾을 수 없습니다.'); return { node }; },
    async rep() { throw Error('현재는 브라우저 작업공간입니다. 외부 REP 서버 동기화가 아닙니다. 노트 입력과 구름 묶기는 바로 사용할 수 있습니다.'); },
    async localSession() { return snapshot(); },
    close() { channel?.close(); db.close(); },
  };
}
