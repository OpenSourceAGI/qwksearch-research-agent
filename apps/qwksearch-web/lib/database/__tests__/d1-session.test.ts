import { describe, expect, it } from "vitest";
import {
  D1_BOOKMARK_COOKIE,
  D1_BOOKMARK_HEADER,
  applyD1Bookmark,
  getD1Bookmark,
  getD1ReplicaInfo,
  runWithD1Session,
  runWithPrimaryD1Session,
  sessionedD1,
} from "../d1-session";

interface FakeResult {
  results: unknown[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface FakeStatement {
  bind(...values: unknown[]): FakeStatement;
  first(colName?: string): Promise<unknown>;
  run(): Promise<FakeResult>;
  all(): Promise<FakeResult>;
  raw(options?: unknown): Promise<unknown[]>;
}

/**
 * A stand-in for the D1 binding that records how it was used: the constraint
 * each session was opened with, and which statements ran where. Calls landing
 * on `binding` rather than on a session are the un-sessioned path.
 */
function fakeD1() {
  const opened: string[] = [];
  const ranOnBinding: string[] = [];
  const ranInSession: string[] = [];
  let bookmark: string | null = null;

  const statement = (sql: string, sink: string[], meta: Record<string, unknown>): FakeStatement => {
    const self: FakeStatement = {
      bind: (...values: unknown[]) => {
        sink.push(`bind:${sql}:${values.join(",")}`);
        return self;
      },
      run: async () => {
        sink.push(`run:${sql}`);
        return { results: [], success: true, meta };
      },
      all: async () => {
        sink.push(`all:${sql}`);
        return { results: [], success: true, meta };
      },
      first: async () => {
        sink.push(`first:${sql}`);
        return null;
      },
      raw: async () => {
        sink.push(`raw:${sql}`);
        return [];
      },
    };
    return self;
  };

  const binding = {
    prepare: (sql: string) => statement(sql, ranOnBinding, { served_by_primary: true }),
    batch: async (statements: FakeStatement[]): Promise<FakeResult[]> => {
      ranOnBinding.push(`batch:${statements.length}`);
      return statements.map(() => ({ results: [], success: true, meta: {} }));
    },
    exec: async (sql: string) => {
      ranOnBinding.push(`exec:${sql}`);
      return { count: 1, duration: 0 };
    },
    withSession: (constraint?: string) => {
      opened.push(constraint ?? "<none>");
      return {
        prepare: (sql: string) =>
          statement(sql, ranInSession, { served_by_region: "WEUR", served_by_primary: false }),
        batch: async (statements: FakeStatement[]): Promise<FakeResult[]> => {
          // The runtime only accepts its own statement objects here, so assert
          // the wrapper unwrapped its tracking layer before forwarding.
          for (const candidate of statements) {
            expect(Object.getOwnPropertySymbols(candidate)).toHaveLength(0);
          }
          ranInSession.push(`batch:${statements.length}`);
          return statements.map(() => ({
            results: [],
            success: true,
            meta: { served_by_region: "APAC" },
          }));
        },
        getBookmark: () => bookmark,
      };
    },
  };

  return {
    binding,
    opened,
    ranOnBinding,
    ranInSession,
    setBookmark: (value: string | null) => {
      bookmark = value;
    },
  };
}

const get = (headers?: Record<string, string>) =>
  new Request("https://example.test/dashboard", { headers });
const post = (headers?: Record<string, string>) =>
  new Request("https://example.test/api/items", { method: "POST", headers });

describe("session constraints", () => {
  it("starts reads on any replica and writes on the primary", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get(), undefined, () => db.prepare("select 1").run());
    await runWithD1Session(post(), undefined, () => db.prepare("insert 1").run());

    expect(d1.opened).toEqual(["first-unconstrained", "first-primary"]);
  });

  it("resumes from the client's bookmark, header or cookie", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get({ [D1_BOOKMARK_HEADER]: "0000001-0000002" }), undefined, () =>
      db.prepare("select 1").run(),
    );
    await runWithD1Session(
      get({ cookie: `other=x; ${D1_BOOKMARK_COOKIE}=0000003-0000004` }),
      undefined,
      () => db.prepare("select 1").run(),
    );

    expect(d1.opened).toEqual(["0000001-0000002", "0000003-0000004"]);
  });

  it("ignores a bookmark that is not shaped like one", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get({ [D1_BOOKMARK_HEADER]: "'; drop table users --" }), undefined, () =>
      db.prepare("select 1").run(),
    );

    expect(d1.opened).toEqual(["first-unconstrained"]);
  });

  it("honours the D1_SESSION_MODE override", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get(), "primary", () => db.prepare("select 1").run());
    await runWithD1Session(post(), "unconstrained", () => db.prepare("select 1").run());
    // An unrecognised value is not an outage: fall back to "auto".
    await runWithD1Session(get(), "nonsense", () => db.prepare("select 1").run());

    expect(d1.opened).toEqual(["first-primary", "first-unconstrained", "first-unconstrained"]);
  });

  it("starts background work on the primary", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithPrimaryD1Session(() => db.prepare("delete 1").run());

    expect(d1.opened).toEqual(["first-primary"]);
  });
});

describe("sessioned binding", () => {
  it("routes every query in a request through one session", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get(), undefined, async () => {
      await db.prepare("select 1").bind(7).all();
      await db.batch([db.prepare("select 2"), db.prepare("select 3")]);
    });

    expect(d1.opened).toHaveLength(1);
    expect(d1.ranInSession).toEqual(["bind:select 1:7", "all:select 1", "batch:2"]);
    expect(d1.ranOnBinding).toEqual([]);
  });

  it("falls through to the plain binding outside a session scope", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await db.prepare("select 1").run();

    expect(d1.opened).toEqual([]);
    expect(d1.ranOnBinding).toEqual(["run:select 1"]);
  });

  it("bypasses the Sessions API when the mode is off", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get(), "off", () => db.prepare("select 1").run());

    expect(d1.opened).toEqual([]);
    expect(d1.ranOnBinding).toEqual(["run:select 1"]);
  });

  it("passes methods it does not intercept through to the binding", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    await runWithD1Session(get(), undefined, () => db.exec("pragma foreign_keys = on"));

    expect(d1.ranOnBinding).toEqual(["exec:pragma foreign_keys = on"]);
  });

  it("reports which D1 instance answered the last query", async () => {
    const d1 = fakeD1();
    const db = sessionedD1(d1.binding);

    const info = await runWithD1Session(get(), undefined, async () => {
      await db.prepare("select 1").run();
      return getD1ReplicaInfo();
    });

    expect(info).toEqual({ region: "WEUR", primary: false });
  });
});

describe("bookmark propagation", () => {
  it("returns the session's closing bookmark on the response", async () => {
    const d1 = fakeD1();
    d1.setBookmark("0000005-0000006");
    const db = sessionedD1(d1.binding);

    const response = await runWithD1Session(get(), undefined, async () => {
      await db.prepare("select 1").run();
      return applyD1Bookmark(new Response("ok"));
    });

    expect(response.headers.get(D1_BOOKMARK_HEADER)).toBe("0000005-0000006");
    expect(response.headers.get("set-cookie")).toContain(`${D1_BOOKMARK_COOKIE}=0000005-0000006`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("keeps the cookie off responses that never touched D1", () => {
    const d1 = fakeD1();
    d1.setBookmark("0000005-0000006");
    sessionedD1(d1.binding);

    const response = runWithD1Session(get(), undefined, () => {
      expect(getD1Bookmark()).toBeNull();
      return applyD1Bookmark(new Response("static"));
    });

    expect(d1.opened).toEqual([]);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get(D1_BOOKMARK_HEADER)).toBeNull();
  });

  it("preserves Set-Cookie headers the app already wrote", async () => {
    const d1 = fakeD1();
    d1.setBookmark("0000005-0000006");
    const db = sessionedD1(d1.binding);

    const response = await runWithD1Session(post(), undefined, async () => {
      await db.prepare("insert 1").run();
      const original = new Response("ok");
      original.headers.append("set-cookie", "session=abc; Path=/");
      return applyD1Bookmark(original);
    });

    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain("session=abc");
    expect(cookies[1]).toContain(D1_BOOKMARK_COOKIE);
  });

  it("adds the replica-routing headers only in debug mode", async () => {
    const d1 = fakeD1();
    d1.setBookmark("0000005-0000006");
    const db = sessionedD1(d1.binding);

    const plain = await runWithD1Session(get(), undefined, async () => {
      await db.prepare("select 1").run();
      return applyD1Bookmark(new Response("ok"));
    });
    const debug = await runWithD1Session(get(), undefined, async () => {
      await db.prepare("select 1").run();
      return applyD1Bookmark(new Response("ok"), { debug: true });
    });

    expect(plain.headers.get("x-d1-served-by-region")).toBeNull();
    expect(debug.headers.get("x-d1-served-by-region")).toBe("WEUR");
    expect(debug.headers.get("x-d1-served-by-primary")).toBe("false");
  });

  it("round-trips a bookmark from one request into the next", async () => {
    const d1 = fakeD1();
    d1.setBookmark("0000007-0000008");
    const db = sessionedD1(d1.binding);

    const first = await runWithD1Session(post(), undefined, async () => {
      await db.prepare("insert 1").run();
      return applyD1Bookmark(new Response("ok"));
    });

    const cookie = first.headers.getSetCookie()[0].split(";")[0];
    await runWithD1Session(get({ cookie }), undefined, () => db.prepare("select 1").run());

    expect(d1.opened).toEqual(["first-primary", "0000007-0000008"]);
  });
});
