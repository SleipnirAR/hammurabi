import { describe, it, expect } from "vitest";
import TransactionHelper from "../../../../src/domain/services/transactionHelper.ts";
import {
  Account,
  AccountType,
} from "../../../../src/domain/entities/Account.ts";
import { InMemoryAccountRepository } from "../../../mocks/InMemoryAccountRepository.ts";

describe("TransactionHelper", () => {
  const assetAccount = new Account(1, 0, "Cash", AccountType.ASSET);
  const expenseAccount = new Account(2, 0, "Salaries", AccountType.EXPENSE);
  const liabilityAccount = new Account(3, 0, "Loan", AccountType.LIABILITY);
  const equityAccount = new Account(4, 0, "Equity", AccountType.EQUITY);
  const incomeAccount = new Account(5, 0, "Revenue", AccountType.INCOME);

  const createHelper = (...accounts: Account[]) =>
    new TransactionHelper(new InMemoryAccountRepository(accounts));

  describe("sign logic", () => {
    it("transfer from Asset to Expense: both debit-nature", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100,
        quantity: 0,
      });
      expect(from.amount).toBe(-100);
      expect(to.amount).toBe(100);
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });

    it("transfer from Liability to Equity: both credit-nature", async () => {
      const helper = createHelper(liabilityAccount, equityAccount);
      const [from, to] = await helper.transfer({
        FromId: 3,
        ToId: 4,
        amount: 100,
        quantity: 0,
      });
      expect(from.amount).toBe(100);
      expect(to.amount).toBe(-100);
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });

    it("transfer from Income to Expense: credit-nature source, debit-nature dest", async () => {
      const helper = createHelper(incomeAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 5,
        ToId: 2,
        amount: 100,
        quantity: 0,
      });
      expect(from.amount).toBe(100);
      expect(to.amount).toBe(100);
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });

    it("transfer from Asset to Liability: debit-nature source, credit-nature dest", async () => {
      const helper = createHelper(assetAccount, liabilityAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 3,
        amount: 100,
        quantity: 0,
      });
      expect(from.amount).toBe(-100);
      expect(to.amount).toBe(-100);
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });
  });

  describe("amount validation", () => {
    it("throws when amount is zero", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      await expect(
        helper.transfer({ FromId: 1, ToId: 2, amount: 0, quantity: 0 }),
      ).rejects.toThrow("Amount must be a finite number and non-zero");
    });

    it("accepts negative amounts", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      expect(() => helper.transfer({ FromId: 1, ToId: 2, amount: -100, quantity: 0 })).not.toThrow();

    });

    it("accepts decimal amounts", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100.5,
        quantity: 0,
      });
      expect(from.amount).toBe(-100.5);
      expect(to.amount).toBe(100.5);
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });
  });

  describe("account lookup errors", () => {
    it("throws when source account not found", async () => {
      const helper = createHelper(expenseAccount);
      await expect(
        helper.transfer({ FromId: 1, ToId: 2, amount: 100, quantity: 0 }),
      ).rejects.toThrow("Origin account not found: 1");
    });

    it("throws when destination account not found", async () => {
      const helper = createHelper(assetAccount);
      await expect(
        helper.transfer({ FromId: 1, ToId: 2, amount: 100, quantity: 0 }),
      ).rejects.toThrow("Destination account not found: 2");
    });

    it("throws when neither account exists (source check fires first)", async () => {
      const helper = createHelper();
      await expect(
        helper.transfer({ FromId: 1, ToId: 2, amount: 100, quantity: 0 }),
      ).rejects.toThrow("Origin account not found: 1");
    });
  });

  describe("conceptId and quantity", () => {
    it("transfer with conceptId and positive quantity", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100,
        conceptId: 10,
        quantity: 5,
      });
      expect(from.conceptId).toBe(10);
      expect(to.conceptId).toBe(10);
      expect(from.quantity).toBe(-5);
      expect(to.quantity).toBe(5);
    });

    it("transfer with conceptId and negative quantity (e.g., stock discount)", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100,
        conceptId: 10,
        quantity: -3,
      });
      expect(from.conceptId).toBe(10);
      expect(to.conceptId).toBe(10);
      expect(from.quantity).toBe(3);
      expect(to.quantity).toBe(-3);
    });

    it("transfer without conceptId has undefined conceptId and quantity on entries", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100,
        quantity: 0,
      });
      expect(from.conceptId).toBeUndefined();
      expect(to.conceptId).toBeUndefined();
      expect(from.quantity).toBeUndefined();
      expect(to.quantity).toBeUndefined();
    });

    it("transfer with conceptId uses quantity parameter, not default", async () => {
      const helper = createHelper(assetAccount, expenseAccount);
      // Pass quantity explicitly with conceptId
      const [from, to] = await helper.transfer({
        FromId: 1,
        ToId: 2,
        amount: 100,
        conceptId: 10,
        quantity: 5,
      });
      expect(from.quantity).toBe(-5);
      expect(to.quantity).toBe(5);
    });
  });
});
