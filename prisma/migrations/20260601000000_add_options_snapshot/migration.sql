CREATE TABLE "OptionsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "OptionsSnapshot_symbol_provider_key" ON "OptionsSnapshot"("symbol", "provider");
CREATE INDEX "OptionsSnapshot_symbol_fetchedAt_idx" ON "OptionsSnapshot"("symbol", "fetchedAt");
