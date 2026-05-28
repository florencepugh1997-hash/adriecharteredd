const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const host = process.env.EMAIL_HOST;
const port = process.env.EMAIL_PORT;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log("Transporter Info:", { host, port, user, pass: pass ? "****" : "missing" });

if (!user || !pass) {
  console.error("Missing credentials in env file!");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: host || "smtp.gmail.com",
  port: Number(port) || 587,
  secure: Number(port) === 465,
  auth: { user, pass },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("Verification failed:", error);
  } else {
    console.log("Server is ready to take our messages");
    
    // Attempt to send a test mail
    transporter.sendMail({
      from: `"AdrieChartered Support" <${user}>`,
      to: "crystalakonam@gmail.com",
      subject: "Test Mail",
      text: "This is a test email from AdrieChartered scratch script.",
    }, (err, info) => {
      if (err) {
        console.error("Send mail failed:", err);
      } else {
        console.log("Send mail succeeded:", info);
      }
    });
  }
});
