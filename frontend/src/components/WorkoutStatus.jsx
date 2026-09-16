import { useAuth } from "../context/AuthContext.jsx";

export default function WorkoutStatus({
  error,
  sessionExpired,
  updatedAt,
  pending,
  refresh,
}) {
  const { logout } = useAuth();
  if (!error) return null;
  return (
    <div className="progress-error" role="alert">
      <p>
        {error} {updatedAt && "Showing your last loaded workouts."}
      </p>
      {sessionExpired ? (
        <button className="text-link" onClick={logout}>
          Sign in
        </button>
      ) : (
        <button
          className="text-link"
          onClick={() => refresh()}
          disabled={pending}
        >
          Try again
        </button>
      )}
    </div>
  );
}
