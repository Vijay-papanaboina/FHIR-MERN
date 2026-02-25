#!/usr/bin/env tsx
/**
 * Seed the HAPI FHIR server with synthetic patient data from Synthea.
 *
 * Downloads Synthea sample FHIR R4 bundles and POSTs them as
 * transaction bundles to the local HAPI FHIR server.
 *
 * Usage:  npx tsx scripts/seed-fhir.ts
 */

const FHIR_BASE = process.env.FHIR_BASE_URL ?? "http://localhost:8080/fhir";
const PATIENT_COUNT = 5;

// ── Synthea sample data URL ──────────────────────────────────────
// Synthea publishes sample FHIR R4 bundles on GitHub
const SYNTHEA_SAMPLE_URL =
    "https://raw.githubusercontent.com/synthetichealth/synthea-sample-data/master/downloads/latest/fhir_r4/fhir";

interface FhirEntry {
    resource: { resourceType: string; id?: string };
    request?: { method: string; url: string };
}

interface FhirBundle {
    resourceType: string;
    type: string;
    entry?: FhirEntry[];
}

/**
 * Create FHIR transaction bundles manually with realistic patient + vital data.
 * This avoids needing to download large files from GitHub.
 */
function generatePatientBundle(index: number): FhirBundle {
    const patients = [
        { given: "James", family: "Smith", gender: "male", birthDate: "1978-03-15" },
        { given: "Maria", family: "Garcia", gender: "female", birthDate: "1985-07-22" },
        { given: "Robert", family: "Johnson", gender: "male", birthDate: "1962-11-30" },
        { given: "Sarah", family: "Williams", gender: "female", birthDate: "1990-01-08" },
        { given: "David", family: "Chen", gender: "male", birthDate: "1955-09-14" },
    ];

    const p = patients[index]!;
    const patientId = `synthea-patient-${index + 1}`;

    // Generate vitals over the past 6 months
    const vitals: FhirEntry[] = [];
    const vitalTypes = [
        { code: "8867-4", display: "Heart rate", unit: "beats/minute", unitCode: "/min", range: [60, 100] },
        { code: "8310-5", display: "Body temperature", unit: "°C", unitCode: "Cel", range: [36.1, 37.5] },
        { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", range: [110, 140] },
        { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg", unitCode: "mm[Hg]", range: [60, 90] },
        { code: "9279-1", display: "Respiratory rate", unit: "breaths/minute", unitCode: "/min", range: [12, 20] },
        { code: "2708-6", display: "Oxygen saturation", unit: "%", unitCode: "%", range: [95, 100] },
    ];

    for (let month = 5; month >= 0; month--) {
        const date = new Date();
        date.setMonth(date.getMonth() - month);
        date.setDate(Math.floor(Math.random() * 28) + 1);
        const effectiveDateTime = date.toISOString();

        for (const vt of vitalTypes) {
            const value = +(vt.range[0]! + Math.random() * (vt.range[1]! - vt.range[0]!)).toFixed(1);
            const obsId = `synthea-obs-${patientId}-${vt.code}-${month}`;

            vitals.push({
                resource: {
                    resourceType: "Observation",
                    id: obsId,
                    status: "final",
                    category: [
                        {
                            coding: [
                                {
                                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                                    code: "vital-signs",
                                    display: "Vital Signs",
                                },
                            ],
                        },
                    ],
                    code: {
                        coding: [
                            {
                                system: "http://loinc.org",
                                code: vt.code,
                                display: vt.display,
                            },
                        ],
                        text: vt.display,
                    },
                    subject: { reference: `Patient/${patientId}` },
                    effectiveDateTime,
                    valueQuantity: {
                        value,
                        unit: vt.unit,
                        system: "http://unitsofmeasure.org",
                        code: vt.unitCode,
                    },
                } as unknown as FhirEntry["resource"],
                request: {
                    method: "PUT",
                    url: `Observation/${obsId}`,
                },
            });
        }
    }

    return {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
            {
                resource: {
                    resourceType: "Patient",
                    id: patientId,
                    name: [{ use: "official", family: p.family, given: [p.given] }],
                    gender: p.gender,
                    birthDate: p.birthDate,
                } as unknown as FhirEntry["resource"],
                request: {
                    method: "PUT",
                    url: `Patient/${patientId}`,
                },
            },
            ...vitals,
        ],
    };
}

async function postBundle(bundle: FhirBundle): Promise<void> {
    const res = await fetch(FHIR_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify(bundle),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`FHIR server returned ${res.status}: ${text.slice(0, 200)}`);
    }
}

async function main() {
    console.log(`🏥 Seeding FHIR server at ${FHIR_BASE}`);
    console.log(`   Generating ${PATIENT_COUNT} patients with 6 months of vitals...\n`);

    for (let i = 0; i < PATIENT_COUNT; i++) {
        const bundle = generatePatientBundle(i);
        const entryCount = bundle.entry?.length ?? 0;
        const patientName = `Patient ${i + 1}`;

        process.stdout.write(`  → ${patientName} (${entryCount} resources)... `);
        await postBundle(bundle);
        console.log("✅");
    }

    console.log(`\n✅ Seeded ${PATIENT_COUNT} patients with vitals.`);
    console.log(`   Search for "Smith", "Garcia", "Johnson", "Williams", or "Chen" in the app.`);
}

main().catch((err) => {
    console.error("\n❌ Seed failed:", err.message);
    process.exit(1);
});
