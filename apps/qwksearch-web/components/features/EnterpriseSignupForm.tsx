"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = [
  { value: "startup", label: "Startup" },
  { value: "agency", label: "Agency" },
  { value: "saas", label: "SaaS Company" },
  { value: "enterprise", label: "Enterprise" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "other", label: "Other" },
];

const TEAM_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

// Matches `components/ui/input` so the two selects sit flush with the fields.
const SELECT_CLASS =
  "bg-card flex h-11 w-full rounded-2xl border px-3 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The enterprise & white-label sign-up. It closes the features page as part of
 * one conversion box, and `/enterprise` renders the same form, so the fields
 * only live here. Styled with theme tokens rather than fixed colors: the
 * features page follows light and dark mode.
 *
 * Ids are prefixed with `useId` because the homepage mounts the whole features
 * page underneath the workspace, where bare ids like `name` or `email` would
 * collide with the app's own fields.
 */
export function EnterpriseSignupForm({ className }: { className?: string }) {
  const id = React.useId();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success("Thank you for your interest!", {
      description: "We'll be in touch within 24 hours to discuss your needs.",
    });

    setLoading(false);
    form.reset();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5 text-left", className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>Full Name *</Label>
          <Input id={`${id}-name`} name="name" required placeholder="John Doe" />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-email`}>Work Email *</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            placeholder="john@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-business-type`}>Business Type *</Label>
          <select
            id={`${id}-business-type`}
            name="business-type"
            required
            defaultValue=""
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              Select business type
            </option>
            {BUSINESS_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-team-size`}>Team Size *</Label>
          <select
            id={`${id}-team-size`}
            name="team-size"
            required
            defaultValue=""
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              Select team size
            </option>
            {TEAM_SIZES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-message`}>Tell Us About Your Needs</Label>
        <Textarea
          id={`${id}-message`}
          name="message"
          placeholder="What challenges are you looking to solve? What are your main requirements?"
          className="min-h-28"
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id={`${id}-consent`} name="consent" required className="mt-0.5" />
        <label
          htmlFor={`${id}-consent`}
          className="text-muted-foreground text-sm leading-snug"
        >
          I agree to receive communications about Chat Agent UI and accept the
          privacy policy *
        </label>
      </div>

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send />
            Submit Request
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        By submitting this form, you agree to our terms of service and privacy
        policy. We typically respond within 24 hours.
      </p>
    </form>
  );
}
