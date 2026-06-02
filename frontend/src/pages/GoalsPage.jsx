import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function GoalsPage() {
  return (
    <PageCard title="Goals" description="Set and monitor wellness goals.">
      <PlaceholderPanel
        title="Coming in Sprint 3+"
        body="Goal creation and progress tracking will align with the Goal schema in docs/database-schema.md."
      />
    </PageCard>
  );
}
