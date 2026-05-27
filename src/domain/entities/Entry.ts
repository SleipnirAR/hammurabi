import { assertions } from "../../shared/asserts.ts";
export default class Entry {
  id?: number | undefined;
  accountId: number;
  conceptId?: number | undefined;
  quantity?: number | undefined;
  amount: number;

  constructor({
    id,
    accountId,
    conceptId,
    quantity,
    amount,
  }: {
    id?: number | undefined;
    accountId: number;
    conceptId?: number | undefined;
    quantity?: number | undefined;
    amount: number;
  }) {
    this.id = id;
    this.accountId = accountId;
    this.conceptId = conceptId;
    this.quantity = quantity;
    this.amount = amount;
    if (conceptId !== undefined || quantity !== undefined) {
      this.validateConceptAndQuantity();
    }
    this.validateValues();
    // Make the entry immutable after validation
    Object.freeze(this);
  }

  validateConceptAndQuantity() {
    if (this.conceptId && !this.quantity)
      throw new Error("Quantity is required when concept ID is provided");
    if (this.quantity && !this.conceptId)
      throw new Error("Concept ID is required when quantity is provided");
    if (this.conceptId && !assertions.numbers.assertPositive(this.quantity))
      throw new Error(
        "Quantity must be a positive number when concept ID is provided",
      );
  }
  validateValues() {
    if (!assertions.numbers.assertNonNegative(this.amount))
      throw new Error("Amount must be a positive number");
    if (!assertions.numbers.assertNonNegative(this.accountId))
      throw new Error("Account ID must be a positive number");
    if (this.id && !assertions.numbers.assertNonNegative(this.id))
      throw new Error("Entry ID must be a positive number");
  }
}
