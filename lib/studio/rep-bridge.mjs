/** Adapter for inspected Plmag REP tables. Always scope reads to the verified account. */
import { digest, execute, DomainError } from '../../public/ocp-studio/core.mjs';
import {
  initialize,
  loadGraph,
  saveGraph,
  tenantFor,
} from './canonical-store.mjs';
export async function syncREP({
  db,
  bucket,
  accountId,
  actor,
  selection = {},
  now,
}) {
  const workspace = await tenantFor(actor.id),
    owner = 'account:' + accountId;
  await initialize(db, workspace, actor);
  let graph = await loadGraph(db, workspace),
    imported = 0,
    unchanged = 0;
  const rawBySource = new Map(
    graph.nodes
      .filter((n) => n.source)
      .map((n) => [
        n.source.system + ':' + n.source.id + ':' + n.source.version,
        n,
      ]),
  );
  const apply = async (type, payload, key) => {
    const command = {
      id: 'rep-' + (await digest(key)).slice(0, 56),
      expectedRevision: graph.revision,
      type,
      payload,
    };
    const out = await execute(graph, command, { actor, now });
    await saveGraph(db, bucket, workspace, graph, out);
    graph = await loadGraph(db, workspace);
    return out;
  };
  const capture = async (sourceSystem, record, body, nativeRef) => {
    const version = String(
        record.version ?? record.updated ?? record.created ?? 1,
      ),
      key = sourceSystem + ':' + record.id + ':' + version;
    const existing = rawBySource.get(key);
    if (existing) {
      if (existing.source.sha256 !== (await digest(body)))
        throw new DomainError(
          'SOURCE_CONFLICT',
          'REP 원본 버전의 내용이 달라졌습니다.',
          409,
        );
      unchanged++;
      return existing.id;
    }
    const out = await apply(
      'capture',
      {
        title: String(record.title || body.slice(0, 90) || 'REP 원문'),
        body,
        sourceSystem,
        sourceId: record.id,
        sourceVersion: version,
        nativeRef,
      },
      key + ':' + (await digest(body)),
    );
    imported++;
    return out.result.id;
  };
  const noteIds = selection.noteIds;
  if (
    noteIds &&
    (!Array.isArray(noteIds) ||
      noteIds.length > 20 ||
      noteIds.some((id) => typeof id !== 'string' || id.length > 100))
  )
    throw new DomainError('SELECTION', '노트는 한 번에 20개까지 선택하세요.');
  // Bounded pages: never call a first page "all notes".
  const cursor = String(selection.after || '');
  const query = noteIds?.length
    ? `SELECT id,title,body,version,updated,folder_id,vault_id,project_id,blocks_json FROM rep_notes WHERE owner=? AND id IN (${noteIds.map(() => '?').join(',')}) ORDER BY id`
    : 'SELECT id,title,body,version,updated,folder_id,vault_id,project_id,blocks_json FROM rep_notes WHERE owner=? AND id>? ORDER BY id LIMIT 21';
  const rows =
    selection.skipNotes === true
      ? []
      : (
          await db
            .prepare(query)
            .bind(owner, ...(noteIds?.length ? noteIds : [cursor]))
            .all()
        ).results;
  if (noteIds?.length && rows.length !== new Set(noteIds).size)
    throw new DomainError(
      'OWNERSHIP',
      '선택한 노트 중 이 계정의 원본이 아닌 항목이 있습니다.',
      403,
    );
  const selected = rows.slice(0, 20),
    linked = new Map();
  for (const n of selected) {
    const body =
      n.body ||
      JSON.stringify({
        title: n.title,
        body: '',
        blocks: n.blocks_json ? JSON.parse(n.blocks_json) : null,
      });
    const id = await capture('rep-note', n, body, {
      kind: 'note',
      table: 'rep_notes',
      id: n.id,
      version: n.version,
      folderId: n.folder_id,
      vaultId: n.vault_id,
      projectId: n.project_id,
    });
    linked.set(n.id, id);
  }
  let cloud = null;
  if (selection.includeCloud === true) {
    cloud = await db
      .prepare('SELECT content,version FROM rep_note_canvas WHERE owner=?')
      .bind(owner)
      .first();
    if (cloud) {
      const parsed = JSON.parse(cloud.content),
        id = await capture(
          'rep-cloud',
          {
            id: 'cloud:' + owner,
            title: 'REP 구름 캔버스',
            version: cloud.version,
          },
          cloud.content,
          { kind: 'cloud', table: 'rep_note_canvas', version: cloud.version },
        );
      // Nested coordinates remain immutable source bytes, never canonical X/Y/Z.
      const leaves = [];
      const walk = (v, depth = 0) => {
        if (depth > 25) return;
        if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
        if (v && typeof v === 'object') {
          if (typeof v.noteId === 'string') leaves.push(v.noteId);
          for (const [k, c] of Object.entries(v))
            if (k !== 'noteId') walk(c, depth + 1);
        }
      };
      walk(parsed);
      for (const originalId of [...new Set(leaves)])
        if (linked.has(originalId))
          await apply(
            'relate',
            { from: id, to: linked.get(originalId), predicate: 'REFERS_TO' },
            id + ':' + originalId,
          );
    }
  }
  let messages = [];
  if (selection.channelId) {
    const member = await db
      .prepare(
        'SELECT channel_id FROM rep_message_members WHERE channel_id=? AND actor=?',
      )
      .bind(selection.channelId, accountId)
      .first();
    if (!member)
      throw new DomainError('CHANNEL', '참여 중인 REP 채널이 아닙니다.', 403);
    messages = (
      await db
        .prepare(
          'SELECT id,text,created,label,kind,source FROM rep_messages WHERE channel_id=? AND id>? ORDER BY id LIMIT 21',
        )
        .bind(selection.channelId, String(selection.messageAfter || ''))
        .all()
    ).results;
    for (const m of messages.slice(0, 20))
      await capture(
        'rep-message',
        { ...m, title: m.label + ' · ' + m.text.slice(0, 60) },
        m.text,
        {
          kind: 'message',
          table: 'rep_messages',
          id: m.id,
          channelId: selection.channelId,
          source: m.source || null,
        },
      );
  }
  return {
    imported,
    unchanged,
    graphRevision: graph.revision,
    scope: 'selected-or-bounded-page',
    nextNotes: rows.length > 20 ? selected.at(-1).id : null,
    nextMessages: messages.length > 20 ? messages[19].id : null,
    cloud: cloud ? 'source-connected' : 'not-requested-or-absent',
    remoteOriginModified: false,
  };
}
