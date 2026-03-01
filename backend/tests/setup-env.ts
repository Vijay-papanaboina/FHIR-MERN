import dotenv from "dotenv";

// Prefer workspace-local .env; fall back to repo-root execution.
dotenv.config();
if (!process.env["FHIR_SECRET"]) {
  dotenv.config({ path: "backend/.env" });
}
