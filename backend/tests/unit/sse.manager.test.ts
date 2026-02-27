import { afterEach, describe, expect, it } from "vitest";
import {
  addConnection,
  getConnectionCount,
  removeConnection,
  sendToUser,
  sendToUsers,
} from "../../src/services/sse.manager.js";

interface MockResponse {
  writes: string[];
  ended: boolean;
  write: (chunk: string) => boolean;
  end: () => MockResponse;
}

const createRes = (shouldThrow = false): MockResponse => ({
  writes: [],
  ended: false,
  write(chunk: string) {
    if (shouldThrow) throw new Error("write failed");
    this.writes.push(chunk);
    return true;
  },
  end() {
    this.ended = true;
    return this;
  },
});

const tracked: Array<{ userId: string; res: MockResponse }> = [];
const trackConnection = (userId: string, res: MockResponse) => {
  addConnection(userId, res as never);
  tracked.push({ userId, res });
};

afterEach(() => {
  for (const { userId, res } of tracked.splice(0)) {
    removeConnection(userId, res as never);
  }
});

describe("sse.manager", () => {
  it("adds and removes connections by user", () => {
    const initialCount = getConnectionCount();
    const r1 = createRes();
    trackConnection("u-conn-1", r1);
    expect(getConnectionCount()).toBe(initialCount + 1);

    removeConnection("u-conn-1", r1 as never);
    expect(getConnectionCount()).toBe(initialCount);
  });

  it("enforces max connections per user", () => {
    const userId = "u-max";
    const conns = [createRes(), createRes(), createRes(), createRes(), createRes()];
    for (const c of conns) trackConnection(userId, c);

    const rejected = createRes();
    trackConnection(userId, rejected);
    expect(rejected.ended).toBe(true);
    expect(rejected.writes.join("")).toMatch(/Too many open connections/);

    for (const c of conns) removeConnection(userId, c as never);
  });

  it("sends events and prunes dead connections", () => {
    const userId = "u-send";
    const good = createRes();
    const bad = createRes(true);
    trackConnection(userId, good);
    trackConnection(userId, bad);

    sendToUser(userId, { event: "alert", data: { ok: true } });
    expect(good.writes.join("")).toMatch(/event: alert/);

    removeConnection(userId, good as never);
    removeConnection(userId, bad as never);
  });

  it("sends to multiple users", () => {
    const r1 = createRes();
    const r2 = createRes();
    trackConnection("u-m1", r1);
    trackConnection("u-m2", r2);

    sendToUsers(["u-m1", "u-m2"], { event: "ping", data: { n: 1 } });

    expect(r1.writes.join("")).toMatch(/event: ping/);
    expect(r2.writes.join("")).toMatch(/event: ping/);

    removeConnection("u-m1", r1 as never);
    removeConnection("u-m2", r2 as never);
  });
});
