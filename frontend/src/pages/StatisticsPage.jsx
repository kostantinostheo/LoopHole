import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { categoryColor } from '../utils/categories';
import { formatMoney as formatMoneyIn, formatPrice, monthlyCost, totalMonthlyCost } from '../utils/money';
import { cycleSplit, projectedSpend, spendByCategory } from '../utils/statistics';

const MONTH_SHORT_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short' });
const MONTH_FULL_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const MONTHLY_COLOR = categoryColor('Entertainment');
const YEARLY_COLOR = categoryColor('Software');

const plural = (count) => `${count} sub${count === 1 ? '' : 's'}`;

export default function StatisticsPage() {
  const { subscriptions, loading } = useSubscriptions();
  const { user } = useAuth();
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const formatMoney = (amount) => formatMoneyIn(amount, user?.currency);

  const stats = useMemo(() => {
    const byCost = [...subscriptions].sort((a, b) => monthlyCost(a) - monthlyCost(b));
    return {
      monthly: totalMonthlyCost(subscriptions),
      categories: spendByCategory(subscriptions),
      split: cycleSplit(subscriptions),
      projection: projectedSpend(subscriptions),
      extremes: [
        ['Most expensive', byCost.at(-1)],
        ['Least expensive', byCost[0]],
      ],
    };
  }, [subscriptions]);

  if (loading) {
    return (
      <div className="subs-dashboard">
        <p className="subs-dashboard__empty">Loading statistics…</p>
      </div>
    );
  }

  const { monthly, categories, split, projection, extremes } = stats;
  const tiles = [
    ['Monthly spend', formatMoney(monthly)],
    ['Projected annual spend', formatMoney(monthly * 12)],
    ['Active subscriptions', subscriptions.length],
    ['Average cost / sub', formatMoney(subscriptions.length ? monthly / subscriptions.length : 0)],
  ];
  const maxCategory = Math.max(1, ...categories.map(([, amount]) => amount));
  const maxProjection = Math.max(1, ...projection.map((p) => p.total));
  const peakIndex = projection.reduce((best, p, i) => (p.total > projection[best].total ? i : best), 0);
  const splitTotal = split.monthly.monthlyCost + split.yearly.monthlyCost || 1;

  return (
    <div className="subs-dashboard">
      <PageHeader title="Statistics" />

      {subscriptions.length === 0 ? (
        <p className="subs-dashboard__empty">Add a subscription to see statistics.</p>
      ) : (
        <>
          <div className="stat-tile-grid">
            {tiles.map(([label, value]) => (
              <div className="stat-tile" key={label}>
                <span className="stat-tile__label">{label}</span>
                <span className="stat-tile__value">{value}</span>
              </div>
            ))}
          </div>

          <div className="stats-extremes">
            {extremes.map(([label, sub]) => (
              <div className="extreme-card" key={label}>
                <span className="extreme-card__label">{label}</span>
                <span className="extreme-card__name">{sub.name}</span>
                <span className="extreme-card__value">{formatPrice(sub, user?.currency)}</span>
              </div>
            ))}
          </div>

          <section className="stats-card">
            <h2 className="stats-card__heading">Billing cycle split</h2>
            <div className="cycle-split-bar">
              {[
                [split.monthly, MONTHLY_COLOR],
                [split.yearly, YEARLY_COLOR],
              ].map(([group, color]) => (
                <div
                  key={color}
                  className="cycle-split-segment"
                  style={{ width: `${(group.monthlyCost / splitTotal) * 100}%`, '--segment-color': color }}
                />
              ))}
            </div>
            <div className="cycle-split-legend">
              <span className="cycle-split-legend__item">
                <span className="cycle-split-legend__dot" style={{ background: MONTHLY_COLOR }} />
                Monthly — {plural(split.monthly.count)} · {formatMoney(split.monthly.monthlyCost)}/mo
              </span>
              <span className="cycle-split-legend__item">
                <span className="cycle-split-legend__dot" style={{ background: YEARLY_COLOR }} />
                Yearly — {plural(split.yearly.count)} · {formatMoney(split.yearly.monthlyCost)}/mo equiv.
              </span>
            </div>
          </section>

          <section className="stats-card">
            <h2 className="stats-card__heading">Spend by category</h2>
            <div className="category-bar-list">
              {categories.map(([category, amount]) => (
                <div className="category-bar-row" key={category}>
                  <span className="category-bar-row__label">{category}</span>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{
                        width: `${(amount / maxCategory) * 100}%`,
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
              {projection.map(({ month, total }, i) => (
                <div className="projection-bar-col" key={month.toISOString()}>
                  {i === peakIndex && total > 0 && (
                    <span className="projection-bar__peak-label">{formatMoney(total)}</span>
                  )}
                  <div className="projection-bar-track">
                    {/* Non-zero months stay visible as at least a 3% sliver. */}
                    <button
                      type="button"
                      className="projection-bar"
                      style={{ height: `${Math.max((total / maxProjection) * 100, total > 0 ? 3 : 0)}%` }}
                      onMouseEnter={() => setHoveredMonth(i)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      onFocus={() => setHoveredMonth(i)}
                      onBlur={() => setHoveredMonth(null)}
                      aria-label={`${MONTH_FULL_FORMAT.format(month)}: ${formatMoney(total)}`}
                    >
                      {hoveredMonth === i && (
                        <span className="projection-bar__tooltip">{formatMoney(total)}</span>
                      )}
                    </button>
                  </div>
                  <span className="projection-bar-col__label">{MONTH_SHORT_FORMAT.format(month)}</span>
                </div>
              ))}
            </div>
            <ul className="sr-only">
              {projection.map(({ month, total }) => (
                <li key={month.toISOString()}>
                  {MONTH_FULL_FORMAT.format(month)}: {formatMoney(total)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
