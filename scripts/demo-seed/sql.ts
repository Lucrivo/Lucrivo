import type {
  SeedRpcCall,
  SeedSqlArgument,
  SeedSqlValue,
  SqlCast,
} from "./model";

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_.]*$/;
const MAX_BATCH_SIZE = 500;

function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Unsafe ${label} identifier: ${value}`);
  }
}

function stableJsonValue(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JSON numbers must be finite.");
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw new Error("JSON integers must be safe integers.");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Value is not valid JSON.");
  }
  if (seen.has(value)) throw new Error("Circular value is not valid JSON.");
  seen.add(value);

  if (Array.isArray(value)) {
    const sorted = value.map((item) => stableJsonValue(item, seen));
    seen.delete(value);
    return sorted;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Only plain objects are valid JSON seed values.");
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = stableJsonValue(
      (value as Record<string, unknown>)[key],
      seen,
    );
  }
  seen.delete(value);
  return sorted;
}

function quoteText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlLiteral(value: SeedSqlValue, cast: SqlCast): string {
  if (value === null) return `null::${cast}`;

  if (cast === "jsonb") {
    if (typeof value !== "object") {
      throw new Error("The jsonb cast requires an object or array value.");
    }
    const serialized = JSON.stringify(stableJsonValue(value, new WeakSet()));
    return `${quoteText(serialized)}::jsonb`;
  }

  if (typeof value === "object") {
    throw new Error("Object and array values require the jsonb cast.");
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("SQL numeric values must be safe integers.");
    }
    return `${String(value)}::${cast}`;
  }
  if (typeof value === "boolean") return `${String(value)}::${cast}`;
  return `${quoteText(value)}::${cast}`;
}

function renderBatchInsert(input: {
  table: string;
  columns: string[];
  rows: SeedSqlValue[][];
  casts: SqlCast[];
  suffix?: string;
}): string {
  assertIdentifier(input.table, "table");
  input.columns.forEach((column) => assertIdentifier(column, "column"));
  if (input.columns.length === 0) {
    throw new Error("A batch insert requires at least one column.");
  }
  if (input.columns.length !== input.casts.length) {
    throw new Error("Column and cast widths must match.");
  }
  input.rows.forEach((row) => {
    if (row.length !== input.columns.length) {
      throw new Error("Every row width must match the column width.");
    }
  });
  if (input.rows.length === 0) return "";

  const statements: string[] = [];
  for (let start = 0; start < input.rows.length; start += MAX_BATCH_SIZE) {
    const batch = input.rows.slice(start, start + MAX_BATCH_SIZE);
    const values = batch
      .map(
        (row) =>
          `  (${row
            .map((value, index) => sqlLiteral(value, input.casts[index]!))
            .join(", ")})`,
      )
      .join(",\n");
    const suffix = input.suffix ? `\n${input.suffix}` : "";
    statements.push(
      `insert into ${input.table} (${input.columns.join(", ")}) values\n${values}${suffix};`,
    );
  }

  return statements.join("\n\n");
}

function renderRpcCall(call: SeedRpcCall): string {
  assertIdentifier(call.functionName, "function");
  call.arguments.forEach((argument) =>
    assertIdentifier(argument.name, "argument"),
  );

  const argumentsSql = call.arguments
    .map(
      (argument: SeedSqlArgument) =>
        `  ${argument.name} => ${sqlLiteral(argument.value, argument.cast)}`,
    )
    .join(",\n");

  return argumentsSql.length > 0
    ? `select ${call.functionName}(\n${argumentsSql}\n);`
    : `select ${call.functionName}();`;
}

export { renderBatchInsert, renderRpcCall, sqlLiteral };
