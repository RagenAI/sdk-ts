import { RagenError } from "./errors";
import type { ChatCompletionChunk } from "./types";

/**
 * Convert a Server-Sent Events response body into an async iterable of
 * `ChatCompletionChunk` objects. Terminates on `data: [DONE]`.
 */
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<ChatCompletionChunk, void, void> {
  if (!response.body) {
    throw new RagenError("Streaming response has no body", {
      status: response.status,
      type: "api_error",
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines (\n\n). Process complete events
      // and keep any partial trailing event in `buffer`.
      let separatorIndex: number;
      while ((separatorIndex = indexOfDoubleNewline(buffer)) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + (buffer[separatorIndex] === "\r" ? 4 : 2));
        const chunk = parseEvent(rawEvent);
        if (chunk === "DONE") return;
        if (chunk !== null) yield chunk;
      }
    }
    // Flush any final event without trailing blank line.
    const tail = buffer.trim();
    if (tail) {
      const chunk = parseEvent(tail);
      if (chunk !== "DONE" && chunk !== null) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

function indexOfDoubleNewline(buffer: string): number {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

function parseEvent(raw: string): ChatCompletionChunk | "DONE" | null {
  const lines = raw.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) return null;
  const payload = dataLines.join("\n");
  if (payload === "[DONE]") return "DONE";
  try {
    return JSON.parse(payload) as ChatCompletionChunk;
  } catch {
    return null;
  }
}
