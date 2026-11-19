import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bpsToPercentage,
  formatBpsAsPercent,
  percentageToBps,
  validatePrizeSplitsBps,
  calculatePrizeShares,
  formatTokenAmount,
  parseTokenAmount,
  deriveEventDisplayStatus,
  validateCreateEventDraft,
  filterEvents,
} from './poolMath';

test('basis points and percentage conversion roundtrips cleanly', () => {
  assert.equal(bpsToPercentage(5000), 50);
  assert.equal(bpsToPercentage(2550), 25.5);
  assert.equal(formatBpsAsPercent(6000), '60%');
  assert.equal(formatBpsAsPercent(1250), '12.5%');
  assert.equal(percentageToBps(33.33), 3333);
  assert.equal(percentageToBps(100), 10000);
});

test('validatePrizeSplitsBps enforces 10000 bps sum and positive integers', () => {
  assert.equal(validatePrizeSplitsBps([6000, 3000, 1000]).valid, true);
  assert.equal(validatePrizeSplitsBps([5000, 3000]).valid, false);
  assert.equal(validatePrizeSplitsBps([10000, 0]).valid, false);
  assert.equal(validatePrizeSplitsBps([]).valid, false);
});

test('calculatePrizeShares distributes pool exactly without losing remainder', () => {
  const shares = calculatePrizeShares(100_000_000n, [6000, 3000, 1000]);
  assert.deepEqual(shares, [60_000_000n, 30_000_000n, 10_000_000n]);

  const oddShares = calculatePrizeShares(100n, [3333, 3333, 3334]);
  assert.equal(
    oddShares.reduce((a, b) => a + b, 0n),
    100n
  );
});

test('token amount formatting and parsing respect decimals', () => {
  assert.equal(formatTokenAmount(25_500_000n, 6), '25.5');
  assert.equal(formatTokenAmount(1_000_000_000n, 6), '1,000');
  assert.equal(parseTokenAmount('25.5', 6), 25_500_000n);
  assert.equal(parseTokenAmount('10.1234567', 6), null);
  assert.equal(parseTokenAmount('-5', 6), null);
});

test('deriveEventDisplayStatus handles open, closed by cap/deadline, completed, and cancelled', () => {
  assert.equal(
    deriveEventDisplayStatus({ status: 0, deadline: 2000n, entrantCount: 4, entrantCap: 8 }, 1000),
    'OPEN'
  );
  assert.equal(
    deriveEventDisplayStatus({ status: 0, deadline: 2000n, entrantCount: 8, entrantCap: 8 }, 1000),
    'CLOSED'
  );
  assert.equal(
    deriveEventDisplayStatus({ status: 0, deadline: 900n, entrantCount: 4, entrantCap: 8 }, 1000),
    'CLOSED'
  );
  assert.equal(
    deriveEventDisplayStatus({ status: 1, deadline: 2000n, entrantCount: 4, entrantCap: 8 }, 1000),
    'COMPLETED'
  );
  assert.equal(
    deriveEventDisplayStatus({ status: 2, deadline: 2000n, entrantCount: 4, entrantCap: 8 }, 1000),
    'CANCELLED'
  );
});

test('validateCreateEventDraft catches empty or invalid fields', () => {
  const now = 1_700_000_000_000;
  const futureIso = new Date(now + 3600_000).toISOString();
  const validResult = validateCreateEventDraft(
    {
      name: 'Arc Open Cup',
      description: 'Best of three bracket',
      entryFeeInput: '10',
      tokenDecimals: 6,
      entrantCapInput: '16',
      deadlineIso: futureIso,
      splitsBps: [6000, 3000, 1000],
    },
    now
  );
  assert.equal(validResult.valid, true);

  const invalidResult = validateCreateEventDraft(
    {
      name: '',
      description: '',
      entryFeeInput: '0',
      tokenDecimals: 6,
      entrantCapInput: '1',
      deadlineIso: new Date(now - 1000).toISOString(),
      splitsBps: [5000],
    },
    now
  );
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.errors.length, 6);
});

test('filterEvents filters by search query, derived status, and token', () => {
  const sample = [
    {
      id: 1n,
      name: 'Spring Bracket',
      description: 'Fast matches',
      token: '0x3600000000000000000000000000000000000000' as `0x${string}`,
      status: 0 as const,
      deadline: 5000n,
      entrantCount: 2,
      entrantCap: 8,
    },
    {
      id: 2n,
      name: 'Winter Clash',
      description: 'EURC series',
      token: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
      status: 2 as const,
      deadline: 5000n,
      entrantCount: 1,
      entrantCap: 8,
    },
  ];

  assert.equal(
    filterEvents(sample, { search: 'spring', nowSeconds: 1000 }).length,
    1
  );
  assert.equal(
    filterEvents(sample, { statusFilter: 'CANCELLED', nowSeconds: 1000 }).length,
    1
  );
  assert.equal(
    filterEvents(sample, {
      tokenFilter: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
      nowSeconds: 1000,
    }).length,
    1
  );
});
