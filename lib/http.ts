import { z } from "zod";

import { env } from "@/lib/env";

type FetchJsonOptions<TSchema extends z.ZodTypeAny> = {
  schema: TSchema;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

export class HttpError extends Error {
  constructor(
    message: string,
    readonly details?: {
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function fetchJson<TSchema extends z.ZodTypeAny>(
  url: string,
  options: FetchJsonOptions<TSchema>
): Promise<z.infer<TSchema>> {
  const {
    schema,
    method = "GET",
    headers,
    body,
    timeoutMs = env.HTTP_TIMEOUT_MS,
    retries = env.HTTP_RETRY_COUNT,
    retryDelayMs = 300,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const payload = await response.text();
        throw new HttpError(
          `Request failed with status ${response.status} for ${url}. Response: ${truncate(payload)}`,
          {
            status: response.status,
            url,
          }
        );
      }

      const raw = (await response.json()) as unknown;
      const parsed = schema.safeParse(raw);

      if (!parsed.success) {
        throw new HttpError(
          `Invalid JSON payload from ${url}. ${parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
          {
            url,
            cause: parsed.error,
          }
        );
      }

      return parsed.data;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt === retries || !isRetryable(error)) {
        if (error instanceof HttpError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new HttpError(`Request timed out after ${timeoutMs}ms for ${url}`, {
            url,
            cause: error,
          });
        }

        throw new HttpError(`Request failed for ${url}`, {
          url,
          cause: error,
        });
      }

      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  throw new HttpError(`Request failed for ${url}`, {
    url,
    cause: lastError,
  });
}

function isRetryable(error: unknown) {
  if (error instanceof HttpError) {
    return error.details?.status !== undefined && error.details.status >= 500;
  }

  if (error instanceof Error) {
    return ["AbortError", "TypeError"].includes(error.name);
  }

  return false;
}

function truncate(value: string, limit = 240) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
