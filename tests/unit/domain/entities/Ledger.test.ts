import { describe, it, expect } from "vitest";
import { Ledger } from "../../../../src/domain/entities/Ledger.ts";
import Entry from "../../../../src/domain/entities/Entry.ts";
import { InMemoryLedgerRepository } from "../../../mocks/InMemoryLedgerRepository.ts";

describe("Ledger", () => {
  const makeBalancedEntries = () => [
    new Entry({ accountId: 1, amount: 100 }),
    new Entry({ accountId: 2, amount: -100 }),
  ];

  const makeUnbalancedEntries = () => [
    new Entry({ accountId: 1, amount: 100 }),
    new Entry({ accountId: 2, amount: -50 }),
  ];

  describe("startTransaction", () => {
    it("accepts balanced entries", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      expect(() => ledger.startTransaction("test", makeBalancedEntries())).not.toThrow();
    });

    it("throws and rolls back for unbalanced entries", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      expect(() => ledger.startTransaction("test", makeUnbalancedEntries()))
        .toThrow("Transaction is unbalanced: entries do not sum to zero");
    });

    it("throws when entries are invalid (empty)", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      expect(() => ledger.startTransaction("test", []))
        .toThrow("Entries are required");
    });

    it("accepts balanced entries with negative amounts", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      const entries = [
        new Entry({ accountId: 1, amount: -50 }),
        new Entry({ accountId: 2, amount: 50 }),
      ];
      expect(() => ledger.startTransaction("test", entries)).not.toThrow();
    });

    it("accepts balanced entries with mixed signs and decimals", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      const entries = [
        new Entry({ accountId: 1, amount: 100.5 }),
        new Entry({ accountId: 2, amount: -50.25 }),
        new Entry({ accountId: 3, amount: -50.25 }),
      ];
      expect(() => ledger.startTransaction("test", entries)).not.toThrow();
    });
  });

  describe("commit", () => {
    it("persists transaction via repository", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      ledger.startTransaction("test", makeBalancedEntries());
      const result = await ledger.commit();
      expect(result).toBeDefined();
      expect(repo.getSavedTransactions()).toHaveLength(1);
    });

    it("returns the saved transaction from repository", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      ledger.startTransaction("test", makeBalancedEntries());
      const result = await ledger.commit();
      expect(result.description).toBe("test");
      expect(result.entries).toHaveLength(2);
    });

    it("throws when no active transaction", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      await expect(ledger.commit()).rejects.toThrow("No transaction to commit");
    });
  });

  describe("rollback", () => {
    it("clears active transaction", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      ledger.startTransaction("test", makeBalancedEntries());
      ledger.rollback();
      await expect(ledger.commit()).rejects.toThrow("No transaction to commit");
    });

    it("does not throw when no active transaction", () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      expect(() => ledger.rollback()).not.toThrow();
    });
  });

  describe("lifecycle integration", () => {
    it("can start, commit, and start a new transaction sequentially", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      ledger.startTransaction("first", makeBalancedEntries());
      await ledger.commit();
      ledger.startTransaction("second", makeBalancedEntries());
      await ledger.commit();
      expect(repo.getSavedTransactions()).toHaveLength(2);
      expect(repo.getSavedTransactions()[0]?.description).toBe("first");
      expect(repo.getSavedTransactions()[1]?.description).toBe("second");
    });

    it("unbalanced transaction does not prevent a subsequent valid transaction", async () => {
      const repo = new InMemoryLedgerRepository();
      const ledger = new Ledger(repo);
      expect(() => ledger.startTransaction("bad", makeUnbalancedEntries())).toThrow();
      ledger.startTransaction("good", makeBalancedEntries());
      await ledger.commit();
      expect(repo.getSavedTransactions()).toHaveLength(1);
      expect(repo.getSavedTransactions()[0]?.description).toBe("good");
    });
  });
});
