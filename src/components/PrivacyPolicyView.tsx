import LegalPageLayout, { Section } from "./LegalPageLayout.jsx";
import { SUPPORT_EMAIL } from "../constants.js";

export default function PrivacyPolicyView() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="30 May 2026">
      <Section title="1. Who we are">
        <p>
          AdrieChartered Bank (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy.
          This policy explains how we collect, use, store, and share personal information when you
          use our website, mobile channels, and online banking services.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>We may collect the following types of information:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Identity and contact details (name, email, phone number)</li>
          <li>Account and authentication data (account number, login credentials, verification codes)</li>
          <li>Transaction and banking activity (transfers, balances, payment references)</li>
          <li>Profile preferences (currency display, profile photo if uploaded)</li>
          <li>Technical data (device type, browser, IP address, session logs)</li>
        </ul>
      </Section>

      <Section title="3. How we use your information">
        <p>We use personal information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Open, manage, and secure your account</li>
          <li>Process payments and maintain transaction records</li>
          <li>Send verification codes and important service notifications</li>
          <li>Prevent fraud, abuse, and unauthorised access</li>
          <li>Improve our digital banking experience and comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="4. Legal bases for processing">
        <p>
          Depending on the activity, we process your data based on contract performance (providing
          banking services), legal obligations (regulatory and anti-fraud requirements), legitimate
          interests (security and service improvement), and your consent where required (such as
          optional marketing communications, if offered).
        </p>
      </Section>

      <Section title="5. Sharing your information">
        <p>
          We do not sell your personal information. We may share data with trusted service providers
          who help us operate the platform (such as email delivery, SMS verification, and cloud
          hosting), always under appropriate confidentiality and security obligations.
        </p>
        <p>
          We may also disclose information where required by law, regulation, court order, or to
          protect the rights and safety of our customers and the bank.
        </p>
      </Section>

      <Section title="6. Data retention">
        <p>
          We retain personal information for as long as your account is active and for a reasonable
          period afterwards to meet legal, regulatory, and audit requirements. When data is no
          longer needed, we delete or anonymise it securely.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We use industry-standard safeguards including encryption, access controls, and multi-step
          verification. No method of transmission or storage is completely secure, but we
          continuously work to protect your information.
        </p>
      </Section>

      <Section title="8. Your rights">
        <p>
          Depending on applicable law, you may have the right to access, correct, delete, or
          restrict processing of your personal data, and to object to certain uses or request
          portability. To exercise these rights, contact us using the details below.
        </p>
      </Section>

      <Section title="9. Cookies and similar technologies">
        <p>
          Our portal may use essential cookies and local storage to keep you signed in and maintain
          session security. We do not use non-essential tracking cookies without appropriate notice
          and consent where required.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top
          of this page will reflect the latest version. Significant changes will be communicated
          through the portal or by email where appropriate.
        </p>
      </Section>

      <Section title="11. Contact us">
        <p>
          For privacy questions or requests, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#4A90D9] font-semibold hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalPageLayout>
  );
}
