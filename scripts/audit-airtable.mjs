import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const token = env.AIRTABLE_TOKEN;
const baseId = env.AIRTABLE_BASE_ID;

if (!token || !baseId) {
  throw new Error("Variables Airtable manquantes");
}

const response = await fetch(
  `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

if (!response.ok) {
  throw new Error(`Airtable API ${response.status}`);
}

const { tables } = await response.json();

console.log("\n=== KLS3 SALES OS — AIRTABLE SCHEMA ===\n");

for (const table of tables) {
  console.log(`\n[${table.name}]`);

  for (const field of table.fields) {
    let detail = "";

    if (
      field.type === "multipleRecordLinks" &&
      field.options?.linkedTableId
    ) {
      const linkedTable = tables.find(
        (t) => t.id === field.options.linkedTableId
      );

      detail = linkedTable
        ? ` → ${linkedTable.name}`
        : ` → ${field.options.linkedTableId}`;
    }

    console.log(
      `  - ${field.name} [${field.type}]${detail}`
    );
  }
}

console.log(`\n\nTotal : ${tables.length} tables`);
