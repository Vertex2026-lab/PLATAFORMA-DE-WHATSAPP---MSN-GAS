import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export class Storage {
  constructor(dir) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(join(dir, "gateway.sqlite"));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, desired INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sends(id TEXT PRIMARY KEY, account TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, message_id TEXT, error TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, body TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0);
      UPDATE sends SET status='uncertain',error='Processo reiniciado durante envio. Confira no WhatsApp.' WHERE status='sending';`);
  }
  desired(id, value) {
    this.db
      .prepare(
        "INSERT INTO sessions(id,desired) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET desired=excluded.desired",
      )
      .run(id, value ? 1 : 0);
  }
  restore() {
    return this.db
      .prepare("SELECT id FROM sessions WHERE desired=1")
      .all()
      .map((r) => r.id);
  }
  getSend(id) {
    return this.db.prepare("SELECT * FROM sends WHERE id=?").get(id);
  }
  reserve({ key, account, to, text }) {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO sends(id,account,recipient,body,status,created) VALUES(?,?,?,?,?,?)",
      )
      .run(key, account, to, text, "sending", Date.now());
    return this.getSend(key);
  }
  finish(id, status, messageId, error) {
    this.db
      .prepare("UPDATE sends SET status=?,message_id=?,error=? WHERE id=?")
      .run(status, messageId || null, error || null, id);
  }
  enqueue(event) {
    const id = event.id || randomUUID();
    this.db
      .prepare("INSERT OR IGNORE INTO events(id,body) VALUES(?,?)")
      .run(id, JSON.stringify({ ...event, id }));
    return id;
  }
  pending() {
    return this.db
      .prepare("SELECT * FROM events WHERE next_at<=? ORDER BY rowid LIMIT 10")
      .all(Date.now());
  }
  delivered(id) {
    this.db.prepare("DELETE FROM events WHERE id=?").run(id);
  }
  postpone(event) {
    const wait = Math.min(60000, 1000 * 2 ** Math.min(event.attempt, 6));
    this.db
      .prepare("UPDATE events SET attempt=attempt+1,next_at=? WHERE id=?")
      .run(Date.now() + wait, event.id);
  }
  eventCount() {
    return this.db.prepare("SELECT count(*) AS n FROM events").get().n;
  }
  close() {
    this.db.close();
  }
}
