import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http";
import { analyzeTicker } from "@/services/analysis/analyzeTicker";

export const runtime = "nodejs";

const paramsSchema = z.object({
  symbol: z.string().min(1),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const analysis = await analyzeTicker(params.symbol);

    return NextResponse.json(analysis);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Invalid input",
        issues: error.issues,
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    const status =
      error instanceof HttpError
        ? error.details?.status ?? inferHttpStatus(error.message)
        : inferHttpStatus(error.message);

    return NextResponse.json(
      {
        error: error.message,
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      error: "Unknown server error",
    },
    { status: 500 }
  );
}

function inferHttpStatus(message: string) {
  if (message.includes("Unable to retrieve sentiment data")) {
    return 502;
  }

  if (message.includes("not configured")) {
    return 503;
  }

  return 500;
}
