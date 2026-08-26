import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "collaboration-packet.schema.json");
const fixturePath = path.join(here, "collaboration-pilot-01.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText);

const failures = [];

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`Unsupported ref: ${ref}`);
  return ref.slice(2).split("/").reduce((value, key) => value[key.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function isType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function validate(nodeSchema, value, at) {
  if (nodeSchema.$ref) return validate(resolveRef(schema, nodeSchema.$ref), value, at);

  if (Object.hasOwn(nodeSchema, "const") && value !== nodeSchema.const) {
    failures.push(`${at}: expected const ${JSON.stringify(nodeSchema.const)}`);
  }

  if (nodeSchema.enum && !nodeSchema.enum.includes(value)) {
    failures.push(`${at}: value ${JSON.stringify(value)} not in enum`);
  }

  if (nodeSchema.type) {
    const types = Array.isArray(nodeSchema.type) ? nodeSchema.type : [nodeSchema.type];
    if (!types.some((type) => isType(value, type))) {
      failures.push(`${at}: expected ${types.join("|")}`);
      return;
    }
  }

  if (typeof value === "string") {
    if (nodeSchema.minLength && value.length < nodeSchema.minLength) failures.push(`${at}: shorter than minLength`);
    if (nodeSchema.pattern && !new RegExp(nodeSchema.pattern).test(value)) failures.push(`${at}: pattern mismatch`);
    if (nodeSchema.format === "date-time" && Number.isNaN(Date.parse(value))) failures.push(`${at}: invalid date-time`);
  }

  if (Array.isArray(value)) {
    if (nodeSchema.minItems && value.length < nodeSchema.minItems) failures.push(`${at}: shorter than minItems`);
    if (nodeSchema.items) value.forEach((item, index) => validate(nodeSchema.items, item, `${at}[${index}]`));
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of nodeSchema.required ?? []) {
      if (!Object.hasOwn(value, required)) failures.push(`${at}: missing required property ${required}`);
    }
    const properties = nodeSchema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validate(properties[key], child, `${at}.${key}`);
      else if (nodeSchema.additionalProperties === false) failures.push(`${at}: unexpected property ${key}`);
    }
  }
}

validate(schema, fixture, "$fixture");

const secretSignals = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:password|passwd|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)\s*[:=]\s*[^\s"']+/i
];

for (const signal of secretSignals) {
  if (signal.test(fixtureText)) failures.push(`privacy: public fixture matches ${signal}`);
}

const candidateIds = new Set();
for (const candidate of fixture.candidates ?? []) {
  if (candidateIds.has(candidate.id)) failures.push(`candidate id duplicated: ${candidate.id}`);
  candidateIds.add(candidate.id);
}

const questionIds = new Set();
for (const question of fixture.questions ?? []) {
  if (questionIds.has(question.id)) failures.push(`question id duplicated: ${question.id}`);
  questionIds.add(question.id);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`PASS collaboration packet ${fixture.packet.id}: ${candidateIds.size} candidates, ${questionIds.size} questions`);
