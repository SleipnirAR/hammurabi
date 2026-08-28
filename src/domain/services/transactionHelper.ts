import Entry from "../entities/Entry.ts";
import type IAccountRepository from "../interfaces/IAccountRepository.ts";
import { AccountType } from "../entities/Account.ts";

enum Nature {
  Debit = "debit",
  Credit = "credit",
}

interface TransferInput {
  FromId: number;
  ToId: number;
  amount: number;
  conceptId?: number | undefined;
  quantity?: number | undefined;
}

export default class TransactionHelper {
  private readonly accountRepository: IAccountRepository;

  constructor(accountRepository: IAccountRepository) {
    this.accountRepository = accountRepository;
  }

  /**
   * Generates a pair of Entry objects representing a transfer between two accounts.
   * Entry amounts and quantities are signed according to each account's nature (debit or credit):
   * - For the source account: debit nature produces a negative amount (credit entry)
   * - For the destination account: debit nature produces a positive amount (debit entry)
   *
   * @param FromId - Source account ID
   * @param ToId - Destination account ID
   * @param amount - Positive transfer amount
   * @param conceptId - Optional concept identifier
   * @param quantity - Optional quantity, defaults to 0
   * @returns A tuple of two Entry objects: [fromEntry, toEntry]
   * @throws If amount is not positive, or if either account is not found
   */
  public async transfer({
    FromId,
    ToId,
    amount,
    conceptId,
    quantity = 0,
  }: TransferInput): Promise<[Entry, Entry]> {
    const [fromAccount, toAccount] = await Promise.all([
      this.accountRepository.findById(FromId),
      this.accountRepository.findById(ToId),
    ]);

    if (!fromAccount) throw new Error(`Origin account not found: ${FromId}`);
    if (!toAccount) throw new Error(`Destination account not found: ${ToId}`);

    const fromNature = this.getNature(fromAccount.type);
    const fromAmount = fromNature === Nature.Debit ? -amount : amount;
    const fromQty = fromNature === Nature.Debit ? -quantity : quantity;

    const toNature = this.getNature(toAccount.type);
    const toAmount = toNature === Nature.Debit ? amount : -amount;
    const toQty = toNature === Nature.Debit ? quantity : -quantity;

    const entryFrom = new Entry({
      accountId: fromAccount.id,
      amount: fromAmount,
      ...(conceptId !== undefined && { quantity: fromQty, conceptId }),
    });

    const entryTo = new Entry({
      accountId: toAccount.id,
      amount: toAmount,
      ...(conceptId !== undefined && { quantity: toQty, conceptId }),
    });

    return [entryFrom, entryTo];
  }

  /**
   * Returns the accounting nature (Debit or Credit) of an account type.
   * Asset and Expense accounts have a debit nature.
   * Liability, Equity, and Income accounts have a credit nature.
   */
  private getNature(type: AccountType): Nature {
    return type === AccountType.ASSET || type === AccountType.EXPENSE
      ? Nature.Debit
      : Nature.Credit;
  }
}
