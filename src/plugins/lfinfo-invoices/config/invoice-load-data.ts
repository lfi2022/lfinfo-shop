export async function lfinfoInvoiceLoadDataFn(
  ctx: any,
  injector: any,
  order: any,
  mostRecentInvoiceNumber?: number,
  shouldGenerateCreditInvoice?: any,
) {
  const date = order.orderPlacedAt ?? order.updatedAt ?? new Date();

  const year = new Date(date).getFullYear();
  const yearShort = year % 100;

  /**
   * Format interne :
   *
   * 26000001 => INV26-001
   * 26000002 => INV26-002
   * ...
   * 27000001 => INV27-001
   *
   * On réserve 5 chiffres pour le compteur annuel.
   */
  const YEAR_FACTOR = 100000;

  let sequence = 1;

  if (mostRecentInvoiceNumber) {
    const previousYear =
      Math.floor(mostRecentInvoiceNumber / YEAR_FACTOR);

    const previousSequence =
      mostRecentInvoiceNumber % YEAR_FACTOR;

    if (previousYear === yearShort) {
      sequence = previousSequence + 1;
    }
  }

  const newInvoiceNumber =
    yearShort * YEAR_FACTOR + sequence;

  const formattedSequence =
    String(sequence).padStart(3, '0');

  const formattedInvoiceNumber =
    shouldGenerateCreditInvoice
      ? `AV${String(yearShort).padStart(2, '0')}-${formattedSequence}`
      : `INV${String(yearShort).padStart(2, '0')}-${formattedSequence}`;

  const orderDate =
    new Intl.DateTimeFormat('fr-BE').format(
      new Date(date),
    );

  if (shouldGenerateCreditInvoice) {
    const {
      previousInvoice,
      reversedOrderTotals,
    } = shouldGenerateCreditInvoice;

    const originalNumber =
      previousInvoice.invoiceNumber;

    const originalYear =
      Math.floor(originalNumber / YEAR_FACTOR);

    const originalSequence =
      originalNumber % YEAR_FACTOR;

    const originalFormattedInvoiceNumber =
      originalYear >= 20
        ? `INV${String(originalYear).padStart(2, '0')}-${String(
            originalSequence,
          ).padStart(3, '0')}`
        : String(originalNumber);

    return {
      orderDate,

      // Numéro numérique réellement enregistré par Pinelab
      invoiceNumber: newInvoiceNumber,

      // Numéro destiné à l'affichage
      formattedInvoiceNumber,

      isCreditInvoice: true,

      originalInvoiceNumber:
        previousInvoice.invoiceNumber,

      originalFormattedInvoiceNumber,

      order: {
        ...order,

        total:
          reversedOrderTotals.total,

        totalWithTax:
          reversedOrderTotals.totalWithTax,

        taxSummary:
          reversedOrderTotals.taxSummaries,
      },
    };
  }

  return {
    orderDate,
    invoiceNumber: newInvoiceNumber,
    formattedInvoiceNumber,
    isCreditInvoice: false,
    order,
  };
}
