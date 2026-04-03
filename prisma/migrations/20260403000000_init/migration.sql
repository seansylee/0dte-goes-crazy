CREATE TABLE "TickerCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AnalysisSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "sentimentScore" REAL NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "fundamentalsQualityScore" INTEGER NOT NULL,
    "combinedScore" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "sentimentScore" REAL
);

CREATE UNIQUE INDEX "TickerCache_symbol_provider_key" ON "TickerCache"("symbol", "provider");
CREATE INDEX "TickerCache_symbol_fetchedAt_idx" ON "TickerCache"("symbol", "fetchedAt");

CREATE INDEX "AnalysisSnapshot_symbol_createdAt_idx" ON "AnalysisSnapshot"("symbol", "createdAt");

CREATE UNIQUE INDEX "NewsArticle_symbol_url_key" ON "NewsArticle"("symbol", "url");
CREATE INDEX "NewsArticle_symbol_publishedAt_idx" ON "NewsArticle"("symbol", "publishedAt");
