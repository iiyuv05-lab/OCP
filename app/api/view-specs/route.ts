import { viewSpecs } from "../../view-specs";

export async function GET() {
  return Response.json({ version: "0.1", viewSpecs: Object.values(viewSpecs), invariant: "Canonical Graph + ViewSpec + valid/recorded time → ephemeral layout" });
}
