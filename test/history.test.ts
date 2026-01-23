import { describe, it, expect } from "vitest";

import { History } from "../src/core/History";

type Events = {
  "counter:inc": { amount: number };
};

describe("History: id dedupe + order", () => {
  it("keeps most-recent id at the end and evicts oldest", () => {
    const history = new History<Events>({ limit: 2 });

    history.set("counter:inc", {
      payload: { amount: 1 },
      meta: { id: "a", timestamp: 1 },
    });
    history.set("counter:inc", {
      payload: { amount: 2 },
      meta: { id: "b", timestamp: 2 },
    });
    history.set("counter:inc", {
      payload: { amount: 3 },
      meta: { id: "a", timestamp: 3 },
    });

    expect(history.getAll().map((record) => record.data.meta.id)).toEqual([
      "b",
      "a",
    ]);
    expect(history.get("a")).toBe(true);
    expect(history.get("b")).toBe(true);

    history.set("counter:inc", {
      payload: { amount: 4 },
      meta: { id: "c", timestamp: 4 },
    });

    expect(history.get("b")).toBe(false);
    expect(history.getAll().map((record) => record.data.meta.id)).toEqual([
      "a",
      "c",
    ]);
    expect(history.getAll().find((record) => record.data.meta.id === "a")?.data)
      .toEqual({
        payload: { amount: 3 },
        meta: { id: "a", timestamp: 3 },
      });
  });
});
