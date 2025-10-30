import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to, subject, body) {
  try {
    if (!to || !subject || !body) {
      throw new Error("Missing required parameters: to, subject, or body.");
    }
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: body,
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);

    return { success: false, message: error.message || "Failed to send email" };
  }
}
