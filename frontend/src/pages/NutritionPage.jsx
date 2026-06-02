import PageCard from "../components/PageCard.jsx";
import PlaceholderPanel from "../components/PlaceholderPanel.jsx";

export default function NutritionPage() {
  return (
    <PageCard
      title="Nutrition"
      description="Track meals and calories here."
    >
      <PlaceholderPanel
        title="Coming in Sprint 3+"
        body="Nutrition entries will use the NutritionLog collection defined in the ERD."
      />
    </PageCard>
  );
}
