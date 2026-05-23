import React from "react";
import OnboardingView from "./OnboardingView.jsx";

export default function SignupView() {
  // Gracefully transition and delegate to our beautiful multi-step Onboarding view starting at step 2!
  return <OnboardingView initialStep={2} />;
}
