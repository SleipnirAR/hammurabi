import { describe, it, expect } from "vitest";
import Transaction from "../../../../src/domain/entities/Transaction.ts";
import Entry from "../../../../src/domain/entities/Entry.ts";

describe("Transaction", () => {
  const makeValidEntry = () => new Entry({ accountId: 1, amount: 100 });

  describe("construction", () => {
    it("creates a transaction with valid values", () => {
      const tx = new Transaction("test", [makeValidEntry()]);
      expect(tx.description).toBe("test");
      expect(tx.entries).toHaveLength(1);
      expect(tx.uuid).toBeDefined();
      expect(tx.uuid.length).toBeGreaterThan(0);
      expect(tx.timestamp).toBeInstanceOf(Date);
    });

    it("accepts custom uuid and timestamp", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const ts = new Date("2024-01-01");
      const tx = new Transaction("test", [makeValidEntry()], uuid, ts);
      expect(tx.uuid).toBe(uuid);
      expect(tx.timestamp).toBe(ts);
    });

    it("generates a unique uuid for each transaction", () => {
      const tx1 = new Transaction("test", [makeValidEntry()]);
      const tx2 = new Transaction("test", [makeValidEntry()]);
      expect(tx1.uuid).not.toBe(tx2.uuid);
    });
  });

  describe("validation", () => {
    it("throws when description is empty", () => {
      expect(() => new Transaction("", [makeValidEntry()]))
        .toThrow("Transaction description is required");
    });

    it("throws when entries array is empty", () => {
      expect(() => new Transaction("test", []))
        .toThrow("Entries are required");
    });

    it("throws when entries contain non-Entry objects", () => {
      expect(() => new Transaction("test", [{ accountId: 1 }] as Entry[]))
        .toThrow("Entries must be of type Entry");
    });

    it("throws when timestamp is invalid", () => {
      expect(() => new Transaction("test", [makeValidEntry()], undefined, new Date("invalid")))
        .toThrow("Invalid timestamp");
    });

    it("throws when uuid is empty", () => {
      expect(() => new Transaction("test", [makeValidEntry()], ""))
        .toThrow("UUID is required");
    });
  });

  describe("immutability", () => {
    it("is frozen after construction", () => {
      const tx = new Transaction("test", [makeValidEntry()]);
      expect(Object.isFrozen(tx)).toBe(true);
    });
  });
});
