import { describe, expect, it } from "vitest";

import {
  Ragen,
  RagenAuthError,
  RagenError,
  RagenRateLimitError,
} from "../src";
import { makeFetchMock, mockResponse } from "./helpers";

const completion = {
  id: "chatcmpl-1",
  object: "chat.completion",
  created: 1,
  model: "gpt-5.4",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hi" },
      finish_reason: "stop",
      logprobs: null,
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

describe("chat.completions.create", () => {
  it("sends assistant_id and messages and parses the response", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: completion })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });

    const result = await ragen.chat.completions.create({
      assistantId: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hello" }],
      temperature: 0.5,
      max_tokens: 100,
    });

    expect(result.choices[0].message.content).toBe("hi");
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe("https://api.ragen.ai/v1/chat/completions");
    expect(call.init.method).toBe("POST");
    const body = JSON.parse(call.init.body as string);
    expect(body).toEqual({
      assistant_id: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hello" }],
      stream: false,
      temperature: 0.5,
      max_tokens: 100,
    });
    const headers = call.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test");
  });

  it("uses the default assistantId from the client", async () => {
    const { fetch, calls } = makeFetchMock([mockResponse({ body: completion })]);
    const ragen = new Ragen({
      apiKey: "sk_test",
      assistantId: "33333333-3333-4333-8333-333333333333",
      fetch,
    });

    await ragen.chat.completions.create({
      messages: [{ role: "user", content: "hi" }],
    });

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.assistant_id).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("throws if no assistantId provided", async () => {
    const { fetch } = makeFetchMock([]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });
    await expect(
      ragen.chat.completions.create({
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toBeInstanceOf(RagenError);
  });

  it("throws RagenAuthError on 401", async () => {
    const { fetch } = makeFetchMock([
      mockResponse({
        status: 401,
        body: {
          error: {
            message: "bad key",
            type: "invalid_request_error",
            code: "invalid_api_key",
            param: null,
          },
        },
      }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch, maxRetries: 0 });
    await expect(
      ragen.chat.completions.create({
        assistantId: "22222222-2222-4222-8222-222222222222",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toBeInstanceOf(RagenAuthError);
  });

  it("retries on 429 and eventually throws RagenRateLimitError", async () => {
    const errBody = {
      error: { message: "rate", type: "rate_limit", code: null, param: null },
    };
    const { fetch, calls } = makeFetchMock([
      mockResponse({ status: 429, body: errBody }),
      mockResponse({ status: 429, body: errBody }),
      mockResponse({ status: 429, body: errBody }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch, maxRetries: 2 });
    await expect(
      ragen.chat.completions.create({
        assistantId: "22222222-2222-4222-8222-222222222222",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toBeInstanceOf(RagenRateLimitError);
    expect(calls).toHaveLength(3);
  });

  it("retries on 500 then succeeds", async () => {
    const { fetch, calls } = makeFetchMock([
      mockResponse({
        status: 500,
        body: {
          error: { message: "boom", type: "api_error", code: null, param: null },
        },
      }),
      mockResponse({ body: completion }),
    ]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch, maxRetries: 2 });
    const out = await ragen.chat.completions.create({
      assistantId: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.id).toBe("chatcmpl-1");
    expect(calls).toHaveLength(2);
  });
});
