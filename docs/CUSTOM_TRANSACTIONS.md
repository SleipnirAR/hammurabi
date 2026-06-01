# Custom Transactions Guide

Extend Hammurabi's Transaction class to add custom metadata fields like user info, location, invoice numbers, and other business-specific data.

## Why Custom Transactions?

The standard Transaction class provides core accounting functionality (description, entries, UUID, timestamp, immutability). But your business might need additional metadata:

- **Who** created the transaction (user/employee info)
- **Where** it happened (location/branch/warehouse)
- **What's the reference** (invoice number, PO number, cost center)
- **Custom fields** (approval level, customer ID, etc.)

Custom Transaction subclasses let you add this metadata **without modifying Hammurabi's core code**.

## Creating a Custom Transaction

### Step 1: Create a Subclass

```typescript
import { Transaction, Entry } from "hammurabi";

class InvoiceTransaction extends Transaction {
  // Your custom fields
  invoiceNumber: string;
  customerId: number;

  constructor(
    description: string,
    entries: Entry[],
    invoiceNumber: string,
    customerId: number
  ) {
    // CRITICAL: Always call super() first
    super(description, entries);
    
    // Then add custom fields
    this.invoiceNumber = invoiceNumber;
    this.customerId = customerId;
    
    // Optional: freeze to make fully immutable
    Object.freeze(this);
  }
}
```

### Key Rules

1. **Always call `super(description, entries)`**: This initializes base Transaction properties
2. **Set custom fields AFTER super()**: Add your fields after the super call
3. **Don't modify base fields**: Keep inherited fields read-only
4. **Consider freezing**: Use `Object.freeze(this)` for full immutability

---

## Complete Example: Invoice Transaction

A practical example with user and location metadata.

### Step 1: Define Custom Transaction

```typescript
import { Transaction, Entry } from "hammurabi";

class InvoiceTransaction extends Transaction {
  invoiceNumber: string;
  userId: number;
  locationId: number;
  customerId: number;
  approvalLevel: "draft" | "pending" | "approved";

  constructor(
    description: string,
    entries: Entry[],
    invoiceNumber: string,
    userId: number,
    locationId: number,
    customerId: number,
    approvalLevel: "draft" | "pending" | "approved" = "draft"
  ) {
    super(description, entries);
    this.invoiceNumber = invoiceNumber;
    this.userId = userId;
    this.locationId = locationId;
    this.customerId = customerId;
    this.approvalLevel = approvalLevel;
    Object.freeze(this);
  }
}

export default InvoiceTransaction;
```

### Step 2: Use the Custom Transaction

```typescript
import Hammurabi, { Entry } from "hammurabi";
import InvoiceTransaction from "./InvoiceTransaction";

// Configure once at app startup
Hammurabi.configure(dbContext);

// Later, create custom transaction with metadata
const ledger = Hammurabi.getLedger();

const entries = [
  new Entry({ accountId: 101, amount: 5000 }),
  new Entry({ accountId: 201, amount: -5000 })
];

const invoice = new InvoiceTransaction(
  "Invoice #INV-2024-001 payment received",
  entries,
  "INV-2024-001",
  42,            // userId
  1,             // locationId
  999,           // customerId
  "approved"
);

// Use the second overload of startTransaction
ledger.startTransaction(invoice);

// Commit
const saved = await ledger.commit();

console.log(`✓ Saved invoice ${invoice.invoiceNumber}`);
console.log(`  User: ${invoice.userId}`);
console.log(`  Location: ${invoice.locationId}`);
console.log(`  UUID: ${saved.uuid}`);
```

### Step 3: Update Your Repository

Your repository must handle saving custom fields:

```typescript
import { ILedgerRepository, Transaction } from "hammurabi";
import InvoiceTransaction from "./InvoiceTransaction";

export class CustomLedgerRepository implements ILedgerRepository {
  constructor(private db: Database) {}

  async saveTransactional(transaction: Transaction): Promise<Transaction> {
    return this.db.transaction(async (txn) => {
      // 1. Save base transaction
      await txn.query(
        `INSERT INTO transactions (uuid, description, timestamp)
         VALUES ($1, $2, $3)`,
        [transaction.uuid, transaction.description, transaction.timestamp]
      );

      // 2. Save entries
      for (const entry of transaction.entries) {
        await txn.query(
          `INSERT INTO entries (transaction_uuid, account_id, amount, concept_id, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            transaction.uuid,
            entry.accountId,
            entry.amount,
            entry.conceptId,
            entry.quantity
          ]
        );
      }

      // 3. If it's a custom transaction, save custom fields
      if (transaction instanceof InvoiceTransaction) {
        await txn.query(
          `INSERT INTO invoice_transactions (
             transaction_uuid, invoice_number, user_id, location_id,
             customer_id, approval_level
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            transaction.uuid,
            transaction.invoiceNumber,
            transaction.userId,
            transaction.locationId,
            transaction.customerId,
            transaction.approvalLevel
          ]
        );
      }

      return transaction;
    });
  }
}
```

### Database Schema

Add a table for custom fields:

```sql
-- Standard tables (unchanged)
CREATE TABLE transactions (
  uuid UUID PRIMARY KEY,
  description TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  transaction_uuid UUID NOT NULL REFERENCES transactions(uuid),
  account_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  concept_id INTEGER,
  quantity INTEGER
);

-- Custom table for invoice metadata
CREATE TABLE invoice_transactions (
  transaction_uuid UUID PRIMARY KEY REFERENCES transactions(uuid),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  approval_level VARCHAR(20) NOT NULL
);
```

---

## Best Practices

### 1. Always Call super()

```typescript
// ✓ Correct
class MyTransaction extends Transaction {
  myField: string;

  constructor(description: string, entries: Entry[], myField: string) {
    super(description, entries);  // Always first
    this.myField = myField;
  }
}
```

### 2. Use Type Guards in Repository

```typescript
// ✓ Type-safe handling
if (transaction instanceof InvoiceTransaction) {
  await saveInvoiceFields(transaction);
}

// ✗ Unsafe casting
if ((transaction as any).invoiceNumber) {
  // Bypasses TypeScript's type safety
}
```

### 3. Document Custom Fields

```typescript
/**
 * Invoice-specific transaction with tracking metadata.
 */
class InvoiceTransaction extends Transaction {
  /** Invoice reference number (e.g., INV-2024-001) */
  invoiceNumber: string;

  /** User who created this invoice */
  userId: number;

  /** Location where transaction occurred */
  locationId: number;

  /** Customer from CRM system */
  customerId: number;

  /** Approval status */
  approvalLevel: "draft" | "pending" | "approved";
}
```

### 4. Keep Custom Fields Relevant

```typescript
// ✓ Good - relevant metadata
class InvoiceTransaction extends Transaction {
  invoiceNumber: string;
  userId: number;
  customerId: number;
}

// ✗ Bad - unrelated fields
class BadTransaction extends Transaction {
  randomCounter: number;
  tempData: any;
}
```

---

## Using Custom Transactions

### With TransactionHelper

You can use custom transactions with TransactionHelper:

```typescript
import InvoiceTransaction from "./InvoiceTransaction";

const helper = Hammurabi.getTransactionHelper();
const ledger = Hammurabi.getLedger();

// Get entries from helper
const [entry1, entry2] = await helper.transfer({
  FromId: 101,
  ToId: 401,
  amount: 5000
});

// Create custom transaction with metadata
const invoice = new InvoiceTransaction(
  "Invoice payment",
  [entry1, entry2],
  "INV-001",
  userId,
  locationId,
  customerId,
  "approved"
);

// Start with custom transaction
ledger.startTransaction(invoice);
await ledger.commit();
```

### Accessing Custom Fields

```typescript
const tx = new InvoiceTransaction(...);

// Access base Transaction fields (inherited)
console.log(tx.uuid);
console.log(tx.timestamp);
console.log(tx.entries);

// Access custom fields
console.log(tx.invoiceNumber);
console.log(tx.userId);
console.log(tx.customerId);
```

---

## Handling Multiple Custom Transaction Types

If you have multiple custom transaction types, use polymorphic handling in your repository:

```typescript
async saveTransactional(transaction: Transaction): Promise<Transaction> {
  // Save base transaction
  await this.saveBase(transaction);

  // Handle custom types
  if (transaction instanceof InvoiceTransaction) {
    await this.saveInvoiceFields(transaction);
  } else if (transaction instanceof PurchaseOrderTransaction) {
    await this.savePurchaseOrderFields(transaction);
  } else if (transaction instanceof ExpenseTransaction) {
    await this.saveExpenseFields(transaction);
  }

  return transaction;
}
```

---

## Summary

1. **Extend Transaction** with your custom fields
2. **Always call super(description, entries)** in your constructor
3. **Add custom fields AFTER super()**
4. **Use custom transactions** with `ledger.startTransaction(transaction)`
5. **Update your repository** to save custom fields using `instanceof` checks
6. **Freeze your transaction** for full immutability

Custom transactions let you add domain-specific metadata while keeping Hammurabi's core accounting logic intact.
