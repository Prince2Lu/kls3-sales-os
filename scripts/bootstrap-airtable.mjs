import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  throw new Error(".env.local introuvable");
}

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
  throw new Error(
    "AIRTABLE_TOKEN ou AIRTABLE_BASE_ID manquant dans .env.local"
  );
}

const API = "https://api.airtable.com/v0";

async function airtableRequest(url, options = {}) {
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
    console.error(body);
    throw new Error(
      `Airtable API error ${response.status}: ${JSON.stringify(body)}`
    );
  }

  return body;
}

async function getSchema() {
  return airtableRequest(
    `${API}/meta/bases/${AIRTABLE_BASE_ID}/tables`
  );
}

async function createField(tableId, field) {
  return airtableRequest(
    `${API}/meta/bases/${AIRTABLE_BASE_ID}/tables/${tableId}/fields`,
    {
      method: "POST",
      body: JSON.stringify(field),
    }
  );
}

function dateField(name) {
  return {
    name,
    type: "date",
    options: {
      dateFormat: {
        name: "local",
      },
    },
  };
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

function linkField(name, linkedTableId) {
  return {
    name,
    type: "multipleRecordLinks",
    options: {
      linkedTableId,
    },
  };
}

async function ensureField(table, field) {
  const exists = table.fields.some((f) => f.name === field.name);

  if (exists) {
    console.log(`  ⏭ ${field.name}`);
    return;
  }

  console.log(`  + ${field.name}`);
  await createField(table.id, field);
}

async function main() {
  console.log("Lecture du schéma...\n");

  let schema = await getSchema();

  const tableMap = Object.fromEntries(
    schema.tables.map((table) => [table.name, table])
  );

  const requiredTables = [
    "BUSINESS_LINES",
    "COMPANIES",
    "CONTACTS",
    "OPPORTUNITIES",
    "ACTIVITIES",
    "TASKS",
    "VALUE_EVENTS",
    "GOALS",
    "STAGE_HISTORY",
  ];

  for (const tableName of requiredTables) {
    if (!tableMap[tableName]) {
      throw new Error(`Table manquante : ${tableName}`);
    }
  }

  const relations = {
    CONTACTS: [
      linkField("Company", tableMap.COMPANIES.id),
    ],

    OPPORTUNITIES: [
      linkField("Company", tableMap.COMPANIES.id),
      linkField("Primary Contact", tableMap.CONTACTS.id),
      linkField("Business Line", tableMap.BUSINESS_LINES.id),
      dateField("Expected Close Date"),
      dateTimeField("Won At"),
      dateTimeField("Lost At"),
    ],

    ACTIVITIES: [
      linkField("Opportunity", tableMap.OPPORTUNITIES.id),
      linkField("Contact", tableMap.CONTACTS.id),
      dateTimeField("Date"),
    ],

    TASKS: [
      linkField("Opportunity", tableMap.OPPORTUNITIES.id),
      linkField("Contact", tableMap.CONTACTS.id),
      dateTimeField("Due At"),
      dateTimeField("Completed At"),
    ],

    VALUE_EVENTS: [
      linkField("Opportunity", tableMap.OPPORTUNITIES.id),
      linkField("Contact", tableMap.CONTACTS.id),
      linkField("Business Line", tableMap.BUSINESS_LINES.id),
      dateField("Event Date"),
    ],

    GOALS: [
      linkField("Business Line", tableMap.BUSINESS_LINES.id),
      dateField("Start Date"),
      dateField("End Date"),
    ],

    STAGE_HISTORY: [
      linkField("Opportunity", tableMap.OPPORTUNITIES.id),
      dateTimeField("Changed At"),
    ],
  };

  for (const [tableName, fields] of Object.entries(relations)) {
    console.log(`\n${tableName}`);

    const table = tableMap[tableName];

    for (const field of fields) {
      await ensureField(table, field);
    }
  }

  console.log("\n✓ Relations et dates créées.");

  console.log("\nRelecture du schéma...");
  schema = await getSchema();

  for (const tableName of requiredTables) {
    const table = schema.tables.find((t) => t.name === tableName);

    console.log(
      `✓ ${tableName}: ${table.fields.length} champs`
    );
  }

  console.log("\nPasse 2 terminée.");
}

main().catch((error) => {
  console.error("\n❌ Erreur :", error.message);
  process.exit(1);
});
