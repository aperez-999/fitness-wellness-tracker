import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function WorkoutsPage() {
  return (
    <PageCard
      title="Workouts"
      description="Your workout log will appear here."
    >
      <PlaceholderPanel
        title="Coming in Sprint 3+"
        body="Add workout form and list views will connect to the Workout model in MongoDB."
      />
    </PageCard>
  );
}
