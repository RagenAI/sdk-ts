import { describe, expect, it } from "vitest";

import { Ragen } from "../src";
import { makeFetchMock, mockResponse, sseStream } from "./helpers";

function chunk(content: string, finish: string | null = null): string {
  return `data: ${JSON.stringify({
    id: "c",
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-5.4",
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: finish,
      },
    ],
  })}`;
}

function usageChunk(): string {
  return `data: ${JSON.stringify({
    id: "c",
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-5.4",
    choices: [],
    usage: { prompt_tokens: 1, completion_tokens: 5, total_tokens: 6 },
  })}`;
}

describe("chat.completions.stream", () => {
  it("parses SSE chunks and terminates on [DONE]", async () => {
    const sse = sseStream([
      chunk("Hello"),
      chunk(", world"),
      chunk("!", "stop"),
      "data: [DONE]",
    ]);
    const { fetch } = makeFetchMock([mockResponse({ raw: sse })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });

    const out = await ragen.chat.completions.streamToString({
      assistantId: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out).toBe("Hello, world!");
  });

  it("yields a usage chunk when stream_options.include_usage is true", async () => {
    const sse = sseStream([chunk("hi", "stop"), usageChunk(), "data: [DONE]"]);
    const { fetch, calls } = makeFetchMock([mockResponse({ raw: sse })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });

    const stream = ragen.chat.completions.stream({
      assistantId: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hi" }],
      stream_options: { include_usage: true },
    });

    const collected: { content?: string; usage?: number }[] = [];
    for await (const ck of stream) {
      collected.push({
        content: ck.choices[0]?.delta?.content,
        usage: ck.usage?.total_tokens,
      });
    }
    expect(collected).toEqual([
      { content: "hi", usage: undefined },
      { content: undefined, usage: 6 },
    ]);

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("handles chunks split across multiple network reads", async () => {
    const encoder = new TextEncoder();
    const events = [chunk("foo"), chunk("bar", "stop"), "data: [DONE]"];
    const full = sseStream(events);
    // Split bytes mid-payload to simulate partial reads.
    const parts = [full.slice(0, 10), full.slice(10, 35), full.slice(35)];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const p of parts) controller.enqueue(encoder.encode(p));
        controller.close();
      },
    });
    const { fetch } = makeFetchMock([mockResponse({ raw: stream })]);
    const ragen = new Ragen({ apiKey: "sk_test", fetch });

    const out = await ragen.chat.completions.streamToString({
      assistantId: "22222222-2222-4222-8222-222222222222",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out).toBe("foobar");
  });
});
