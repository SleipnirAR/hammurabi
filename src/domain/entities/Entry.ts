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
    // Treat quantity of 0 as "not provided" for pairing logic
    const quantityDefined = this.quantity !== undefined && this.quantity !== 0;
    const conceptDefined = this.conceptId !== undefined;

    if (conceptDefined && !quantityDefined) {
      throw new Error("Quantity is required when concept ID is provided");
    }
    if (quantityDefined && !conceptDefined) {
      throw new Error("Concept ID is required when quantity is provided");
    }
    if (conceptDefined && quantityDefined) {
      if (
        !assertions.numbers.assertFinite(this.quantity) ||
        this.quantity === 0
      ) {
        throw new Error(
          "Quantity must be a non-zero number when concept ID is provided",
        );
      }
    }
  }
  validateValues() {
    if (!assertions.numbers.assertFinite(this.amount) || this.amount === 0) {
      throw new Error("Amount must be a finite number and non-zero");
    }
    if (!assertions.numbers.assertNonNegative(this.accountId)) {
      throw new Error("Account ID must be a non-negative number");
    }
    if (
      this.id !== undefined &&
      !assertions.numbers.assertNonNegative(this.id)
    ) {
      throw new Error("Entry ID must be a non-negative number");
    }
    if (
      this.quantity !== undefined &&
      !assertions.numbers.assertFinite(this.quantity)
    ) {
      throw new Error("Quantity must be a finite number");
    }
  }
}
