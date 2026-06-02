import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http";
import { analyzeTicker } from "@/services/analysis/analyzeTicker";

export const runtime = "nodejs";

const querySchema = z.object({
  symbols: z
    .string()
    .min(1, "symbols query parameter is required")
    .transform((value) =>
      value
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean)
    )
    .refine((symbols) => symbols.length >= 1, "At least one symbol is required")
    .refine((symbols) => symbols.length <= 5, "Up to 5 symbols are supported"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      symbols: searchParams.get("symbols") ?? "",
    });

    const analyses = await Promise.all(parsed.symbols.map((symbol) => analyzeTicker(symbol)));

    return NextResponse.json({
      symbols: parsed.symbols,
      results: analyses.map((analysis) => ({
        symbol: analysis.symbol,
        generatedAt: analysis.generatedAt,
        cached: analysis.cached,
        sentimentScore: analysis.sentiment.sentimentScore,
        confidenceScore: analysis.sentiment.confidenceScore,
        fundamentalsQualityScore: analysis.fundamentals.fundamentalsQualityScore,
        combinedScore: analysis.combined.combinedScore,
        label: analysis.combined.label,
        summary: analysis.summary,
        optionsScore: analysis.options.optionsScore,
        putCallRatio: analysis.options.putCallRatio,
        price: analysis.quote?.price ?? null,
      })),
    });
  } catch (error) {
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
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status:
            error instanceof HttpError
              ? error.details?.status ?? inferHttpStatus(error.message)
              : inferHttpStatus(error.message),
        }
      );
    }

    return NextResponse.json(
      {
        error: "Unknown server error",
      },
      { status: 500 }
    );
  }
}

function inferHttpStatus(message: string) {
  if (message.includes("not configured")) {
    return 503;
  }

  if (message.includes("Unable to retrieve sentiment data")) {
    return 502;
  }

  return 500;
}
