import { Account } from "../../src/domain/entities/Account.ts";
import type IAccountRepository from "../../src/domain/interfaces/IAccountRepository.ts";

export class InMemoryAccountRepository implements IAccountRepository {
  private accounts: Map<number, Account> = new Map();

  constructor(accounts?: Account[]) {
    if (accounts) {
      for (const account of accounts) {
        this.accounts.set(account.id, account);
      }
    }
  }

  async findById(id: number): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  addAccount(account: Account): void {
    this.accounts.set(account.id, account);
  }

  clear(): void {
    this.accounts.clear();
  }
}
