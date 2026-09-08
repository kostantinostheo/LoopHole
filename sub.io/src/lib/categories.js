export const CATEGORIES = ['Entertainment', 'Software', 'Utilities', 'Health', 'Other'];

// Fixed hue order validated for CVD-safe adjacency (see dataviz palette check) —
// keep categories rendered in this same order wherever color identity matters.
export const CATEGORY_COLORS = {
  Entertainment: '#2a78d6',
  Software: '#eb6834',
  Utilities: '#1baf7a',
  Health: '#eda100',
  Other: '#e87ba4',
};

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || '#6B7280';
}
