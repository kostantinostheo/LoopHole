import { FiCalendar } from 'react-icons/fi';

// iOS Safari shows an empty date input as a blank box, so add a placeholder and icon.
// CSS only reveals them on iOS.
export default function DateInput({ value, placeholder = 'Select date', ...props }) {
  return (
    <div className="date-field">
      <input type="date" className="text-input" value={value} {...props} />
      {!value && (
        <span className="date-field__placeholder" aria-hidden="true">
          {placeholder}
        </span>
      )}
      <FiCalendar className="date-field__icon" aria-hidden="true" />
    </div>
  );
}
