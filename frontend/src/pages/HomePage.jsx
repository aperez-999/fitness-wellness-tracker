import { Link, Navigate } from "react-router-dom";

import walk from "../assets/activities/walk.svg";
import run from "../assets/activities/run.svg";
import strength from "../assets/activities/strength.svg";
import saladBowl from "../assets/nutrition/salad-bowl.svg";
import Brand from "../components/Brand.jsx";
import Icon from "../components/Icon.jsx";
import MovementMascot from "../components/MovementMascot.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./welcome.css";

const capabilities = [
  { icon: "workout", title: "Workouts", text: "Log a walk, a lift, or whatever you did today.", art: walk },
  { icon: "nutrition", title: "Nutrition", text: "Keep calories and meals in one quiet journal.", art: saladBowl },
  { icon: "goals", title: "Goals", text: "Set a target and watch the progress add up.", art: run },
  { icon: "activity", title: "Progress", text: "See the week you actually moved.", art: strength },
];

const previewDays = ["M", "T", "W", "T", "F", "S", "S"];

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <main className="dayform-theme welcome-page">
      <span className="welcome-glow welcome-glow-honey" aria-hidden="true" />
      <span className="welcome-glow welcome-glow-rose" aria-hidden="true" />
      <header className="welcome-bar">
        <Brand to="/" />
        <Link to="/login" className="text-link">Log in</Link>
      </header>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="welcome-kicker">
            <span aria-hidden="true" />A fitness and wellness companion
          </p>
          <h1>A kinder place to keep your week.</h1>
          <p>
            Dayform is where workouts, meals, and goals live together, so you can see the days you showed up.
          </p>
          <div className="welcome-actions">
            <Link to="/signup" className="progress-button">
              Get started
              <Icon name="arrow" size={18} />
            </Link>
            <Link to="/login" className="secondary-button">Log in</Link>
          </div>
          <p className="welcome-note">Everything you log stays private to your account.</p>
        </div>
        <div className="welcome-preview" aria-hidden="true">
          <span className="welcome-dot welcome-dot-a" />
          <span className="welcome-dot welcome-dot-b" />
          <span className="welcome-dot welcome-dot-c" />
          <div className="preview-rhythm">
            <p>Your weekly rhythm</p>
            <div className="preview-bars">
              {previewDays.map((day, index) => (
                <span key={index} style={{ "--step": index }}>
                  <i />
                  {day}
                </span>
              ))}
            </div>
          </div>
          <div className="preview-mascot">
            <p>Time in movement</p>
            <MovementMascot count={0} />
          </div>
          <img className="welcome-buddy preview-buddy preview-buddy-walk" src={walk} alt="" width="120" height="88" />
          <img className="welcome-buddy preview-buddy preview-buddy-run" src={run} alt="" width="120" height="88" />
          <img className="welcome-buddy preview-buddy preview-buddy-strength" src={strength} alt="" width="120" height="88" />
        </div>
      </section>
      <section className="welcome-capabilities" aria-labelledby="welcome-capabilities-title">
        <h2 id="welcome-capabilities-title">What you can keep here</h2>
        <ul>
          {capabilities.map((item) => (
            <li key={item.title}>
              <span className="capability-icon"><Icon name={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <img src={item.art} alt="" width="120" height="88" />
            </li>
          ))}
        </ul>
      </section>
      <section className="welcome-invite" aria-labelledby="welcome-invite-title">
        <img src={run} alt="" width="120" height="88" />
        <div>
          <h2 id="welcome-invite-title">Your first day starts with one entry.</h2>
          <p>Create an account and log something small today.</p>
        </div>
        <Link to="/signup" className="progress-button">Create an account</Link>
      </section>
      <footer className="welcome-footer">
        <span>Dayform</span>
        <span>A record of how you move and eat.</span>
      </footer>
    </main>
  );
}
