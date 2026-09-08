import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, categoryColor } from '../lib/categories';
import { formatMoney as formatMoneyBase } from '../lib/currency';
import {
  cycleSplit,
  extremeSubscriptions,
  projectedMonthlySpend,
  spendByCategory,
  totalAnnualSpend,
  totalMonthlySpend,
} from '../logic/statistics';

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short' });
const MONTH_FULL_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export default function StatisticsPage() {
  const { subscriptions, loading } = useSubscriptions();
  const { user } = useAuth();
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const formatMoney = (amount) => formatMoneyBase(amount, user?.currency);

  const monthlySpend = useMemo(() => totalMonthlySpend(subscriptions), [subscriptions]);
  const annualSpend = useMemo(() => totalAnnualSpend(subscriptions), [subscriptions]);
  const avgCost = subscriptions.length ? monthlySpend / subscriptions.length : 0;
  const categoryTotals = useMemo(
    () => spendByCategory(subscriptions, CATEGORIES),
    [subscriptions]
  );
  const split = useMemo(() => cycleSplit(subscriptions), [subscriptions]);
  const { cheapest, priciest } = useMemo(() => extremeSubscriptions(subscriptions), [subscriptions]);
  const projection = useMemo(() => projectedMonthlySpend(subscriptions, 12), [subscriptions]);

  const maxCategoryAmount = Math.max(1, ...categoryTotals.map((c) => c.amount));
  const maxProjection = Math.max(1, ...projection.map((p) => p.total));
  const peakMonthIndex = projection.reduce(
    (best, p, i) => (p.total > projection[best].total ? i : best),
    0
  );
  const splitTotal = split.monthly.monthlyCost + split.yearly.monthlyCost || 1;

  if (loading) {
    return (
      <div className="subs-dashboard">
        <p className="subs-dashboard__empty">Loading statistics…</p>
      </div>
    );
  }

  return (
    <div className="subs-dashboard">
      <header className="subs-dashboard__header">
        <div>
          <h1>Statistics</h1>
        </div>
        <Link to="/" className="link">
          Back to dashboard
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <p className="subs-dashboard__empty">Add a subscription to see statistics.</p>
      ) : (
        <>
          <div className="stat-tile-grid">
            <div className="stat-tile">
              <span className="stat-tile__label">Monthly spend</span>
              <span className="stat-tile__value">{formatMoney(monthlySpend)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">Projected annual spend</span>
              <span className="stat-tile__value">{formatMoney(annualSpend)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">Active subscriptions</span>
              <span className="stat-tile__value">{subscriptions.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">Average cost / sub</span>
              <span className="stat-tile__value">{formatMoney(avgCost)}</span>
            </div>
          </div>

          <div className="stats-extremes">
            {priciest && (
              <div className="extreme-card">
                <span className="extreme-card__label">Most expensive</span>
                <span className="extreme-card__name">{priciest.name}</span>
                <span className="extreme-card__value">
                  {formatMoney(priciest.price)}
                  {priciest.cycle === 'yearly' ? '/yr' : '/mo'}
                </span>
              </div>
            )}
            {cheapest && (
              <div className="extreme-card">
                <span className="extreme-card__label">Least expensive</span>
                <span className="extreme-card__name">{cheapest.name}</span>
                <span className="extreme-card__value">
                  {formatMoney(cheapest.price)}
                  {cheapest.cycle === 'yearly' ? '/yr' : '/mo'}
                </span>
              </div>
            )}
          </div>

          <section className="stats-card">
            <h2 className="stats-card__heading">Billing cycle split</h2>
            <div className="cycle-split-bar">
              <div
                className="cycle-split-segment"
                style={{
                  width: `${(split.monthly.monthlyCost / splitTotal) * 100}%`,
                  '--segment-color': categoryColor('Entertainment'),
                }}
              />
              <div
                className="cycle-split-segment"
                style={{
                  width: `${(split.yearly.monthlyCost / splitTotal) * 100}%`,
                  '--segment-color': categoryColor('Software'),
                }}
              />
            </div>
            <div className="cycle-split-legend">
              <span className="cycle-split-legend__item">
                <span
                  className="cycle-split-legend__dot"
                  style={{ background: categoryColor('Entertainment') }}
                />
                Monthly — {split.monthly.count} sub{split.monthly.count === 1 ? '' : 's'} ·{' '}
                {formatMoney(split.monthly.monthlyCost)}/mo
              </span>
              <span className="cycle-split-legend__item">
                <span
                  className="cycle-split-legend__dot"
                  style={{ background: categoryColor('Software') }}
                />
                Yearly — {split.yearly.count} sub{split.yearly.count === 1 ? '' : 's'} ·{' '}
                {formatMoney(split.yearly.monthlyCost)}/mo equiv.
              </span>
            </div>
          </section>

          <section className="stats-card">
            <h2 className="stats-card__heading">Spend by category</h2>
            <div className="category-bar-list">
              {categoryTotals.map(({ category, amount }) => (
                <div className="category-bar-row" key={category}>
                  <span className="category-bar-row__label">{category}</span>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{
                        width: `${(amount / maxCategoryAmount) * 100}%`,
                        '--bar-color': categoryColor(category),
                      }}
                    />
                  </div>
                  <span className="category-bar-row__value">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-card">
            <h2 className="stats-card__heading">Projected spend, next 12 months</h2>
            <div className="projection-chart">
              {projection.map(({ month, total }, i) => {
                const heightPct = (total / maxProjection) * 100;
                const isPeak = i === peakMonthIndex && total > 0;
                return (
                  <div className="projection-bar-col" key={month.toISOString()}>
                    {isPeak && <span className="projection-bar__peak-label">{formatMoney(total)}</span>}
                    <div className="projection-bar-track">
                      <button
                        type="button"
                        className="projection-bar"
                        style={{ height: `${Math.max(heightPct, total > 0 ? 3 : 0)}%` }}
                        onMouseEnter={() => setHoveredMonth(i)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        onFocus={() => setHoveredMonth(i)}
                        onBlur={() => setHoveredMonth(null)}
                        aria-label={`${MONTH_FULL_FORMATTER.format(month)}: ${formatMoney(total)}`}
                      >
                        {hoveredMonth === i && (
                          <span className="projection-bar__tooltip">{formatMoney(total)}</span>
                        )}
                      </button>
                    </div>
                    <span className="projection-bar-col__label">
                      {MONTH_LABEL_FORMATTER.format(month)}
                    </span>
                  </div>
                );
              })}
            </div>
            <ul className="sr-only">
              {projection.map(({ month, total }) => (
                <li key={month.toISOString()}>
                  {MONTH_FULL_FORMATTER.format(month)}: {formatMoney(total)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
