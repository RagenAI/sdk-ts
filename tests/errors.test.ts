import { describe, expect, it } from "vitest";

import { Ragen, RagenAPIError, RagenNotFoundError, RagenRateLimitError } from "../src";
import { makeFetchMock, mockResponse } from "./helpers";

const assistantId = "11111111-1111-4111-8111-111111111111";

function client(response: Response) {
  const { fetch, calls } = makeFetchMock([response]);
  // maxRetries: 0 — 429/5xx are retried by default and these bodies are
  // one-shot mocks.
  return {
    ragen: new Ragen({ apiKey: "sk_test", fetch, maxRetries: 0 }),
    calls,
  };
}

/**
 * `/v1/chat` runs without OpenAiExceptionFilter, so it answers in three
 * shapes that are not the OpenAI envelope. Reading only `error.message`
 * dropped every one of them and surfaced the generic fallback instead.
 */
describe("native chat error bodies", () => {
  it("reads ChatService's { error: string, code } 404", async () => {
    const { ragen } = client(
      mockResponse({
        status: 404,
        body: { error: "Assistant not found", code: 404 },
      }),
    );

    await expect(ragen.chat.send({ assistantId, content: "Hi" })).rejects.toThrow(
      "Assistant not found",
    );
  });

  it("still selects the subclass by status", async () => {
    const { ragen } = client(
      mockResponse({ status: 404, body: { error: "Assistant not found" } }),
    );

    await expect(ragen.chat.send({ assistantId, content: "Hi" })).rejects.toBeInstanceOf(
      RagenNotFoundError,
    );
  });

  it("reads Nest's { message } shape", async () => {
    const { ragen } = client(
      mockResponse({
        status: 429,
        body: { message: "Monthly API request limit exceeded" },
      }),
    );

    const error = await ragen.chat
      .send({ assistantId, content: "Hi" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RagenRateLimitError);
    expect((error as Error).message).toBe("Monthly API request limit exceeded");
  });

  it("joins the validation pipe's message array instead of showing one violation", async () => {
    const { ragen } = client(
      mockResponse({
        status: 400,
        body: {
          message: [
            "content must be shorter than 10000 characters",
            "assistant_id should not be empty",
          ],
          error: "Bad Request",
          statusCode: 400,
        },
      }),
    );

    const error = await ragen.chat
      .send({ assistantId, content: "Hi" })
      .catch((e: unknown) => e);

    expect((error as Error).message).toContain("content must be shorter");
    expect((error as Error).message).toContain("assistant_id should not be empty");
  });

  it("falls back to the raw text of a non-JSON 500", async () => {
    const { ragen } = client(mockResponse({ status: 500, raw: "Internal Server Error" }));

    const error = await ragen.chat
      .send({ assistantId, content: "Hi" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RagenAPIError);
    expect((error as Error).message).toBe("Internal Server Error");
  });

  it("uses the generic fallback only when the body carries nothing", async () => {
    const { ragen } = client(mockResponse({ status: 500, raw: "" }));

    await expect(ragen.chat.send({ assistantId, content: "Hi" })).rejects.toThrow(
      /status 500/,
    );
  });
});

describe("OpenAI-envelope error bodies still work", () => {
  it("keeps message, type, code and param from the OpenAI shape", async () => {
    const { ragen } = client(
      mockResponse({
        status: 400,
        body: {
          error: {
            message: "prompt too long",
            type: "invalid_request_error",
            code: "context_length_exceeded",
            param: "messages",
          },
        },
      }),
    );

    const error = await ragen.chat.completions
      .create({ assistantId, messages: [{ role: "user", content: "Hi" }] })
      .catch((e: unknown) => e);

    expect((error as Error).message).toBe("prompt too long");
    expect(error).toMatchObject({
      type: "invalid_request_error",
      code: "context_length_exceeded",
      param: "messages",
      status: 400,
    });
  });

  it("prefers the OpenAI envelope over a sibling message field", async () => {
    const { ragen } = client(
      mockResponse({
        status: 404,
        body: {
          error: { message: "File not found", type: "not_found_error" },
          message: "Not Found",
        },
      }),
    );

    await expect(ragen.files.retrieve("file-x")).rejects.toThrow("File not found");
  });
});
