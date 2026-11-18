// Too many hues to tell apart alone, so a colour is always shown next to its label.
const CATEGORY_COLORS = {
  Entertainment: '#2a78d6',
  Music: '#8b5cf6',
  Gaming: '#c026d3',
  'News & Reading': '#0891b2',
  Education: '#4f46e5',
  Software: '#eb6834',
  'Work / Productivity': '#92400e',
  'Cloud & Storage': '#38bdf8',
  Utilities: '#1baf7a',
  'Phone & Internet': '#0f766e',
  Home: '#84cc16',
  Health: '#eda100',
  Fitness: '#dc2626',
  Insurance: '#64748b',
  Finance: '#166534',
  Shopping: '#be185d',
  'Food & Delivery': '#facc15',
  Transport: '#1e3a8a',
  Donations: '#9f1239',
  Other: '#e87ba4',
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || '#6B7280';
}
