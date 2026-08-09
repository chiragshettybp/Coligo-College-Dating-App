import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Mail, CheckCircle2, Send, Instagram, Twitter, Linkedin } from "lucide-react";

import {
  submitContactMessage,
  contactSchema,
  CONTACT_CATEGORIES,
  type ContactInput,
} from "@/lib/contact.functions";
import { PageContainer } from "@/components/public/Timeline";
import { SectionReveal } from "@/components/public/SectionReveal";
import { Button, Text, GlassPanel } from "@/components/ds/glass";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/_public/contact")({
  head: () => ({
    meta: [
      { title: "Contact Coligo — Support & Student Enquiries" },
      {
        name: "description",
        content: "Need help with verification or have a safety concern? Contact the Coligo team today.",
      },
      { property: "og:title", content: "Contact Coligo Support" },
      {
        property: "og:description",
        content: "Get in touch for student support and enquiries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

const SUPPORT_EMAIL = "support@collegedating.app";
const CATEGORY_LABELS: Record<(typeof CONTACT_CATEGORIES)[number], string> = {
  general: "General enquiry",
  support: "Account support",
  safety: "Safety concern",
  verification: "Verification help",
  partnership: "College partnership",
  feedback: "Feedback",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: radii.md,
  padding: "12px 16px",
  fontSize: 16,
  fontWeight: 500,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
  border: `1px solid ${surfaces.border}`,
  outline: "none",
  transition: "border-color 180ms ease, box-shadow 180ms ease",
};

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: "block", marginBottom: 6, color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}
    >
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span role="alert" style={{ display: "block", marginTop: 6, color: colors.danger, fontSize: 13 }}>
      {msg}
    </span>
  );
}

const EMPTY: ContactInput = {
  name: "",
  email: "",
  subject: "",
  category: "general",
  message: "",
};

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const lastSignature = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ContactInput) => submit({ data: input }),
    onSuccess: () => {
      haptic("softSuccess");
      setSubmitted(true);
    },
  });

  const set = (key: keyof ContactInput) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof ContactInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactInput;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      haptic("medium");
      return;
    }
    const signature = JSON.stringify(parsed.data);
    if (signature === lastSignature.current) return; // prevent duplicate submission
    lastSignature.current = signature;
    mutation.mutate(parsed.data);
  };

  if (submitted) {
    return (
      <PageContainer narrow>
        <SectionReveal>
          <GlassPanel soft style={{ padding: spacing[7], textAlign: "center" }}>
            <span
              className="inline-flex items-center justify-center"
              style={{ width: 64, height: 64, borderRadius: radii.pill, background: "rgba(52,199,89,0.12)", color: colors.success }}
            >
              <CheckCircle2 style={{ width: 34, height: 34 }} />
            </span>
            <Text variant="headingLg" color={colors.textPrimary} style={{ marginTop: spacing[3] }}>
              Message sent
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing[2], maxWidth: 420, marginInline: "auto" }}>
              Thanks for reaching out. Our team has received your message and will get back to you at{" "}
              {values.email}.
            </Text>
            <div style={{ marginTop: spacing[5] }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setValues(EMPTY);
                  setSubmitted(false);
                  lastSignature.current = null;
                }}
              >
                Send another message
              </Button>
            </div>
          </GlassPanel>
        </SectionReveal>
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <SectionReveal>
        <Text variant="overline" tone="muted" as="p">
          Contact
        </Text>
        <Text variant="displayMd" color={colors.textPrimary} style={{ marginTop: spacing[1] }}>
          Get in touch
        </Text>
        <Text variant="bodyLg" tone="secondary" style={{ marginTop: spacing[2], maxWidth: 560 }}>
          Questions, feedback, or a safety concern? Send us a message and we'll respond as soon as we
          can.
        </Text>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center"
          style={{ gap: spacing[0], marginTop: spacing[3], color: colors.primary, textDecoration: "none", fontSize: 15, fontWeight: 600 }}
        >
          <Mail style={{ width: 16, height: 16 }} />
          {SUPPORT_EMAIL}
        </a>
      </SectionReveal>

      <SectionReveal delay={80}>
        <GlassPanel soft style={{ padding: spacing[5], marginTop: spacing[5] }}>
          <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: spacing[4] }}>
            <div>
              <Label htmlFor="c-name">Name</Label>
              <input
                id="c-name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={(e) => set("name")(e.target.value)}
                aria-invalid={!!errors.name}
                placeholder="Your full name"
                style={{ ...fieldStyle, borderColor: errors.name ? colors.danger : surfaces.border }}
              />
              <FieldError msg={errors.name} />
            </div>

            <div>
              <Label htmlFor="c-email">Email</Label>
              <input
                id="c-email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => set("email")(e.target.value)}
                aria-invalid={!!errors.email}
                placeholder="you@college.edu"
                style={{ ...fieldStyle, borderColor: errors.email ? colors.danger : surfaces.border }}
              />
              <FieldError msg={errors.email} />
            </div>

            <div>
              <Label htmlFor="c-subject">Subject</Label>
              <input
                id="c-subject"
                type="text"
                value={values.subject}
                onChange={(e) => set("subject")(e.target.value)}
                aria-invalid={!!errors.subject}
                placeholder="What's this about?"
                style={{ ...fieldStyle, borderColor: errors.subject ? colors.danger : surfaces.border }}
              />
              <FieldError msg={errors.subject} />
            </div>

            <div>
              <Label htmlFor="c-category">Category</Label>
              <select
                id="c-category"
                value={values.category}
                onChange={(e) => set("category")(e.target.value)}
                style={{ ...fieldStyle, appearance: "none", cursor: "pointer" }}
              >
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="c-message">Message</Label>
              <textarea
                id="c-message"
                rows={5}
                value={values.message}
                onChange={(e) => set("message")(e.target.value)}
                aria-invalid={!!errors.message}
                placeholder="Tell us how we can help…"
                style={{ ...fieldStyle, resize: "vertical", minHeight: 120, borderColor: errors.message ? colors.danger : surfaces.border }}
              />
              <FieldError msg={errors.message} />
            </div>

            {mutation.isError ? (
              <Text variant="bodySm" style={{ color: colors.danger }} role="alert">
                Something went wrong sending your message. Please try again.
              </Text>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={mutation.isPending}
              disabled={mutation.isPending}
              rightIcon={!mutation.isPending ? <Send style={{ width: 18, height: 18 }} /> : undefined}
            >
              {mutation.isPending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </GlassPanel>
      </SectionReveal>

      <SectionReveal delay={140}>
        <div style={{ marginTop: spacing[5], display: "flex", alignItems: "center", gap: spacing[2] }}>
          <Text variant="bodySm" tone="muted">
            Follow us (coming soon):
          </Text>
          {[Instagram, Twitter, Linkedin].map((Icon, i) => (
            <span
              key={i}
              aria-hidden
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: radii.md, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, color: colors.textSecondary }}
            >
              <Icon style={{ width: 16, height: 16 }} />
            </span>
          ))}
        </div>
      </SectionReveal>
    </PageContainer>
  );
}
