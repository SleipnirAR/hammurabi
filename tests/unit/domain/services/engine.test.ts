import { describe, it, expect } from "vitest";
import HammurabiEngine from "../../../../src/domain/services/engine.ts";
import { Ledger } from "../../../../src/domain/entities/Ledger.ts";
import TransactionHelper from "../../../../src/domain/services/transactionHelper.ts";
import Entry from "../../../../src/domain/entities/Entry.ts";
import { InMemoryAccountRepository } from "../../../mocks/InMemoryAccountRepository.ts";
import { InMemoryLedgerRepository } from "../../../mocks/InMemoryLedgerRepository.ts";
import type IDbContext from "../../../../src/domain/interfaces/IDbContext.ts";

describe("HammurabiEngine", () => {
  const createEngine = () => {
    const dbContext: IDbContext = {
      ledgerRepository: new InMemoryLedgerRepository(),
      accountRepository: new InMemoryAccountRepository(),
    };
    return { engine: new HammurabiEngine(dbContext), dbContext };
  };

  it("stores the dbContext", () => {
    const { engine, dbContext } = createEngine();
    expect(engine.dbContext).toBe(dbContext);
  });

  it("getLedger returns a Ledger instance", () => {
    const { engine } = createEngine();
    expect(engine.getLedger()).toBeInstanceOf(Ledger);
  });

  it("getTransactionHelper returns a TransactionHelper instance", () => {
    const { engine } = createEngine();
    expect(engine.getTransactionHelper()).toBeInstanceOf(TransactionHelper);
  });

  it("getLedger returns a new instance each call", () => {
    const { engine } = createEngine();
    expect(engine.getLedger()).not.toBe(engine.getLedger());
  });

  it("getTransactionHelper returns a new instance each call", () => {
    const { engine } = createEngine();
    expect(engine.getTransactionHelper()).not.toBe(engine.getTransactionHelper());
  });

  it("ledger from getLedger is wired to the engine's ledger repository", async () => {
    const { engine, dbContext } = createEngine();
    const ledger = engine.getLedger();
    const entry1 = new Entry({ accountId: 1, amount: 100 });
    const entry2 = new Entry({ accountId: 2, amount: -100 });
    ledger.startTransaction("test", [entry1, entry2]);
    await ledger.commit();
    const saved = (dbContext.ledgerRepository as InMemoryLedgerRepository).getSavedTransactions();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.description).toBe("test");
  });
});
