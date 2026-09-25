import { describe, expect, it } from "vitest";

import { seedUuid } from "./ids";
import {
  renderBatchInsert,
  renderRpcCall,
  sqlExpression,
  sqlLiteral,
} from "./sql";

describe("sqlLiteral", () => {
  it("escapes text while preserving unicode and newlines", () => {
    expect(sqlLiteral("D'Ávila\nSul", "text")).toBe("'D''Ávila\nSul'::text");
  });

  it("renders nulls and primitive values with explicit casts", () => {
    expect(sqlLiteral(null, "bigint")).toBe("null::bigint");
    expect(sqlLiteral(true, "boolean")).toBe("true::boolean");
    expect(sqlLiteral(42, "integer")).toBe("42::integer");
  });

  it("sorts nested JSON object keys deterministically", () => {
    expect(
      sqlLiteral({ z: { y: 2, x: 1 }, a: [{ d: 4, c: 3 }] }, "jsonb"),
    ).toBe(`'{"a":[{"c":3,"d":4}],"z":{"x":1,"y":2}}'::jsonb`);
  });

  it("rejects unsafe numbers and non-JSON objects", () => {
    expect(() => sqlLiteral(Number.MAX_SAFE_INTEGER + 1, "bigint")).toThrow(
      /safe integer/i,
    );
    expect(() => sqlLiteral({ value: undefined }, "jsonb")).toThrow(/json/i);
    expect(() => sqlLiteral({ value: 1 }, "text")).toThrow(/jsonb/i);
  });

  it("renders only explicitly safe SQL expressions", () => {
    expect(
      sqlLiteral(
        sqlExpression("pg_catalog.statement_timestamp() - interval '2 days'"),
        "timestamptz",
      ),
    ).toBe(
      "(pg_catalog.statement_timestamp() - interval '2 days')::timestamptz",
    );
    expect(() => sqlExpression("now(); drop table users")).toThrow(/unsafe/i);
  });
});

describe("renderBatchInsert", () => {
  it("uses stable column order, casts, suffix, and 500-row batches", () => {
    const rows = Array.from({ length: 501 }, (_, index) => [
      seedUuid("user", index),
      `Cliente ${index}`,
    ]);
    const sql = renderBatchInsert({
      table: "public.profiles",
      columns: ["id", "display_name"],
      rows,
      casts: ["uuid", "text"],
      suffix:
        "on conflict (id) do update set display_name = excluded.display_name",
    });

    expect(sql.match(/insert into public\.profiles/g)).toHaveLength(2);
    expect(sql).toContain(
      "insert into public.profiles (id, display_name) values",
    );
    expect(sql).toContain("on conflict (id) do update");
  });

  it("rejects invalid identifiers and row widths", () => {
    expect(() =>
      renderBatchInsert({
        table: "public.users; drop table users",
        columns: ["id"],
        rows: [["value"]],
        casts: ["text"],
      }),
    ).toThrow(/identifier/i);
    expect(() =>
      renderBatchInsert({
        table: "public.users",
        columns: ["id", "email"],
        rows: [["value"]],
        casts: ["text", "text"],
      }),
    ).toThrow(/width/i);
  });
});

describe("renderRpcCall", () => {
  it("renders named arguments in supplied order", () => {
    const sql = renderRpcCall({
      functionName: "public.example_v1",
      arguments: [
        { name: "p_id", value: seedUuid("user", 1), cast: "uuid" },
        { name: "p_payload", value: { b: 2, a: 1 }, cast: "jsonb" },
      ],
    });

    expect(sql).toBe(
      `select public.example_v1(\n  p_id => 'd1000000-0000-4000-8000-000000000001'::uuid,\n  p_payload => '{"a":1,"b":2}'::jsonb\n);`,
    );
  });

  it("rejects unsafe function and argument identifiers", () => {
    expect(() =>
      renderRpcCall({ functionName: "public.bad()", arguments: [] }),
    ).toThrow(/identifier/i);
    expect(() =>
      renderRpcCall({
        functionName: "public.good",
        arguments: [{ name: "p-bad", value: 1, cast: "integer" }],
      }),
    ).toThrow(/identifier/i);
  });
});
