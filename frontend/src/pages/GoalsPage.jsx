import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function GoalsPage() {
  return (
    <PageCard title="Goals" description="Set and monitor wellness goals.">
      <PlaceholderPanel
        title="Planned for Capstone 2"
        body="Goal creation and progress tracking will use /api/goals per docs/wireframes.md."
      />
    </PageCard>
  );
}
