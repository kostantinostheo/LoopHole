// Native <select>; options: [{ value, label }], onChange receives the value.
export default function SelectInput({ options, onChange, ...props }) {
  return (
    <select className="text-input select-input" onChange={(e) => onChange(e.target.value)} {...props}>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
