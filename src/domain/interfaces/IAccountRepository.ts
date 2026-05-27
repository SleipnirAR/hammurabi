import { Account } from "../entities/Account.ts";

/**
 * Repository for account lookups.
 * Implement this to integrate with your data source.
 */
export default interface IAccountRepository {
  /** Find an account by its numeric ID. Returns `null` when not found. */
  findById(id: number): Promise<Account | null>;
}
