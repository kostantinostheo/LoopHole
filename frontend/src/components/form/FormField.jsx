// Labelled control. Without children it renders a text input whose onChange receives the value.
export default function FormField({ label, className = '', children, onChange, ...inputProps }) {
  return (
    <label className={`subs-form__field ${className}`}>
      <span className="subs-form__label">{label}</span>
      {children ?? (
        <input className="text-input" onChange={(e) => onChange(e.target.value)} {...inputProps} />
      )}
    </label>
  );
}
