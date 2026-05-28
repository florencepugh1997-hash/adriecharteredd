import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import twilio from "twilio";
import {
  findUserByEmail,
  findUserByEmailOrAccountNumber,
  createUser,
  updateUser,
  findUserById,
  addTransaction,
  getTransactions,
  getDatabaseMode,
  getPendingSignups,
  createPendingSignup,
  deletePendingSignup,
  findPendingSignupByEmail,
  findPendingSignupById,
  findPendingSignupByAccountNumber,
  updatePendingSignup,
} from "./src/db.js";
import { CurrencyCode, OtpMethod } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ---------------- LAZY UTILITY CLIENTS ----------------

// Nodemailer Transporter (Gmail app passwords are often pasted with spaces — strip them)
function getEmailCredentials() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.replace(/\s+/g, "");
  return { user, pass };
}

function isEmailConfigured(): boolean {
  const { user, pass } = getEmailCredentials();
  return !!(user && pass);
}

const SMTP_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function getMailTransporter() {
  const host = process.env.EMAIL_HOST?.trim();
  const port = Number(process.env.EMAIL_PORT) || 587;
  const { user, pass } = getEmailCredentials();

  if (user && pass) {
    return nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });
  }
  return null;
}

function deliveryErrorMessage(method: OtpMethod, details: string): string {
  if (method === "email") {
    if (!isEmailConfigured()) {
      return "Email is not configured on the server. Set EMAIL_USER and EMAIL_PASS (Gmail app password) in Render environment variables.";
    }
    return `Email could not be delivered. ${details} Check your spam folder, or ask your admin to verify Gmail app-password settings.`;
  }
  return `Could not deliver code via ${method}. ${details}`;
}

// Twilio Client
function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    return twilio(sid, token);
  }
  return null;
}

// Helper: Mask email
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

// Helper: Mask phone (+447911123456 -> +44 **** **456)
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const country = phone.startsWith("+") ? phone.slice(0, 3) : "+44";
  const rest = phone.slice(country.length);
  if (rest.length <= 3) return `${country} **** ${rest}`;
  return `${country} **** **${rest.slice(-3)}`;
}

// Middleware: Authenticate Request via Bearer Token (strictly mapped to active user context)
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  try {
    const user = await findUserById(token);
    if (!user) {
      return res.status(403).json({ error: "Session expired or invalid user." });
    }
    // Route user context to request
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Authentication failed." });
  }
}

// ---------------- REST API ROUTES ----------------

// 1. Health & Database Mode Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: getDatabaseMode(),
    emailConfigured: isEmailConfigured(),
    // Helps debug Render: env group must be linked to THIS web service, then redeploy
    envPresent: {
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      EMAIL_HOST: !!process.env.EMAIL_HOST,
      MONGODB_URI: !!process.env.MONGODB_URI,
      NODE_ENV: process.env.NODE_ENV || null,
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. POST /api/auth/signup -> Register User (Queued for admin approval)
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, email, phone, password, currency, accountNumber: preferredAcct } = req.body;

    if (!fullName || !email || !phone || !password || !currency) {
      return res.status(400).json({ error: "All fields are required to register." });
    }

    const normEmail = email.toLowerCase().trim();
    
    // Check if they are already fully registered
    const existing = await findUserByEmail(normEmail);
    if (existing) {
      return res.status(400).json({ error: "Email address is already registered in our active database." });
    }

    // Check if they are already in the pending list
    const existingPending = await findPendingSignupByEmail(normEmail);
    if (existingPending) {
      return res.status(400).json({ error: "A registration request is already pending approval for this email address." });
    }

    // If preferred account number requested, check active & pending taken status
    let accountNumber = preferredAcct ? String(preferredAcct).trim() : undefined;
    if (accountNumber) {
      if (accountNumber.length !== 10 || isNaN(Number(accountNumber))) {
        return res.status(400).json({ error: "Preferred Account Number must reside within exact 10-digit constraints." });
      }
      
      const takenActive = await findUserByEmailOrAccountNumber(accountNumber);
      if (takenActive) {
        return res.status(400).json({ error: "The chosen Preferred Account Number is already in-use on our active database." });
      }

      // Check others in pending queue to avoid collisions
      const pendingSignups = await getPendingSignups();
      const takenPending = pendingSignups.find(p => p.accountNumber === accountNumber);
      if (takenPending) {
        return res.status(400).json({ error: "The chosen Preferred Account Number is already reserved by another pending applicant." });
      }
    }

    // Hash Password securely
    const hashedPassword = bcrypt.hashSync(password, 12);

    // Save registration into the pending list
    const pendingReq = await createPendingSignup({
      fullName,
      email: normEmail,
      phone,
      password: hashedPassword,
      currency: currency as CurrencyCode,
      accountNumber,
    });

    res.status(202).json({
      status: "pending",
      message: "Your onboarding profile has been registered and is queued for private banking authorization.",
      pendingId: pendingReq._id,
      email: normEmail,
    });
  } catch (err: any) {
    console.error("Signup pending request registration error:", err);
    res.status(500).json({ error: "An internal signup reservation error occurred." });
  }
});

// GET /api/admin/pending -> Retrieve pending applications
app.get("/api/admin/pending", async (req, res) => {
  try {
    const list = await getPendingSignups();
    res.json({ pending: list });
  } catch (err: any) {
    console.error("Admin list pending error:", err);
    res.status(500).json({ error: "Failed to retrieve pending registrations." });
  }
});

// POST /api/admin/approve -> Authorize and fully provision a user account
app.post("/api/admin/approve", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Pending Registration Request ID is required." });
    }

    const pending = await findPendingSignupById(id);
    if (!pending) {
      return res.status(404).json({ error: "Onboarding application request not found or already verified." });
    }

    if (!pending.isEmailVerified) {
      return res.status(400).json({
        error: "This applicant has not verified their security code yet. They must complete OTP verification before approval.",
      });
    }

    // Verify email is still available in the main database
    const existing = await findUserByEmail(pending.email);
    if (existing) {
      await deletePendingSignup(id); // Already exists, clean up
      return res.status(400).json({ error: "Email address is already registered in our active cluster." });
    }

    // Resolve Account Number
    let accountNumber = pending.accountNumber;
    if (!accountNumber) {
      // Auto-generate if blank
      let unique = false;
      while (!unique) {
        const candidate = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const taken = await findUserByEmailOrAccountNumber(candidate);
        if (!taken) {
          accountNumber = candidate;
          unique = true;
        }
      }
    } else {
      // Validate requested number is still available
      const taken = await findUserByEmailOrAccountNumber(accountNumber);
      if (taken) {
        return res.status(400).json({ error: "The preferred account number is already in-use on our live node. Reject or ask applicant to choose another." });
      }
    }

    // Sort Code
    const rsc = () => Math.floor(10 + Math.random() * 90).toString();
    const sortCode = `${rsc()}-${rsc()}-${rsc()}`;

    // Create the active user
    const created = await createUser({
      fullName: pending.fullName,
      email: pending.email,
      phone: pending.phone,
      password: pending.password, // Preloaded hashedPassword passed directly
      accountNumber,
      sortCode,
      currency: pending.currency,
      balance: 1000.00, // Pre-funded pre-filled credit
      isVerified: false,
    } as any);

    // Remove from pending list
    await deletePendingSignup(id);

    // Send Welcome Email
    const transporter = getMailTransporter();
    const emailSubject = "Welcome to AdrieChartered - Profile Approved & Provisioned";
    const emailContent = `Dear ${pending.fullName},

We are pleased to inform you that your private digital banking account application with AdrieChartered has been APPROVED.

Your personal wealth management profile is now fully provisioned and open. Here are your credentials:

- Full Name: ${pending.fullName}
- Account Number: ${accountNumber}   <-- USE THIS OR YOUR EMAIL TO LOG IN
- Sort Code: ${sortCode}
- Opening Balance: ${pending.currency} 1,000.00 (Complimentary pre-funded credit)

To proceed, enter the banking portal using your Email or Account Number alongside your password, and verify-token with your temporary secure cellular code.

Best regards,
AdrieChartered Private Compliance Audit Team`;

    let emailStatus = "";
    const { user: smtpUser } = getEmailCredentials();
    if (transporter && smtpUser) {
      try {
        await transporter.sendMail({
          from: `"AdrieChartered Support" <${smtpUser}>`,
          to: pending.email,
          subject: emailSubject,
          text: emailContent,
        });
        emailStatus = "DELIVERED LIVE VIA SMTP";
      } catch (err: any) {
        console.error("Welcome Approval SMTP Delivery Failed:", err.message);
        emailStatus = `SMTP failure: ${err.message}`;
      }
    } else {
      emailStatus = "MOCKED (No SMTP credentials configured)";
    }

    console.log(`\n=============================================================`);
    console.log(`[WELCOME DISPATCH / APPROVED]: New Account Active for ${pending.fullName}`);
    console.log(`[RECIPIENT EMAIL]:  ${pending.email}`);
    console.log(`[ACCOUNT NUMBER]:   ${accountNumber}`);
    console.log(`[SORT CODE]:       ${sortCode}`);
    console.log(`[STATUS]:          ${emailStatus}`);
    console.log(`=============================================================\n`);

    res.json({
      success: true,
      message: "Application approved. Onboarding complete & digital account provisioned.",
      user: {
        userId: created._id,
        email: created.email,
        accountNumber: created.accountNumber,
      }
    });
  } catch (err: any) {
    console.error("Admin approval error:", err);
    res.status(500).json({ error: "An internal database provisioning error occurred." });
  }
});

// POST /api/admin/reject -> Reject/Cancel a pending signup request
app.post("/api/admin/reject", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Pending Request ID is required." });
    }

    const pending = await findPendingSignupById(id);
    if (!pending) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    await deletePendingSignup(id);

    console.log(`\n=============================================================`);
    console.log(`[SIGNUP CANCELLED]: Registration Rejected by Admin`);
    console.log(`[APPLICANT]: ${pending.fullName} (${pending.email})`);
    console.log(`=============================================================\n`);

    res.json({ success: true, message: "Onboarding application has been rejected and deleted." });
  } catch (err: any) {
    console.error("Admin rejection error:", err);
    res.status(500).json({ error: "Failed to cancel the pending application." });
  }
});

// 3. POST /api/auth/login -> Verify Credentials & Pre-auth
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email/Account Number and password are required." });
    }

    const identifier = String(email).trim();
    const user = await findUserByEmailOrAccountNumber(identifier);
    if (!user) {
      let pending =
        (await findPendingSignupByEmail(identifier)) ||
        (/^\d{10}$/.test(identifier) ? await findPendingSignupByAccountNumber(identifier) : null);

      if (pending) {
        if (!pending.isEmailVerified) {
          return res.status(400).json({
            error: "Please finish signup and verify your security code before signing in.",
          });
        }
        return res.status(400).json({
          error: "Your application is awaiting admin approval. You can sign in after your account is approved.",
        });
      }

      return res.status(400).json({ error: "No account found with this email or account number." });
    }

    const storedPassword = (user as { password?: string }).password;
    if (!storedPassword) {
      console.error("Login blocked: active user record is missing password hash", user._id);
      return res.status(500).json({
        error: "Account setup is incomplete. Please contact AdrieChartered support.",
      });
    }

    const passwordMatch = bcrypt.compareSync(password, storedPassword);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid email/account number or password." });
    }

    res.json({
      userId: user._id,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      message: "Credentials approved. Proceeding to OTP delivery selection.",
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// helper to dispatch OTP with fallback
async function executeOtpDispatch(user: any, method: OtpMethod, otpCode: string): Promise<{ delivered: boolean; details: string }> {
  const expiryMinutes = 10;
  
  // Format Messages exactly as requested
  const emailSubject = "Your AdrieChartered Verification Code";
  const emailContent = `Hi ${user.fullName},
Your AdrieChartered verification code is:

${otpCode}

This code expires in ${expiryMinutes} minutes. Do not share it with anyone.
If you did not request this, please ignore this email.
— AdrieChartered Security Team`;

  const textAndWhatsAppMessage = `AdrieChartered Security Code: ${otpCode}
Valid for 10 minutes. Never share this code with anyone.
AdrieChartered — Banking Built Around You`;

  let sent = false;
  let statusDetail = "";

  if (method === "email") {
    const transporter = getMailTransporter();
    const { user: smtpUser } = getEmailCredentials();
    if (transporter && smtpUser) {
      try {
        await withTimeout(
          transporter.sendMail({
            from: `"AdrieChartered Support" <${smtpUser}>`,
            to: user.email,
            subject: emailSubject,
            text: emailContent,
            html: `<p>Hi ${user.fullName},</p>
<p>Your AdrieChartered verification code is:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otpCode}</p>
<p>This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>
<p>If you did not request this, please ignore this email.</p>
<p>— AdrieChartered Security Team</p>`,
          }),
          SMTP_TIMEOUT_MS,
          "Gmail SMTP timed out. Try SMS/WhatsApp, or use port 465 with EMAIL_PORT=465 on Render."
        );
        sent = true;
        statusDetail = "Sent securely via SMTP.";
      } catch (err: any) {
        console.error("SMTP Delivery Failed:", err.message);
        statusDetail = err.message || "Unknown SMTP error";
      }
    } else {
      statusDetail = "EMAIL_USER / EMAIL_PASS not set on server.";
    }
  } else if (method === "sms") {
    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await client.messages.create({
          body: textAndWhatsAppMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone,
        });
        sent = true;
        statusDetail = "Sent securely via Twilio SMS.";
      } catch (err: any) {
        console.error("Twilio SMS Delivery Failed:", err.message);
        statusDetail = `Twilio SMS failure: ${err.message}`;
      }
    } else {
      statusDetail = "Twilio credentials or phone number missing.";
    }
  } else if (method === "whatsapp") {
    const client = getTwilioClient();
    const waFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
    if (client) {
      try {
        const formattedTo = user.phone.startsWith("whatsapp:") ? user.phone : `whatsapp:${user.phone}`;
        await client.messages.create({
          body: textAndWhatsAppMessage,
          from: waFrom,
          to: formattedTo,
        });
        sent = true;
        statusDetail = "Sent securely via Twilio WhatsApp API.";
      } catch (err: any) {
        console.error("Twilio WhatsApp Delivery Failed:", err.message);
        statusDetail = `Twilio WhatsApp failure: ${err.message}`;
      }
    } else {
      statusDetail = "Twilio credentials missing.";
    }
  }

  // Always output OTP cleanly to server logs for development testing fallback!
  console.log(`\n=============================================================`);
  console.log(`[SECURE DISPATCH]: OTP for ${user.fullName} (${user.email})`);
  console.log(`[DELIVERY METHOD]: ${method.toUpperCase()}`);
  console.log(`[DESTINATION]:     ${method === "email" ? user.email : user.phone}`);
  console.log(`[OTP CODE]:        ${otpCode}  <-- USE THIS CODE FOR VERIFICATION`);
  console.log(`[STATUS]:          ${sent ? "DELIVERED LIVE" : `MOCKED (${statusDetail})`}`);
  console.log(`=============================================================\n`);

  return {
    delivered: sent,
    details: statusDetail,
  };
}

async function persistOtpForUser(
  userId: string,
  isPending: boolean,
  methodMapped: string,
  hashedOtp: string,
  otpExpiryTime: string
) {
  if (isPending) {
    await updatePendingSignup(userId, {
      otp: hashedOtp,
      otpExpiry: otpExpiryTime,
      otpMethod: methodMapped,
    });
  } else {
    await updateUser(userId, {
      otp: hashedOtp,
      otpExpiry: otpExpiryTime,
      otpMethod: methodMapped as OtpMethod,
    });
  }
}

// 4. POST /api/auth/send-otp -> Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { userId, method } = req.body;
    if (!userId || !method) {
      return res.status(400).json({ error: "User ID and delivery method are required." });
    }

    let methodMapped = method;
    if (method === "mobile") {
      methodMapped = "sms";
    }

    // Try finding in active users first, then pending signups
    let user = await findUserById(userId);
    let isPending = false;
    
    if (!user) {
      const pending = await findPendingSignupById(userId);
      if (pending) {
        user = pending as any;
        isPending = true;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User or registration profile not found." });
    }

    if ((methodMapped === "sms" || methodMapped === "whatsapp") && !user.phone) {
      return res.status(400).json({ error: `Phone number required to send OTP via ${methodMapped}.` });
    }

  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const dispatch = await executeOtpDispatch(user, methodMapped, rawOtp);

    if (!dispatch.delivered) {
      return res.status(502).json({
        error: deliveryErrorMessage(methodMapped as OtpMethod, dispatch.details),
        deliveryFailed: true,
      });
    }

    const hashedOtp = bcrypt.hashSync(rawOtp, 12);
    const otpExpiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await persistOtpForUser(userId, isPending, methodMapped, hashedOtp, otpExpiryTime);

    res.json({
      success: true,
      method: methodMapped,
      delivered: true,
      message: `OTP dispatched to your registered ${methodMapped}.`,
    });
  } catch (err: any) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Could not send verification code." });
  }
});

// 5. POST /api/auth/verify-otp -> Verify & Authorize Session
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: "User ID and verification code are required." });
    }

    let user = await findUserById(userId);
    let isPending = false;

    if (!user) {
      const pending = await findPendingSignupById(userId);
      if (pending) {
        user = pending as any;
        isPending = true;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User details do not exist." });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: "No pending verification code found. Please request a new code." });
    }

    // Check expiry
    const expiry = new Date(user.otpExpiry).getTime();
    if (Date.now() > expiry) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    // Compare Hash
    const matches = bcrypt.compareSync(code, user.otp);
    if (!matches) {
      return res.status(400).json({ error: "Incorrect verification code. Please check and try again." });
    }

    if (isPending) {
      // Clear OTP and mark as email verified
      await updatePendingSignup(userId, {
        otp: "",
        otpExpiry: "",
        isEmailVerified: true,
      });

      return res.json({
        success: true,
        isPending: true,
        message: "Verification successful. Your registration is queued for private banking authorization.",
      });
    }

    // Mark as verified & clear OTP
    const verifiedUser = await updateUser(userId, {
      isVerified: true,
      otp: "",
      otpExpiry: "",
    });

    res.json({
      success: true,
      token: userId, // In this express + vite design, we use the user ID directly as a token proxy for straightforward persistence
      user: verifiedUser,
      message: "Security check approved. Access granted.",
    });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "An error occurred during verification." });
  }
});

// 6. POST /api/auth/resend-otp -> Re-send OTP (same method)
app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    let user = await findUserById(userId);
    let isPending = false;

    if (!user) {
      const pending = await findPendingSignupById(userId);
      if (pending) {
        user = pending as any;
        isPending = true;
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const lastUsedMethod = user.otpMethod || "email";

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const dispatch = await executeOtpDispatch(user, lastUsedMethod as OtpMethod, rawOtp);

    if (!dispatch.delivered) {
      return res.status(502).json({
        error: deliveryErrorMessage(lastUsedMethod as OtpMethod, dispatch.details),
        deliveryFailed: true,
      });
    }

    const hashedOtp = bcrypt.hashSync(rawOtp, 12);
    const otpExpiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await persistOtpForUser(userId, isPending, lastUsedMethod, hashedOtp, otpExpiryTime);

    res.json({
      success: true,
      method: lastUsedMethod,
      delivered: true,
      message: `A fresh OTP has been dispatched to your ${lastUsedMethod}.`,
    });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Could not resend code." });
  }
});

// 7. GET /api/user/me -> Fetch current User Info (Authenticated)
app.get("/api/user/me", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  res.json({
    user,
    databaseMode: getDatabaseMode(),
  });
});

// 8. PATCH /api/user/currency -> Adjust user currency profile (Authenticated)
app.patch("/api/user/currency", authenticateToken, async (req, res) => {
  try {
    const { currency } = req.body;
    if (!currency) {
      return res.status(400).json({ error: "Currency code is required." });
    }

    const user = (req as any).user;
    const updated = await updateUser(user._id, { currency: currency as CurrencyCode });

    res.json({
      success: true,
      user: updated,
      message: `Preferred currency updated to ${currency}.`,
    });
  } catch (err: any) {
    console.error("Update currency error:", err);
    res.status(500).json({ error: "Could not update currency profile." });
  }
});

// 9. POST /api/transactions/fund -> Credit funding (Authenticated)
app.post("/api/transactions/fund", authenticateToken, async (req, res) => {
  try {
    const { amount, description, senderName, senderBank, senderAccount, paymentMethod } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid transfer amount greater than zero." });
    }

    const user = (req as any).user;
    const originalBalance = user.balance;
    const newBalance = Number((originalBalance + numAmount).toFixed(2));

    // Update balance
    await updateUser(user._id, { balance: newBalance });

    // Generate reference
    const generateRefSuffix = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let res = "";
      for (let i = 0; i < 5; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };
    const reference = `ACB-2026-${generateRefSuffix()}`;

    // Clear transaction object and persist sender specifics inside recipient fields
    const savedTx = await addTransaction({
      userId: user._id,
      type: "credit",
      amount: numAmount,
      currency: user.currency,
      recipientName: senderName || "Direct Electronic Influx",
      recipientBank: senderBank || "External Clearing Node",
      recipientAccount: senderAccount || "Adrie Clearing System",
      recipientSortCode: paymentMethod || "DIRECT",
      description: description || "Inward Payment Deposit",
      reference,
      balanceBefore: originalBalance,
      balanceAfter: newBalance,
    });

    res.json({
      success: true,
      transaction: savedTx,
      balance: newBalance,
      message: `Fund account credited with ${user.currency} ${numAmount.toFixed(2)}.`,
    });
  } catch (err: any) {
    console.error("Funding error:", err);
    res.status(500).json({ error: "Could not complete manual deposit." });
  }
});

// 10. POST /api/transactions/transfer -> Debit transfer outward (Authenticated)
app.post("/api/transactions/transfer", authenticateToken, async (req, res) => {
  try {
    const {
      recipientAccount,
      recipientSortCode,
      recipientBank,
      recipientName,
      amount,
      description,
    } = req.body;

    const numAmount = Number(amount);

    if (!recipientAccount || !recipientSortCode || !recipientBank || !recipientName) {
      return res.status(400).json({ error: "All recipient banking parameters are required." });
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Please provide a valid transfer amount greater than zero." });
    }

    const user = (req as any).user;
    const originalBalance = user.balance;

    if (originalBalance < numAmount) {
      return res.status(400).json({ error: "Sufficient funds unavailable to complete this transaction." });
    }

    const newBalance = Number((originalBalance - numAmount).toFixed(2));

    // Dedut balance
    await updateUser(user._id, { balance: newBalance });

    // Generate unique reference
    const generateRefSuffix = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let res = "";
      for (let i = 0; i < 5; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };
    const reference = `ACB-2026-${generateRefSuffix()}`;

    // Record Transaction
    const savedTx = await addTransaction({
      userId: user._id,
      type: "debit",
      amount: numAmount,
      currency: user.currency,
      recipientName,
      recipientAccount,
      recipientSortCode,
      recipientBank,
      description: description || "FPS Outward Transfer",
      reference,
      balanceBefore: originalBalance,
      balanceAfter: newBalance,
    });

    // Formatting date helper for debit alert message
    const formattedDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " " + new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate precise alert template
    const alertMessage = `DEBIT ALERT — AdrieChartered
Ref: ${reference}
Amount: ${user.currency === "GBP" ? "£" : user.currency} ${numAmount.toFixed(2)}
Acct: ****${user.accountNumber.slice(-4)} | Sort: ${user.sortCode}
To: ${recipientName} | ${recipientBank}
Desc: ${description || "FPS Outward Transfer"}
Date: ${formattedDate}
Bal: ${user.currency === "GBP" ? "£" : user.currency} ${newBalance.toFixed(2)}
AdrieChartered — Banking Built Around You`;

    res.json({
      success: true,
      transaction: savedTx,
      balance: newBalance,
      alertMessage,
      message: "Transfer executed successfully helper dispatched.",
    });
  } catch (err: any) {
    console.error("Transfer error:", err);
    res.status(500).json({ error: "An error occurred with your fund transfer." });
  }
});

// 11. GET /api/transactions -> Fetch paginated/filtered list (Authenticated)
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const type = (req.query.type as "all" | "credit" | "debit") || "all";
    const search = (req.query.search as string) || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const { transactions, total } = await getTransactions(user._id, {
      type,
      search,
      page,
      limit,
    });

    res.json({
      transactions,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Fetch transactions error:", err);
    res.status(500).json({ error: "Could not fetch banking ledger history." });
  }
});

// 12. Helper API routes to expose masked values
app.get("/api/auth/mask/:userId", async (req, res) => {
  try {
    let user = await findUserById(req.params.userId);
    if (!user) {
      user = await findPendingSignupById(req.params.userId) as any;
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
    });
  } catch (err) {
    res.status(500).json({ error: "Masking error" });
  }
});


// ---------------- VITE / EXPRESS HANDLERS ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ADRIE CHARTERED] Dev server listening on http://localhost:${PORT}`);
  });
}

// Only start the server automatically if we are NOT running in a Vercel serverless environment.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
