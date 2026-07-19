import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function WorkoutsPage() {
  return (
    <PageCard
      title="Workouts"
      description="Your workout log will appear here."
    >
      <PlaceholderPanel
        title="Planned for Capstone 2"
        body="Workout list and add form will connect to GET/POST /api/workouts per docs/api.md and docs/wireframes.md."
      />
    </PageCard>
  );
}
