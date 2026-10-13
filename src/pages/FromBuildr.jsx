import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { bootstrapBuildrSso, saveBuildrCompanyBinding } from "@/api/buildrSso";

export default function FromBuildr() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState("Opening your company NECalcul8r…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    async function run() {
      const token = String(params.get("sso_token") || "").trim();
      const expectedCompanyId = String(params.get("company_id") || "").trim();

      const bootstrap = await bootstrapBuildrSso(token);
      if (cancelled) return;
      if (!bootstrap?.valid) {
        setError(bootstrap?.message || bootstrap?.error || "Buildr sign-in failed.");
        return;
      }

      const companyId = String(bootstrap.company_id || "").trim();
      const companyName = String(bootstrap.company_name || "").trim();
      const email = String(bootstrap.email || "").trim().toLowerCase();
      const password = String(bootstrap.password || "");

      if (!email || !password || !companyId) {
        setError("Buildr returned an incomplete NECalcul8r sign-in.");
        return;
      }
      if (expectedCompanyId && expectedCompanyId !== companyId) {
        setError("This NECalcul8r handoff belongs to a different company.");
        return;
      }

      setStatus("Signing you into the company NECalcul8r…");

      let signedIn = false;
      try {
        await base44.auth.loginViaEmailPassword(email, password);
        signedIn = true;
      } catch (loginError) {
        setStatus("Creating your company NECalcul8r access…");
        try {
          const registration = await base44.auth.register({
            email,
            password,
            organizationName: companyName || "Buildr Company",
          });
          if (registration?.pendingEmailConfirmation) {
            setError("NECalcul8r created the company account, but Supabase requires email confirmation before the first automatic sign-in.");
            return;
          }
          signedIn = true;
        } catch (registerError) {
          setError(
            registerError?.message ||
            loginError?.message ||
            "NECalcul8r could not create the Buildr company session."
          );
          return;
        }
      }

      if (!signedIn || cancelled) return;

      saveBuildrCompanyBinding({ companyId, companyName, email });
      window.history.replaceState({}, document.title, "/");
      navigate("/", { replace: true });
      window.location.reload();
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <AuthLayout title="Opening NECalcul8r" subtitle="Buildr company sign-in">
      {error ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
          <Button type="button" className="w-full" onClick={() => window.location.assign("/")}>
            Go to NECalcul8r
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-center text-sm text-muted-foreground">{status}</p>
        </div>
      )}
    </AuthLayout>
  );
}
