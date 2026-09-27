import { resend } from "@/lib/resend"

export interface SendEmailParams {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  const recipient = (to || "").trim()
  if (!recipient) {
    throw new Error("Send Email node requires a recipient (to)")
  }

  const emailSubject = (subject || "").trim()
  if (!emailSubject) {
    throw new Error("Send Email node requires a subject")
  }

  const emailBody = body ?? ""

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: recipient.includes(",")
      ? recipient.split(",").map((addr) => addr.trim()).filter(Boolean)
      : recipient,
    subject: emailSubject,
    text: emailBody,
    ...(emailBody.includes("<") ? { html: emailBody } : {}),
  })

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error("Resend did not return a valid email ID")
  }

  return {
    id: data.id,
    emailId: data.id,
  }
}
