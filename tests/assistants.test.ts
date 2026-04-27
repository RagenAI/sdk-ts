import { describe, expect, it } from "vitest";

import { Ragen } from "../src";
import { makeFetchMock, mockResponse } from "./helpers";

const assistant = {
  id: "22222222-2222-4222-8222-222222222222",
  object: "assistant",
  created_at: 1,
  name: "Support",
  instructions: "Be concise.",
};

describe("assistants", () => {
  it("create posts JSON to /assistants", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: assistant })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    const out = await ragen.assistants.create({
      name: "Support",
      instructions: "Be concise.",
    });
    expect(out.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(calls[0]!.url).toBe("https://api.ragen.ai/v1/assistants");
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      name: "Support",
      instructions: "Be concise.",
    });
  });

  it("list returns list response", async () => {
    const { fetch } = makeFetchMock([
      mockResponse({ body: { object: "list", data: [assistant] } }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    const out = await ragen.assistants.list();
    expect(out.data).toHaveLength(1);
  });

  it("retrieve hits /assistants/{id}", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: assistant })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await ragen.assistants.retrieve("22222222-2222-4222-8222-222222222222");
    expect(calls[0]!.url).toBe(
      "https://api.ragen.ai/v1/assistants/22222222-2222-4222-8222-222222222222",
    );
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("update sends POST to /assistants/{id}", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: assistant })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await ragen.assistants.update("22222222-2222-4222-8222-222222222222", {
      name: "Renamed",
    });
    expect(calls[0]!.url).toBe(
      "https://api.ragen.ai/v1/assistants/22222222-2222-4222-8222-222222222222",
    );
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ name: "Renamed" });
  });

  it("delete returns delete envelope", async () => {
    const { fetch } = makeFetchMock([
      mockResponse({
        body: {
          id: "22222222-2222-4222-8222-222222222222",
          object: "assistant.deleted",
          deleted: true,
        },
      }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    const out = await ragen.assistants.delete("22222222-2222-4222-8222-222222222222");
    expect(out.deleted).toBe(true);
    expect(out.object).toBe("assistant.deleted");
  });
});
