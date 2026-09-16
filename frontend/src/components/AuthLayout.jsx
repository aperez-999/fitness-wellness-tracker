import Brand from "./Brand.jsx";
import "./auth-layout.css";

export default function AuthLayout({ title, description, children }) {
  return (
    <main className="dayform-theme auth-page">
      <div className="auth-shell">
        <Brand to="/" />
        <section className="auth-card" aria-labelledby="auth-title">
          <header>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
