import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";

export default function FromBuildr() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function enter() {
      const token = String(params.get("sso_token") || params.get("token") || "").trim();
      if (!token) {
        if (!cancelled) setError("Missing Buildr sign-in token. Open NECalcul8r from the Buildr sidebar.");
        return;
      }

      try {
        if (typeof base44.auth.loginViaBuildrSso !== "function") {
          throw new Error("This NECalcul8r build cannot accept Buildr sign-in yet.");
        }
        await base44.auth.loginViaBuildrSso(token);
        if (!cancelled) navigate("/", { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not sign you in from Buildr. Open NECalcul8r from Buildr again.");
        }
      }
    }

    enter();
    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  if (error) {
    return (
      <AuthLayout title="Buildr sign-in failed" subtitle="Company NECalcul8r">
        <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
        <Button asChild className="mt-6 h-12 w-full">
          <Link to="/login">Sign in with email</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Opening company NECalcul8r" subtitle="Using your Buildr company access">
      <p className="text-sm text-muted-foreground">Signing you in with the same Buildr login…</p>
    </AuthLayout>
  );
}
