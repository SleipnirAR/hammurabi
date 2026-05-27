import Transaction from "./Transaction.ts";
import Entry from "./Entry.ts";
import type ILedgerRepository from "../interfaces/ILedgerRepository.ts";

/**
 * Manages the lifecycle of a single transaction: creation, balance verification,
 * persistence, and rollback.
 */
export class Ledger {
  constructor(ledgerRepo: ILedgerRepository) {
    this.ledgerRepo = ledgerRepo;
  }
  private transaction?: Transaction;
  ledgerRepo: ILedgerRepository;

  /**
   * Begins a new transaction with the given description and entries.
   * Automatically verifies that the entries are balanced (sum to zero).
   * On verification failure the transaction is rolled back and the error is rethrown.
   *
   * @param transactionDescription - A human-readable description for the transaction
   * @param entries - The journal entries that make up this transaction
   * @throws If the entries are invalid or do not sum to zero
   */
  startTransaction(transactionDescription: string, entries: Entry[]): void;
  /**
   * Begins a new transaction with an existing Transaction instance.
   * Automatically verifies that the entries are balanced (sum to zero).
   * On verification failure the transaction is rolled back and the error is rethrown.
   *
   * @param transaction - A complete Transaction instance (useful for custom Transaction subclasses)
   * @throws If the transaction is invalid or entries do not sum to zero
   */
  startTransaction(transaction: Transaction): void;
  startTransaction(
    descOrTx: string | Transaction,
    entries?: Entry[],
  ): void {
    try {
      if (typeof descOrTx === "string") {
        this.transaction = new Transaction(descOrTx, entries!);
      } else {
        this.transaction = descOrTx;
      }
      this.verifyTransaction();
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /** Asserts the current transaction's entries sum to zero (double-entry rule). */
  private verifyTransaction() {
    if (!this.transaction) throw new Error("No transaction to verify");

    const sum = this.transaction.entries.reduce(
      (acc, entry) => acc + entry.amount,
      0,
    );

    if (sum !== 0)
      throw new Error("Transaction is unbalanced: entries do not sum to zero");
  }

  /**
   * Persists the current transaction to the ledger repository.
   *
   * @returns The result from the repository
   * @throws If there is no active transaction to commit
   */
  async commit() {
    if (!this.transaction) throw new Error("No transaction to commit");
    return await this.ledgerRepo.saveTransactional(this.transaction);
  }

  /** Discards the current transaction without persisting it. */
  rollback() {
    delete this.transaction;
  }
}
