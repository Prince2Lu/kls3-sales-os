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
  throw new Error("AIRTABLE_TOKEN ou AIRTABLE_BASE_ID manquant");
}

const API = "https://api.airtable.com/v0";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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
  return request(`${API}/meta/bases/${baseId}/tables`);
}

async function createField(tableId, field) {
  return request(
    `${API}/meta/bases/${baseId}/tables/${tableId}/fields`,
    {
      method: "POST",
      body: JSON.stringify(field),
    }
  );
}

function dateTimeField(name) {
  return {
    name,
    type: "dateTime",
    options: {
      dateFormat: {
        name: "local",
      },
      timeFormat: {
        name: "24hour",
      },
      timeZone: "Europe/Paris",
    },
  };
}

async function ensureField(table, field) {
  if (table.fields.some((f) => f.name === field.name)) {
    console.log(`  ⏭ ${field.name} existe déjà`);
    return;
  }

  await createField(table.id, field);
  console.log(`  ✓ ${field.name}`);
}

async function main() {
  console.log("\nFinalisation du schéma Airtable...\n");

  const schema = await getSchema();

  const tables = Object.fromEntries(
    schema.tables.map((table) => [table.name, table])
  );

  const config = {
    COMPANIES: [
      dateTimeField("Created At"),
      dateTimeField("Updated At"),
    ],

    CONTACTS: [
      dateTimeField("Created At"),
      dateTimeField("Updated At"),
    ],

    OPPORTUNITIES: [
      dateTimeField("Created At"),
      dateTimeField("Updated At"),
    ],

    ACTIVITIES: [
      dateTimeField("Created At"),
    ],

    TASKS: [
      dateTimeField("Created At"),
    ],

    VALUE_EVENTS: [
      dateTimeField("Created At"),
    ],
  };

  for (const [tableName, fields] of Object.entries(config)) {
    const table = tables[tableName];

    if (!table) {
      throw new Error(`Table ${tableName} introuvable`);
    }

    console.log(`[${tableName}]`);

    for (const field of fields) {
      await ensureField(table, field);
    }

    console.log("");
  }

  console.log("✓ Finalisation terminée.");
  console.log(
    "Les timestamps seront alimentés automatiquement par l'application."
  );
}

main().catch((error) => {
  console.error("\n❌ Erreur :", error.message);
  process.exit(1);
});
