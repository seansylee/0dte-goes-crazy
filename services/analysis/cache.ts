import { CACHE_TTL_MS } from "@/lib/config/scoring";
import { prisma } from "@/lib/prisma";

export async function getCachedProviderPayload<T>(
  symbol: string,
  provider: string
) {
  const record = await prisma.tickerCache.findUnique({
    where: {
      symbol_provider: {
        symbol,
        provider,
      },
    },
  });

  if (!record || isExpired(record.fetchedAt)) {
    return null;
  }

  return JSON.parse(record.payload) as T;
}

export async function storeProviderPayload(
  symbol: string,
  provider: string,
  payload: unknown
) {
  await prisma.tickerCache.upsert({
    where: {
      symbol_provider: {
        symbol,
        provider,
      },
    },
    update: {
      payload: JSON.stringify(payload),
      fetchedAt: new Date(),
    },
    create: {
      symbol,
      provider,
      payload: JSON.stringify(payload),
    },
  });
}

export async function getFreshAnalysisSnapshot<T>(symbol: string) {
  const snapshot = await prisma.analysisSnapshot.findFirst({
    where: {
      symbol,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!snapshot || isExpired(snapshot.createdAt)) {
    return null;
  }

  return JSON.parse(snapshot.payload) as T;
}

function isExpired(value: Date) {
  return Date.now() - value.getTime() > CACHE_TTL_MS;
}
