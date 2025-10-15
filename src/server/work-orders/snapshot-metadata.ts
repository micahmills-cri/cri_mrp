import crypto from "crypto";

const WORK_ORDER_SNAPSHOT_FIELDS = [
  "number",
  "hullId",
  "productSku",
  "qty",
  "status",
  "priority",
  "plannedStartDate",
  "plannedFinishDate",
  "routingVersionId",
  "currentStageIndex",
  "specSnapshot",
  "routingVersion",
] as const;

const WORK_ORDER_SNAPSHOT_SCHEMA_VERSION = 1;

export const WORK_ORDER_SNAPSHOT_SCHEMA_HASH = `sha256:${crypto
  .createHash("sha256")
  .update(
    JSON.stringify({
      version: WORK_ORDER_SNAPSHOT_SCHEMA_VERSION,
      fields: WORK_ORDER_SNAPSHOT_FIELDS,
    }),
  )
  .digest("hex")}`;

export type WorkOrderSnapshotSchemaField = (typeof WORK_ORDER_SNAPSHOT_FIELDS)[number];

export const WORK_ORDER_SNAPSHOT_SCHEMA_METADATA = {
  version: WORK_ORDER_SNAPSHOT_SCHEMA_VERSION,
  fields: WORK_ORDER_SNAPSHOT_FIELDS,
  hash: WORK_ORDER_SNAPSHOT_SCHEMA_HASH,
} as const;
