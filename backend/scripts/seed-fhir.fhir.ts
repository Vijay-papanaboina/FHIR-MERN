export interface BundleEntry {
  resource: Record<string, unknown>;
  request: { method: "PUT"; url: string };
}

const postTransaction = async (
  fhirBaseUrl: string,
  fhirSecret: string,
  entries: BundleEntry[],
): Promise<void> => {
  if (entries.length === 0) return;

  const res = await fetch(fhirBaseUrl, {
    method: "POST",
    headers: {
      Accept: "application/fhir+json",
      "Content-Type": "application/fhir+json",
      "X-FHIR-Secret": fhirSecret,
    },
    body: JSON.stringify({
      resourceType: "Bundle",
      type: "transaction",
      entry: entries,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `FHIR transaction failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }
};

export const postTransactionInChunks = async (
  fhirBaseUrl: string,
  fhirSecret: string,
  entries: BundleEntry[],
  chunkSize = 120,
): Promise<void> => {
  for (let i = 0; i < entries.length; i += chunkSize) {
    await postTransaction(
      fhirBaseUrl,
      fhirSecret,
      entries.slice(i, i + chunkSize),
    );
  }
};

export const toPutEntry = (resource: Record<string, unknown>): BundleEntry => {
  const type = String(resource.resourceType ?? "");
  const id = String(resource.id ?? "");
  if (!type || !id) throw new Error("Resource missing resourceType/id");
  return {
    resource,
    request: { method: "PUT", url: `${type}/${id}` },
  };
};
