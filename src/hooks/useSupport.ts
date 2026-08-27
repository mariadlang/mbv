"use client";

import { useEffect, useState } from "react";
import { fallbackFaqs, type SupportFaq } from "@/src/domain/support";
import type { SubmitFeedbackInput } from "@/src/repositories/interfaces/SupportRepository";
import { useAccount } from "@/src/hooks/useAccount";
import { supportService } from "@/src/services/supportService";

export function useSupport() {
  const account = useAccount();
  const getAccessToken = account.getAccessToken;
  const locale = account.preferences?.locale ?? "es";
  const [faqs, setFaqs] = useState<SupportFaq[]>(fallbackFaqs);
  const [marketingConsent, setMarketingConsentState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { let active = true; void getAccessToken().then(async (token) => { if (!token) { if (active) setLoading(false); return; } const [nextFaqs, consent] = await Promise.all([supportService.listFaqs(token, locale).catch(() => fallbackFaqs), supportService.getMarketingPreference(token).catch(() => false)]); if (active) { setFaqs(nextFaqs.length ? nextFaqs : fallbackFaqs); setMarketingConsentState(consent); setLoading(false); } }); return () => { active = false; }; }, [getAccessToken, locale]);

  const submit = async (input: SubmitFeedbackInput) => { const token = await getAccessToken(); if (!token) throw new Error("AUTHENTICATION_REQUIRED"); return supportService.submitFeedback(token, input); };
  const setMarketingConsent = async (consent: boolean) => { const previous = marketingConsent; setMarketingConsentState(consent); try { const token = await getAccessToken(); if (!token) throw new Error("AUTHENTICATION_REQUIRED"); const saved = await supportService.setMarketingPreference(token, consent, "settings"); setMarketingConsentState(saved); return saved; } catch (error) { setMarketingConsentState(previous); throw error; } };
  return { faqs, marketingConsent, loading, submit, setMarketingConsent };
}
