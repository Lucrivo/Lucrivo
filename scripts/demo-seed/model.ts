type SeedUuidKind =
  | "user"
  | "identity"
  | "contract"
  | "payment"
  | "submission"
  | "item"
  | "ingredient";

type SqlCast =
  | "uuid"
  | "text"
  | "boolean"
  | "smallint"
  | "integer"
  | "bigint"
  | "date"
  | "timestamptz"
  | "jsonb"
  | "public.business_category"
  | "public.service_pricing_method"
  | "public.service_work_hours_period";

type SeedSqlValue = string | number | boolean | null | object | unknown[];

type SeedSqlArgument = {
  name: string;
  value: SeedSqlValue;
  cast: SqlCast;
};

type SeedRpcCall = {
  functionName: string;
  arguments: SeedSqlArgument[];
};

export type {
  SeedRpcCall,
  SeedSqlArgument,
  SeedSqlValue,
  SeedUuidKind,
  SqlCast,
};
