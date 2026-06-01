import LegalPageLayout, { Section } from "./LegalPageLayout.jsx";
import { SUPPORT_EMAIL } from "../constants.js";

export default function TermsOfServiceView() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="30 May 2026">
      <Section title="1. About these terms">
        <p>
          These Terms of Service govern your use of AdrieChartered Bank&apos;s online banking portal,
          mobile services, and related digital channels (together, the &quot;Services&quot;).
        </p>
        <p>
          By opening an account, signing in, or using our Services, you agree to these terms.
          If you do not agree, please do not use the Services.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old and legally capable of entering into a binding agreement
          to use our Services. You must provide accurate information during registration and keep
          your details up to date.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You are responsible for keeping your login credentials, security codes, and devices secure.
          Notify us immediately if you suspect unauthorised access to your account.
        </p>
        <p>
          We may suspend or restrict access to your account where we reasonably believe there is
          fraud, a security risk, or a breach of these terms.
        </p>
      </Section>

      <Section title="4. Banking services">
        <p>
          Account features may include balances, transfers, transaction history, and multi-currency
          display preferences. Availability of specific features may vary and can change over time.
        </p>
        <p>
          Transfer limits, verification steps, and processing times may apply. You must ensure
          recipient details are correct before confirming a payment.
        </p>
      </Section>

      <Section title="5. Fees and charges">
        <p>
          Standard account fees, if any, will be disclosed before you confirm a transaction or
          product selection. We will provide notice of material fee changes where required by law.
        </p>
      </Section>

      <Section title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the Services for unlawful, fraudulent, or abusive purposes</li>
          <li>Attempt to bypass security controls or access another customer&apos;s account</li>
          <li>Interfere with the normal operation of our systems or networks</li>
          <li>Provide false or misleading information to us or to other users</li>
        </ul>
      </Section>

      <Section title="7. Intellectual property">
        <p>
          All content, branding, software, and materials within the Services remain the property of
          AdrieChartered Bank or its licensors. You may not copy, modify, or redistribute them
          without our written permission.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, AdrieChartered Bank is not liable for indirect,
          incidental, or consequential losses arising from your use of the Services, except where
          such limitation is prohibited by applicable regulation.
        </p>
        <p>
          Nothing in these terms limits your statutory rights as a banking customer where applicable.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>
          We may update these terms from time to time. Material changes will be communicated through
          the portal, email, or other appropriate channels. Continued use of the Services after
          changes take effect constitutes acceptance of the updated terms.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#4A90D9] font-semibold hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPageLayout>
  );
}
