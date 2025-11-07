import { eq, and, notInArray } from 'drizzle-orm';

import { BillingStorage } from '../core/interfaces';
import { Customer, Invoice, Subscription, UsageRecord, Entitlement, InvoiceItem } from '../core/models/types';
import {
  customers,
  subscriptions as subsTable,
  invoices as invoicesTable,
  invoiceItems as invoiceItemsTable,
  usageRecords as usageTable,
  entitlements as entitlementsTable,
  plans as plansTable,
} from '../drizzle/schema';

type Db = any;

export class DrizzleStorage implements BillingStorage {
  constructor(private db: Db) {}

  // Customers
  async saveCustomer(c: Customer): Promise<void> {
    const row = {
      id: c.id,
      externalId: c.externalId ?? undefined,
      email: c.email,
      name: c.name,
      provider: undefined,
      defaultCurrency: c.defaultCurrency,
      metadata: c.metadata ?? {},
    } satisfies (typeof customers.$inferInsert);

    // Atomic upsert by id
    await this.db
      .insert(customers)
      .values(row)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          externalId: row.externalId,
          email: row.email,
          name: row.name,
          provider: row.provider,
          defaultCurrency: row.defaultCurrency,
          metadata: row.metadata,
        },
      });
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const [row] = await this.db.select().from(customers).where(eq(customers.id, id));
    if (!row) return null;
    return {
      id: row.id,
      externalId: row.externalId ?? undefined,
      email: row.email ?? '',
      name: row.name ?? undefined,
      defaultCurrency: row.defaultCurrency ?? undefined,
      metadata: (row.metadata as any) ?? undefined,
    };
  }

  // Subscriptions
  async saveSubscription(s: Subscription): Promise<void> {
    const row = {
      id: s.id,
      customerId: s.customerId,
      planId: s.planId,
      status: s.status,
      startDate: s.startDate,
      endDate: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: s.currentPeriodEnd,
      externalId: s.externalId,
      items: s.items ?? undefined,
      seats: undefined,
      metadata: s.metadata ?? {},
    } satisfies typeof subsTable.$inferInsert;

    await this.db.transaction(async (tx: Db) => {
      // Validate customer exists
      const [cust] = await tx.select().from(customers).where(eq(customers.id, s.customerId));
      if (!cust) throw new Error(`Customer not found: ${s.customerId}`);

      // Validate plan exists
      const [plan] = await tx.select().from(plansTable).where(eq(plansTable.id, s.planId));
      if (!plan) throw new Error(`Plan not found: ${s.planId}`);

      // Optional sanity check: dates
      if (row.endDate && row.startDate && new Date(row.endDate) < new Date(row.startDate)) {
        throw new Error('Subscription endDate cannot be before startDate');
      }

      await tx
        .insert(subsTable)
        .values(row)
        .onConflictDoUpdate({
          target: subsTable.id,
          set: {
            customerId: row.customerId,
            planId: row.planId,
            status: row.status,
            startDate: row.startDate,
            endDate: row.endDate,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
            currentPeriodEnd: row.currentPeriodEnd,
            externalId: row.externalId,
            items: row.items,
            seats: row.seats,
            metadata: row.metadata,
          },
        });
    });
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    const [row] = await this.db.select().from(subsTable).where(eq(subsTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      externalId: row.externalId ?? undefined,
      customerId: row.customerId,
      planId: row.planId,
      status: row.status as Subscription['status'],
      startDate: row.startDate,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? undefined,
      currentPeriodEnd: row.currentPeriodEnd ?? undefined,
      items: row.items ? JSON.parse(String(row.items)) : undefined,
      metadata: (row.metadata as any) ?? undefined,
    };
  }

  // Usage
  async saveUsageRecord(r: UsageRecord): Promise<void> {
    const row = {
      id: r.id,
      customerId: r.customerId,
      subscriptionId: r.subscriptionId ?? '__none__',
      metric: r.metric,
      quantity: String(r.quantity),
      timestamp: r.timestamp,
      metadata: r.metadata ?? {},
    } satisfies typeof usageTable.$inferInsert;
    await this.db
      .insert(usageTable)
      .values(row)
      .onConflictDoUpdate({
        target: [usageTable.customerId, usageTable.subscriptionId, usageTable.metric, usageTable.timestamp],
        set: {
          quantity: row.quantity,
          metadata: row.metadata,
        },
      });
  }

  async listUsage(customerId: string, metric?: string): Promise<UsageRecord[]> {
    const rows = await this.db
      .select()
      .from(usageTable)
      .where(eq(usageTable.customerId, customerId));
    const typedRows = rows as Array<typeof usageTable.$inferSelect>;
    const filtered = metric ? typedRows.filter((u) => u.metric === metric) : typedRows;
    return filtered.map((u) => ({
      id: u.id,
      customerId: u.customerId,
      subscriptionId: !u.subscriptionId || u.subscriptionId === '__none__' ? 'sub_usage' : u.subscriptionId,
      metric: u.metric,
      quantity: Number(u.quantity ?? 0),
      timestamp: u.timestamp,
      metadata: (u.metadata as any) ?? undefined,
    }));
  }

  // Invoices
  async recordInvoice(inv: Invoice): Promise<void> {
    const row = {
      id: inv.id,
      customerId: inv.customerId,
      subscriptionId: inv.subscriptionId,
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      totalAmountMinor: inv.total,
      provider: undefined,
      externalId: inv.externalId,
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
      taxAmountMinor: inv.taxAmount ?? undefined,
      discountsMinor: inv.discounts ?? undefined,
      pdfUrl: inv.pdfUrl,
      metadata: inv.metadata ?? {},
    } satisfies typeof invoicesTable.$inferInsert;

    await this.db.transaction(async (tx: Db) => {
      // Upsert invoice
      await tx
        .insert(invoicesTable)
        .values(row)
        .onConflictDoUpdate({
          target: invoicesTable.id,
          set: {
            customerId: row.customerId,
            subscriptionId: row.subscriptionId,
            number: row.number,
            status: row.status,
            currency: row.currency,
            totalAmountMinor: row.totalAmountMinor,
            provider: row.provider,
            externalId: row.externalId,
            issuedAt: row.issuedAt,
            dueDate: row.dueDate,
            taxAmountMinor: row.taxAmountMinor,
            discountsMinor: row.discountsMinor,
            pdfUrl: row.pdfUrl,
            metadata: row.metadata,
          },
        });

      // Replace items atomically
      await tx.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id));
      const items = (inv.items ?? []).map((it) => ({
        id: `${inv.id}_${Math.random().toString(36).slice(2)}`,
        invoiceId: inv.id,
        description: it.description,
        metric: undefined,
        quantity: String(it.quantity ?? 1),
        amountMinor: it.amount,
        currency: String(inv.currency),
        metadata: {},
      })) satisfies (typeof invoiceItemsTable.$inferInsert)[];
      if (items.length) await tx.insert(invoiceItemsTable).values(items);
    });
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const [row] = await this.db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (!row) return null;
    const itemRows = await this.db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    const typedItemRows = itemRows as Array<typeof invoiceItemsTable.$inferSelect>;
    const items: InvoiceItem[] = typedItemRows.map((ir) => ({
      description: ir.description ?? '',
      amount: ir.amountMinor,
      quantity: ir.quantity ? Number(ir.quantity) : undefined,
      currency: row.currency as any,
    }));
    return {
      id: row.id,
      externalId: row.externalId ?? undefined,
      customerId: row.customerId,
      subscriptionId: row.subscriptionId ?? undefined,
      number: row.number ?? undefined,
      currency: row.currency as any,
      items,
      total: row.totalAmountMinor,
      status: row.status as Invoice['status'],
      issuedAt: row.issuedAt,
      dueDate: row.dueDate ?? undefined,
      taxAmount: row.taxAmountMinor ?? undefined,
      discounts: row.discountsMinor ?? undefined,
      pdfUrl: row.pdfUrl ?? undefined,
      metadata: (row.metadata as any) ?? undefined,
    };
  }

  // Entitlements
  async saveEntitlements(customerId: string, entries: Entitlement[]): Promise<void> {
    await this.db.transaction(async (tx: Db) => {
      // Atomic upsert entitlements by (customerId, featureKey)
      if (entries.length > 0) {
        for (const [idx, e] of entries.entries()) {
          const row = {
            id: `${customerId}_${e.featureKey}_${idx}`,
            customerId,
            featureKey: e.featureKey,
            limit: e.limit ?? null,
            expiresAt: e.expiresAt ?? null,
            metadata: e.metadata ?? {},
          } satisfies typeof entitlementsTable.$inferInsert;
          await tx
            .insert(entitlementsTable)
            .values(row)
            .onConflictDoUpdate({
              target: [entitlementsTable.customerId, entitlementsTable.featureKey],
              set: {
                limit: row.limit,
                expiresAt: row.expiresAt,
                metadata: row.metadata,
              },
            });
        }

        // Maintain replacement semantics: delete any entitlements not provided in the new list
        const keepKeys = entries.map((e) => e.featureKey);
        await tx
          .delete(entitlementsTable)
          .where(
            and(
              eq(entitlementsTable.customerId, customerId),
              notInArray(entitlementsTable.featureKey, keepKeys.length ? keepKeys : ['__none__'])
            )
          );
      } else {
        // Empty list means remove all entitlements for the customer
        await tx.delete(entitlementsTable).where(eq(entitlementsTable.customerId, customerId));
      }
    });
  }

  async getEntitlements(customerId: string): Promise<Entitlement[]> {
    const rows = await this.db.select().from(entitlementsTable).where(eq(entitlementsTable.customerId, customerId));
    const typedRows = rows as Array<typeof entitlementsTable.$inferSelect>;
    return typedRows.map((r) => ({
      featureKey: r.featureKey,
      limit: r.limit ?? undefined,
      expiresAt: r.expiresAt ?? undefined,
      metadata: (r.metadata as any) ?? undefined,
    }));
  }
}