import { promises as fs } from "node:fs";
import { basename } from "node:path";

import { RagenError } from "../errors";
import type {
  FileDeletedResponse,
  FileListParams,
  FileListResponse,
  FileObject,
  FileUploadParams,
  WaitUntilProcessedOptions,
} from "../types";
import { performRequest, readJson, sleep, type FetchClientConfig } from "../utils";

export type {
  FileDeletedResponse,
  FileListParams,
  FileListResponse,
  FileObject,
  FileStatus,
  FileUploadParams,
  WaitUntilProcessedOptions,
} from "../types";

/**
 * Anything we know how to turn into a multipart `file` field:
 *  - a path string (Node only)
 *  - a `Blob` / `File`
 *  - a Node `Buffer` or `Uint8Array`
 */
export type UploadFileInput = string | Blob | Uint8Array | ArrayBuffer;

interface FilesResourceConfig {
  http: FetchClientConfig;
}

/** `files` resource — upload, list, retrieve, and delete knowledge-base files. */
export class Files {
  constructor(private readonly config: FilesResourceConfig) {}

  /**
   * Upload a file to the project knowledge base.
   *
   * - Pass a path string (Node) and the file is read from disk.
   * - Pass a `Blob`/`Uint8Array`/`ArrayBuffer` (browser/edge) and supply
   *   `params.filename` for a sensible filename.
   */
  async upload(
    file: UploadFileInput,
    params: FileUploadParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<FileObject> {
    const formData = new FormData();
    const { blob, filename } = await toBlob(file, params.filename);
    formData.append("file", blob, filename);
    formData.append("purpose", params.purpose ?? "knowledge_base");

    const response = await performRequest(this.config.http, {
      method: "POST",
      path: "/files",
      formData,
      signal: options?.signal,
    });
    return readJson<FileObject>(response);
  }

  /** List files. */
  async list(
    params: FileListParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<FileListResponse> {
    const response = await performRequest(this.config.http, {
      method: "GET",
      path: "/files",
      query: {
        limit: params.limit,
        after: params.after,
        purpose: params.purpose,
      },
      signal: options?.signal,
    });
    return readJson<FileListResponse>(response);
  }

  /** Retrieve a single file. */
  async retrieve(id: string, options?: { signal?: AbortSignal }): Promise<FileObject> {
    const response = await performRequest(this.config.http, {
      method: "GET",
      path: `/files/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
    return readJson<FileObject>(response);
  }

  /** Delete a file and its embeddings. */
  async delete(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<FileDeletedResponse> {
    const response = await performRequest(this.config.http, {
      method: "DELETE",
      path: `/files/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
    return readJson<FileDeletedResponse>(response);
  }

  /**
   * Poll `GET /files/{id}` until the file's status is `processed`.
   *
   * Resolves with the final `FileObject`. Rejects with a `RagenError` if the
   * file enters the `error` state, or if `timeout` is exceeded.
   */
  async waitUntilProcessed(
    id: string,
    options: WaitUntilProcessedOptions & { signal?: AbortSignal } = {},
  ): Promise<FileObject> {
    const timeout = options.timeout ?? 300_000;
    const maxInterval = options.maxPollInterval ?? 10_000;
    let interval = options.pollInterval ?? 1_000;
    const start = Date.now();

    while (true) {
      const file = await this.retrieve(id, { signal: options.signal });
      if (file.status === "processed") return file;
      if (file.status === "error") {
        throw new RagenError(
          `File ${id} failed processing${file.status_details ? `: ${file.status_details}` : ""}`,
          { status: 0, type: "file_processing_error", code: "processing_failed" },
        );
      }
      if (Date.now() - start >= timeout) {
        throw new RagenError(
          `Timed out waiting for file ${id} to finish processing`,
          { status: 0, type: "timeout" },
        );
      }
      await sleep(interval);
      interval = Math.min(interval * 2, maxInterval);
    }
  }

  /** Convenience: upload a file and wait for processing in one call. */
  async uploadAndWait(
    file: UploadFileInput,
    params: FileUploadParams = {},
    waitOptions?: WaitUntilProcessedOptions & { signal?: AbortSignal },
  ): Promise<FileObject> {
    const uploaded = await this.upload(file, params, { signal: waitOptions?.signal });
    return this.waitUntilProcessed(uploaded.id, waitOptions);
  }
}

async function toBlob(
  input: UploadFileInput,
  filename?: string,
): Promise<{ blob: Blob; filename: string }> {
  if (typeof input === "string") {
    const data = await fs.readFile(input);
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    return {
      blob: new Blob([arrayBuffer]),
      filename: filename ?? basename(input),
    };
  }
  if (input instanceof Blob) {
    const fname =
      filename ??
      ("name" in input && typeof (input as File).name === "string"
        ? (input as File).name
        : "upload");
    return { blob: input, filename: fname };
  }
  if (input instanceof Uint8Array) {
    const ab = input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer;
    return {
      blob: new Blob([ab]),
      filename: filename ?? "upload",
    };
  }
  if (input instanceof ArrayBuffer) {
    return {
      blob: new Blob([input]),
      filename: filename ?? "upload",
    };
  }
  throw new RagenError("Unsupported file input type for upload()", {
    status: 0,
    type: "invalid_request_error",
    param: "file",
  });
}
