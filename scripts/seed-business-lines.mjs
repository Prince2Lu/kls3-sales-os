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

const AIRTABLE_TOKEN = env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
  throw new Error("Variables Airtable manquantes");
}

const API = "https://api.airtable.com/v0";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Airtable ${response.status}: ${JSON.stringify(body)}`
    );
  }

  return body;
}

async function getSchema() {
  return request(
    `${API}/meta/bases/${AIRTABLE_BASE_ID}/tables`
  );
}

async function listRecords(tableId) {
  return request(
    `${API}/${AIRTABLE_BASE_ID}/${tableId}?pageSize=100`
  );
}

async function createRecord(tableId, fields) {
  return request(
    `${API}/${AIRTABLE_BASE_ID}/${tableId}`,
    {
      method: "POST",
      body: JSON.stringify({
        fields,
        typecast: true,
      }),
    }
  );
}

async function main() {
  console.log("Lecture du schéma...");

  const schema = await getSchema();

  const businessLinesTable = schema.tables.find(
    (table) => table.name === "BUSINESS_LINES"
  );

  if (!businessLinesTable) {
    throw new Error("Table BUSINESS_LINES introuvable");
  }

  const existingRecords = await listRecords(
    businessLinesTable.id
  );

  const existingCodes = new Set(
    existingRecords.records
      .map((record) => record.fields.Code)
      .filter(Boolean)
  );

  const businessLines = [
    {
      Name: "Paul",
      Code: "PAUL",
      Category: "PARTNER",
      "Revenue Trigger": "PAID_MEETING",
      "Revenue Type": "ONE_SHOT",
      "Default Unit Value": 100,
      Active: true,
    },
    {
      Name: "Sacha",
      Code: "SACHA",
      Category: "PARTNER",
      "Revenue Trigger": "SIGNED_DEAL",
      "Revenue Type": "ONE_SHOT",
      Active: true,
    },
    {
      Name: "Calymia",
      Code: "CALYMIA",
      Category: "OWNED",
      "Revenue Trigger": "SUBSCRIPTION_STARTED",
      "Revenue Type": "MRR",
      Active: true,
    },
    {
      Name: "KLS3 Notaires",
      Code: "KLS3_NOTAIRES",
      Category: "OWNED",
      "Revenue Trigger": "SIGNED_PROJECT",
      "Revenue Type": "PROJECT",
      Active: true,
    },
  ];

  for (const businessLine of businessLines) {
    if (existingCodes.has(businessLine.Code)) {
      console.log(`⏭ ${businessLine.Name} existe déjà`);
      continue;
    }

    await createRecord(
      businessLinesTable.id,
      businessLine
    );

    console.log(`✓ ${businessLine.Name}`);
  }

  console.log("\nSeed BUSINESS_LINES terminé.");
}

main().catch((error) => {
  console.error("\n❌ Erreur :", error.message);
  process.exit(1);
});
