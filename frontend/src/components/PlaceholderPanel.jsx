export default function PlaceholderPanel({ title, body }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
      <h2 className="font-medium text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
