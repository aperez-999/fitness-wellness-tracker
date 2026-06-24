import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <PageCard
      title="Profile"
      description="Account details for the signed-in user."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="text-slate-800">{user?.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Display name</dt>
          <dd className="text-slate-800">{user?.displayName || "—"}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <PlaceholderPanel
          title="Account settings"
          body="Display name editing and additional profile options are planned for a future sprint."
        />
      </div>
    </PageCard>
  );
}
