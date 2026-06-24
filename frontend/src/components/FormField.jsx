export default function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`mt-1 w-full rounded-lg border px-3 py-2 ${
          error ? "border-rose-400" : "border-slate-300"
        }`}
      />
      {error ? <p className="mt-1 text-sm text-rose-600">{error}</p> : null}
    </label>
  );
}
