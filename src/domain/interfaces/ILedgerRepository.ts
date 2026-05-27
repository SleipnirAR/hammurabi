import Transaction from "../entities/Transaction.ts";

/**
 * Repository for persisting transactions.
 * Implement this to integrate with your data source.
 */
export default interface ILedgerRepository {
  /** Persist a transaction and its entries atomically. Returns the saved transaction. */
  saveTransactional(transaction: Transaction): Promise<Transaction>;
}
