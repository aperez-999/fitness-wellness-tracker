import walk from "../assets/activities/walk.svg";
import strength from "../assets/activities/strength.svg";
import run from "../assets/activities/run.svg";
import cycle from "../assets/activities/cycle.svg";
import mobility from "../assets/activities/mobility.svg";
import custom from "../assets/activities/custom.svg";

export const activities = [
  "Walk",
  "Strength",
  "Run",
  "Cycle",
  "Mobility",
  "Custom",
];
const artwork = {
  Walk: walk,
  Strength: strength,
  Run: run,
  Cycle: cycle,
  Mobility: mobility,
  Custom: custom,
};

export default function ActivityArt({ activity }) {
  return (
    <img
      className="activity-art"
      src={artwork[activity] || custom}
      alt=""
      width="120"
      height="88"
    />
  );
}
