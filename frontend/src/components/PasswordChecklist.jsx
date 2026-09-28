import Icon from "./Icon.jsx";

export function passwordChecks(password) {
  return [
    { label: "8 characters", met: password.length >= 8 },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function PasswordChecklist({ password }) {
  return (
    <ul className="password-checklist" aria-label="Password requirements" aria-live="polite">
      {passwordChecks(password).map(({ label, met }) => (
        <li key={label} className={met ? "is-met" : ""}>
          <span className="password-checkmark" aria-hidden="true">
            {met ? <Icon name="check" size={12} /> : null}
          </span>
          <span>{label}<span className="sr-only">: {met ? "met" : "not met"}</span></span>
        </li>
      ))}
    </ul>
  );
}
