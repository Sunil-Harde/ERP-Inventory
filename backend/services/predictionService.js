const Transaction = require('../models/Transaction');
const { TXN_TYPE } = require('../utils/constants');

/**
 * Simple linear regression-based stock prediction.
 * Predicts when stock will run out and suggests reorder quantity.
 *
 * @param {string} itemCode - The item code to predict for
 * @param {number} currentStock - Current stock level
 * @returns {object} prediction results
 */
const predictStockDepletion = async (itemCode, currentStock) => {
  // Get last 90 days of OUT transactions for this item
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const outTransactions = await Transaction.find({
    itemCode: itemCode.toUpperCase(),
    type: TXN_TYPE.OUT,
    createdAt: { $gte: ninetyDaysAgo },
  }).sort({ createdAt: 1 });

  if (outTransactions.length < 3) {
    return {
      hasEnoughData: false,
      message: 'Not enough transaction data for prediction (need at least 3 OUT transactions in 90 days)',
      currentStock,
      dailyUsageRate: 0,
      daysUntilDepletion: null,
      depletionDate: null,
      suggestedReorderQty: 0,
    };
  }

  // Calculate daily usage using grouped daily totals
  const dailyUsage = {};
  for (const txn of outTransactions) {
    const dateKey = txn.createdAt.toISOString().split('T')[0];
    dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + txn.quantity;
  }

  const usageDays = Object.values(dailyUsage);
  const totalUsage = usageDays.reduce((sum, val) => sum + val, 0);

  // Calculate the date range
  const firstDate = outTransactions[0].createdAt;
  const lastDate = outTransactions[outTransactions.length - 1].createdAt;
  const daySpan = Math.max(
    1,
    Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24))
  );

  // Average daily usage rate
  const dailyUsageRate = totalUsage / daySpan;

  // Days until depletion
  const daysUntilDepletion = dailyUsageRate > 0
    ? Math.floor(currentStock / dailyUsageRate)
    : null;

  // Depletion date
  const depletionDate = daysUntilDepletion !== null
    ? new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000)
    : null;

  // Suggested reorder: enough for 30 days + safety stock (7 days)
  const leadTimeDays = 7; // Assume 7-day lead time
  const safetyStockDays = 7;
  const reorderDays = 30;
  const suggestedReorderQty = Math.ceil(
    dailyUsageRate * (reorderDays + safetyStockDays + leadTimeDays)
  );

  // Reorder point: when stock reaches this level, time to reorder
  const reorderPoint = Math.ceil(dailyUsageRate * (leadTimeDays + safetyStockDays));

  // Trend: compare first half vs second half usage
  const midpoint = Math.floor(usageDays.length / 2);
  const firstHalfAvg =
    usageDays.slice(0, midpoint).reduce((s, v) => s + v, 0) / midpoint || 0;
  const secondHalfAvg =
    usageDays.slice(midpoint).reduce((s, v) => s + v, 0) /
      (usageDays.length - midpoint) || 0;

  let trend = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.2) trend = 'increasing';
  if (secondHalfAvg < firstHalfAvg * 0.8) trend = 'decreasing';

  return {
    hasEnoughData: true,
    currentStock,
    dailyUsageRate: Math.round(dailyUsageRate * 100) / 100,
    daysUntilDepletion,
    depletionDate: depletionDate ? depletionDate.toISOString().split('T')[0] : null,
    suggestedReorderQty,
    reorderPoint,
    trend,
    dataPoints: outTransactions.length,
    analysisWindow: `${daySpan} days`,
  };
};

module.exports = {
  predictStockDepletion,
};
