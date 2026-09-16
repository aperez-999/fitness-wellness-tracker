import { Link, Navigate } from "react-router-dom";

import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <AuthLayout
      title="Your week in movement."
      description="Log your workouts and see your progress take shape."
    >
      <div className="auth-actions">
        <Link to="/signup" className="progress-button">
          Create an account
        </Link>
        <Link to="/login" className="secondary-button">
          Log in
        </Link>
      </div>
    </AuthLayout>
  );
}
