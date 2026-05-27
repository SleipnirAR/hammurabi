import { describe, it, expect } from "vitest";
import Entry from "../../../../src/domain/entities/Entry.ts";

describe("Entry", () => {
  describe("construction", () => {
    it("creates an entry with valid required values", () => {
      const entry = new Entry({ accountId: 1, amount: 100.5 });
      expect(entry.accountId).toBe(1);
      expect(entry.amount).toBe(100.5);
      expect(entry.id).toBeUndefined();
      expect(entry.conceptId).toBeUndefined();
      expect(entry.quantity).toBeUndefined();
    });

    it("creates an entry with optional id", () => {
      const entry = new Entry({ id: 5, accountId: 1, amount: 100 });
      expect(entry.id).toBe(5);
    });

    it("creates an entry with conceptId and positive quantity", () => {
      const entry = new Entry({ accountId: 1, amount: 100, conceptId: 10, quantity: 5 });
      expect(entry.conceptId).toBe(10);
      expect(entry.quantity).toBe(5);
    });

    it("creates an entry with conceptId and negative quantity", () => {
      const entry = new Entry({ accountId: 1, amount: 100, conceptId: 10, quantity: -3 });
      expect(entry.conceptId).toBe(10);
      expect(entry.quantity).toBe(-3);
    });

    it("creates an entry with negative amount", () => {
      const entry = new Entry({ accountId: 1, amount: -50.25 });
      expect(entry.amount).toBe(-50.25);
    });
  });

  describe("validation - concept and quantity pairing", () => {
    it("throws when conceptId is provided without quantity", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, conceptId: 10 }))
        .toThrow("Quantity is required when concept ID is provided");
    });

    it("throws when quantity is provided without conceptId", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, quantity: 5 }))
        .toThrow("Concept ID is required when quantity is provided");
    });

    it("throws when quantity is zero with conceptId (treated as not provided)", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, conceptId: 10, quantity: 0 }))
        .toThrow("Quantity is required when concept ID is provided");
    });

    it("allows positive quantity with conceptId", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, conceptId: 10, quantity: 1 })).not.toThrow();
    });

    it("allows negative quantity with conceptId", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, conceptId: 10, quantity: -1 })).not.toThrow();
    });
  });

  describe("validation - amount", () => {
    it("accepts positive amount", () => {
      expect(() => new Entry({ accountId: 1, amount: 100 })).not.toThrow();
    });

    it("accepts negative amount", () => {
      expect(() => new Entry({ accountId: 1, amount: -100 })).not.toThrow();
    });

    it("throws when amount is zero", () => {
      expect(() => new Entry({ accountId: 1, amount: 0 }))
        .toThrow("Amount must be a finite number and non-zero");
    });

    it("accepts decimal amounts", () => {
      expect(() => new Entry({ accountId: 1, amount: 100.5 })).not.toThrow();
    });

    it("throws when amount is NaN", () => {
      expect(() => new Entry({ accountId: 1, amount: NaN }))
        .toThrow("Amount must be a finite number");
    });

    it("throws when amount is Infinity", () => {
      expect(() => new Entry({ accountId: 1, amount: Infinity }))
        .toThrow("Amount must be a finite number");
    });

    it("throws when amount is -Infinity", () => {
      expect(() => new Entry({ accountId: 1, amount: -Infinity }))
        .toThrow("Amount must be a finite number");
    });
  });

  describe("validation - accountId", () => {
    it("allows accountId of zero", () => {
      expect(() => new Entry({ accountId: 0, amount: 100 })).not.toThrow();
    });

    it("allows positive accountId", () => {
      expect(() => new Entry({ accountId: 1, amount: 100 })).not.toThrow();
    });

    it("throws when accountId is negative", () => {
      expect(() => new Entry({ accountId: -1, amount: 100 }))
        .toThrow("Account ID must be a non-negative number");
    });
  });

  describe("validation - optional id", () => {
    it("allows id of zero", () => {
      expect(() => new Entry({ id: 0, accountId: 1, amount: 100 })).not.toThrow();
    });

    it("throws when id is negative", () => {
      expect(() => new Entry({ id: -1, accountId: 1, amount: 100 }))
        .toThrow("Entry ID must be a non-negative number");
    });
  });

  describe("validation - quantity without concept", () => {
    it("allows quantity to be undefined", () => {
      expect(() => new Entry({ accountId: 1, amount: 100 })).not.toThrow();
    });

    it("allows quantity to be zero (treated as not provided)", () => {
      expect(() => new Entry({ accountId: 1, amount: 100, quantity: 0 })).not.toThrow();
    });
  });

  describe("immutability", () => {
    it("is frozen after construction", () => {
      const entry = new Entry({ accountId: 1, amount: 100 });
      expect(Object.isFrozen(entry)).toBe(true);
    });
  });
});
