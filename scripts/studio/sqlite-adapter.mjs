import { DatabaseSync } from 'node:sqlite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export function connectSQLite(filename) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const wrap = (query, args = []) => ({
    bind(...values) {
      return wrap(query, values);
    },
    async all() {
      return { results: sqlite.prepare(query).all(...args) };
    },
    async first() {
      return sqlite.prepare(query).get(...args) || null;
    },
    async run() {
      const r = sqlite.prepare(query).run(...args);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
  });
  return {
    sqlite,
    prepare: wrap,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
export function fileBucket(root) {
  function target(key) {
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep))
      throw Error('Unsafe BU object key');
    return full;
  }
  return {
    async put(key, body) {
      const filename = target(key);
      await mkdir(path.dirname(filename), { recursive: true });
      try {
        await writeFile(filename, body, { flag: 'wx' });
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        if ((await readFile(filename, 'utf8')) !== body)
          throw Error('Immutable archive mismatch');
      }
      return { key };
    },
    async get(key) {
      try {
        const value = await readFile(target(key), 'utf8');
        return { text: async () => value };
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
  };
}
