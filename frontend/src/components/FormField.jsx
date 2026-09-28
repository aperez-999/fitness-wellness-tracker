import { useState } from "react";
import Icon from "./Icon.jsx";

export default function FormField({
  id, label, error, invalid = Boolean(error), hint, type = "text",
  visibilityLabel = "password", ...props
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const description = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  const input = (
    <input
      id={id}
      required
      aria-invalid={invalid}
      aria-describedby={description || undefined}
      {...props}
      type={isPassword && visible ? "text" : type}
    />
  );

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {isPassword ? (
        <div className="password-input">
          {input}
          <button
            className="password-toggle"
            type="button"
            aria-label={`${visible ? "Hide" : "Show"} ${visibilityLabel}`}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <Icon name={visible ? "eye" : "eyeClosed"} />
          </button>
        </div>
      ) : input}
      {hint && <div id={`${id}-hint`} className="field-hint">{hint}</div>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}
