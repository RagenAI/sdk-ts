import { describe, expect, it, vi } from "vitest";

import { Ragen, RagenError } from "../src";
import { makeFetchMock, mockResponse } from "./helpers";

function fileObj(status: "uploaded" | "processed" | "error" = "uploaded") {
  return {
    id: "file_1",
    object: "file",
    bytes: 100,
    created_at: 1,
    filename: "doc.pdf",
    purpose: "knowledge_base",
    status,
    status_details: null,
  };
}

describe("files.upload", () => {
  it("sends multipart/form-data with file and purpose", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: fileObj() })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });

    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    const result = await ragen.files.upload(blob, { filename: "doc.pdf" });
    expect(result.id).toBe("file_1");

    const call = calls[0]!;
    expect(call.url).toBe("https://api.ragen.ai/v1/files");
    expect(call.init.method).toBe("POST");
    expect(call.init.body).toBeInstanceOf(FormData);
    const fd = call.init.body as FormData;
    expect(fd.get("purpose")).toBe("knowledge_base");
    const f = fd.get("file");
    expect(f).toBeInstanceOf(Blob);
    // The Authorization header should be set; Content-Type must NOT be set
    // (fetch fills it in with the boundary).
    const headers = call.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test");
    expect(headers["Content-Type"]).toBeUndefined();
  });
});

describe("files.list / retrieve / delete", () => {
  it("list passes query params", async () => {
    const { fetch, calls } = makeFetchMock([
      mockResponse({ body: { object: "list", data: [fileObj()] } }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await ragen.files.list({ limit: 50, after: "file_x", purpose: "knowledge_base" });
    expect(calls[0]!.url).toBe(
      "https://api.ragen.ai/v1/files?limit=50&after=file_x&purpose=knowledge_base",
    );
  });

  it("retrieve hits /files/{id}", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: fileObj() })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await ragen.files.retrieve("file_1");
    expect(calls[0]!.url).toBe("https://api.ragen.ai/v1/files/file_1");
  });

  it("delete returns the deleted envelope", async () => {
    const { fetch } = makeFetchMock([
      mockResponse({ body: { id: "file_1", object: "file", deleted: true } }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    const out = await ragen.files.delete("file_1");
    expect(out.deleted).toBe(true);
  });
});

describe("files.waitUntilProcessed", () => {
  it("polls until status is processed", async () => {
    const { fetch, calls } = makeFetchMock([
      mockResponse({ body: fileObj("uploaded") }),
      mockResponse({ body: fileObj("uploaded") }),
      mockResponse({ body: fileObj("processed") }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    const out = await ragen.files.waitUntilProcessed("file_1", { pollInterval: 1 });
    expect(out.status).toBe("processed");
    expect(calls).toHaveLength(3);
  });

  it("throws if status becomes error", async () => {
    const { fetch } = makeFetchMock([mockResponse({ body: fileObj("error") })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await expect(
      ragen.files.waitUntilProcessed("file_1", { pollInterval: 1 }),
    ).rejects.toBeInstanceOf(RagenError);
  });

  it("times out", async () => {
    let calls = 0;
    const responder = (): Response =>
      mockResponse({ body: fileObj("uploaded") }) as Response;
    const fetchMock = vi.fn(async () => {
      calls++;
      return responder();
    });
    const ragen = new Ragen({
      apiKey: "sk_test",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      ragen.files.waitUntilProcessed("file_1", { pollInterval: 1, timeout: 5 }),
    ).rejects.toThrow(/Timed out/);
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});
