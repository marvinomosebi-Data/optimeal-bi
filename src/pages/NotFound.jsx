import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f9fafb",
      fontFamily: "inherit"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "48px",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        maxWidth: "400px"
      }}>
        <div style={{ fontSize: "64px", fontWeight: "800", color: "#1e293b" }}>404</div>
        <div style={{ fontSize: "20px", fontWeight: "600", margin: "12px 0 8px" }}>
          Oops! This page doesn't exist.
        </div>
        <div style={{ color: "#64748b", marginBottom: "32px" }}>
          The route you're looking for isn't here.
        </div>
        <button
          onClick={() => navigate("/app/plan")}
          style={{
            background: "#1e293b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 32px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}
