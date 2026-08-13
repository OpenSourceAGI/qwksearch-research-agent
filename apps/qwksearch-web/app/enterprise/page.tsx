"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  Palette,
  Code,
  Database,
  Zap,
  Shield,
  BarChart3,
  Check,
  Rocket,
  Building2,
  Loader2,
  Send,
} from "lucide-react"

function SpotlightCard({ children }: { children: React.ReactNode }) {
  const divRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return

    const div = divRef.current
    const rect = div.getBoundingClientRect()

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleFocus = () => {
    setIsFocused(true)
    setOpacity(1)
  }

  const handleBlur = () => {
    setIsFocused(false)
    setOpacity(0)
  }

  const handleMouseEnter = () => {
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden rounded-xl"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(6, 182, 212, 0.15), transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center space-y-8">
          <div className="inline-block">
            <span className="text-sm text-cyan-400 font-medium px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10">
              Agent Tools Chat UI for Enterprise
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
              Agent Tools Chat UI,
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Built for Your Enterprise
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            White-label professional standard Chat Agent UI. Customize everything. Own the customer relationship. Scale without limits.
          </p>

          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold group">
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-cyan-500/30 hover:bg-cyan-500/10 text-white group bg-transparent"
            >
              <Play className="mr-2 w-4 h-4" />
              Watch Demo
            </Button>
          </div> */}

          {/* <div className="mt-16 relative mx-auto max-w-4xl">
            <SpotlightCard>
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-gray-800 p-6 space-y-4">
                <div className="h-32 flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Demo Interface Preview</div>
                </div>
              </div>
            </SpotlightCard>
          </div> */}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: Palette,
      title: "100% White-Label",
      description:
        "Full branding control. Custom colors, logos, domain names. Your customers see your brand, not ours.",
    },
    {
      icon: Code,
      title: "API-First Architecture",
      description:
        "Embed directly into your app. Webhooks for custom workflows. Complete control over your integration.",
    },
    {
      icon: Database,
      title: "Custom Model Training",
      description: "Fine-tune on your data. Proprietary knowledge base. Industry-specific accuracy out of the box.",
    },
    {
      icon: Zap,
      title: "20+ Integrations",
      description: "Slack, Salesforce, HubSpot, Zendesk, Zapier. Connect to your existing tech stack instantly.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Conversation insights, user behavior, sentiment analysis. Data-driven improvements built-in.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2, GDPR, HIPAA ready. End-to-end encryption. Your data stays yours.",
    },
  ]

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto relative z-10">

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-gradient-to-b from-gray-900 to-black border-gray-800 p-6 hover:border-cyan-500/50 transition-all duration-300 group"
            >
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const plans = [
    {
      name: "Standard Package",
      icon: Rocket,
      price: "$5,000",
      priceType: "one-time",
      consulting: "$300/month",
      description: "Complete setup for growing businesses",
      features: [
        "Full platform setup & configuration",
        "Complete white-labeling",
        "Unlimited conversations",
        "All integrations included",
        "Unlimited team members",
        "On-premise deployment option",
        "Priority email & chat support",
        "As-needed consulting at $300/month",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Enterprise Package",
      icon: Building2,
      price: "Contact Us",
      priceType: "custom",
      consulting: "$500/month",
      description: "Premium solution for large organizations",
      features: [
        "Everything in Standard Package",
        "Custom model training & fine-tuning",
        "White-glove onboarding",
        "Custom integrations & API access",
        "SLA guarantees",
        "Dedicated account manager",
        "As-needed consulting at $500/month",
      ],
      cta: "Schedule Demo",
      highlighted: true,
    },
  ]

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            One-time setup investment with optional as-needed consulting. No recurring platform fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative bg-gradient-to-b from-gray-900 to-black border-gray-800 p-8 transition-all duration-300 ${plan.highlighted ? "border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105" : "hover:border-cyan-500/50"
                }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6 mt-2">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                  <plan.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="mb-4">
                  <p className="text-4xl font-bold text-white mb-2">{plan.price}</p>
                  {plan.priceType === "one-time" && (
                    <>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">One-Time Payment</p>
                      <p className="text-sm text-cyan-400 font-semibold">+ {plan.consulting} consulting (as-needed)</p>
                    </>
                  )}
                  {plan.priceType === "custom" && (
                    <>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Custom Quote</p>
                      <p className="text-sm text-cyan-400 font-semibold">+ {plan.consulting} consulting (as-needed)</p>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${plan.highlighted
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Consulting services are billed monthly only when needed. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
function ContactFormSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Thank you for your interest!",
      description: "We'll be in touch within 24 hours to discuss your needs.",
    })

    setLoading(false)
      ; (e.target as HTMLFormElement).reset()
  }

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Customer Experience?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Tell us about your business and we'll create a custom solution tailored to your needs.
          </p>
        </div>

        <Card className="bg-gradient-to-b from-gray-900 to-black border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="John Doe"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">

              {/*               <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  name="company"
                  required
                  placeholder="Acme Inc."
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div> */}

            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="business-type">Business Type *</Label>
                <select
                  id="business-type"
                  name="business-type"
                  required
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select business type</option>
                  <option value="startup">Startup</option>
                  <option value="agency">Agency</option>
                  <option value="saas">SaaS Company</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-size">Team Size *</Label>
                <select
                  id="team-size"
                  name="team-size"
                  required
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select team size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>


            {/* 
            <div className="space-y-2">
              <Label>Key Features You Need</Label>
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                {[
                  "White-label branding",
                  "API integration",
                  "Custom model training",
                  "Advanced analytics",
                  "Multiple integrations",
                  "Dedicated support",
                ].map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox id={feature} name="features" value={feature} />
                    <label htmlFor={feature} className="text-sm text-gray-300 cursor-pointer">
                      {feature}
                    </label>
                  </div>
                ))}
              </div>
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="message">Tell Us About Your Needs</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="What challenges are you looking to solve? What are your main requirements?"
                className="bg-gray-950 border-gray-800 text-white min-h-32"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="consent" name="consent" required />
              <label htmlFor="consent" className="text-sm text-gray-400">
                I agree to receive communications about Chat Agent UI and accept the privacy policy *
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-8">
          By submitting this form, you agree to our terms of service and privacy policy. We typically respond within 24
          hours.
        </p>
      </div>
    </section >
  )
}

export default function HomePage() {
  return (
    <main className="pl-20 relative max-w min-h-screen bg-black">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)]  [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

      {/* <Navigation /> */}
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      {/* <ComparisonSection /> */}
      <ContactFormSection />
    </main>
  )
}
