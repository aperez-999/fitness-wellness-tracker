import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function ProfilePage() {
  return (
    <PageCard
      title="Profile"
      description="Account details for the signed-in user."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="text-slate-800">not signed in</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Display name</dt>
          <dd className="text-slate-800">—</dd>
        </div>
      </dl>
      <div className="mt-6">
        <PlaceholderPanel
          title="Account settings"
          body="Profile editing and logout will be wired when authentication is implemented."
        />
      </div>
    </PageCard>
  );
}
