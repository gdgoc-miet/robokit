"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthStep = "signIn" | "signUp" | "forgotPassword" | "resetCode";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<AuthStep>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const router = useRouter();

  const handlePasswordAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", step === "signUp" ? "signUp" : "signIn");

    try {
      await signIn("password", formData);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "github" | "google") => {
    setLoading(true);
    setError(null);
    try {
      await signIn(provider, { redirectTo: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    formData.set("flow", "reset");

    try {
      await signIn("password", formData);
      setResetEmail(email);
      setStep("resetCode");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset code",
      );
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", "reset-verification");
    formData.set("email", resetEmail);

    try {
      await signIn("password", formData);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-lg mx-auto min-h-screen justify-center items-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo and Title */}
      <div className="text-center flex flex-col items-center gap-4">
        <Logo size={100} />
        <h1 className="text-4xl font-bold text-foreground">RobKit</h1>
        <p className="text-sm text-muted-foreground">
          GDGoC MIET - Google Developers Club on Campus
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          Practice pathfinding algorithms and compete with your team on the
          leaderboard.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-center">
            {step === "signIn" && "Welcome Back"}
            {step === "signUp" && "Create Account"}
            {step === "forgotPassword" && "Reset Password"}
            {step === "resetCode" && "Enter Reset Code"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Buttons - Show on signIn and signUp */}
          {(step === "signIn" || step === "signUp") && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOAuth("github")}
                disabled={loading}
                className="w-full"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Sign In / Sign Up Form */}
          {(step === "signIn" || step === "signUp") && (
            <form onSubmit={handlePasswordAuth} className="space-y-4">
              {step === "signUp" && (
                <Input
                  name="name"
                  placeholder="Full Name"
                  type="text"
                  required
                />
              )}
              <Input name="email" placeholder="Email" type="email" required />
              <Input
                name="password"
                placeholder="Password"
                type="password"
                minLength={8}
                required
              />
              {step === "signUp" && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Loading..."
                  : step === "signIn"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            </form>
          )}

          {/* Forgot Password Form */}
          {step === "forgotPassword" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your email address and we&apos;ll send you a code to reset
                your password.
              </p>
              <Input name="email" placeholder="Email" type="email" required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </Button>
            </form>
          )}

          {/* Reset Code Form */}
          {step === "resetCode" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter the code sent to <strong>{resetEmail}</strong> and your
                new password.
              </p>
              <Input
                name="code"
                placeholder="8-digit code"
                type="text"
                maxLength={8}
                required
              />
              <Input
                name="newPassword"
                placeholder="New Password"
                type="password"
                minLength={8}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Links */}
          <div className="text-center text-sm space-y-2">
            {step === "signIn" && (
              <>
                <p>
                  <span className="text-muted-foreground">
                    Don&apos;t have an account?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("signUp");
                      setError(null);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("forgotPassword");
                      setError(null);
                    }}
                    className="text-muted-foreground hover:text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                </p>
              </>
            )}
            {step === "signUp" && (
              <p>
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("signIn");
                    setError(null);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {(step === "forgotPassword" || step === "resetCode") && (
              <p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("signIn");
                    setError(null);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  ← Back to sign in
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
