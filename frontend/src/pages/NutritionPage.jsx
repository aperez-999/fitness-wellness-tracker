import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function NutritionPage() {
  return (
    <PageCard
      title="Nutrition"
      description="Track meals and calories here."
    >
      <PlaceholderPanel
        title="Planned for Capstone 2"
        body="Nutrition list and add form will use GET/POST /api/nutrition per docs/api.md."
      />
    </PageCard>
  );
}
