import Transaction from "../../src/domain/entities/Transaction.ts";
import type ILedgerRepository from "../../src/domain/interfaces/ILedgerRepository.ts";

export class InMemoryLedgerRepository implements ILedgerRepository {
  private transactions: Transaction[] = [];

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    this.transactions.push(transaction);
    return transaction;
  }

  getSavedTransactions(): Transaction[] {
    return [...this.transactions];
  }

  clear(): void {
    this.transactions = [];
  }
}
