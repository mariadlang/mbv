"use client";

import { useEffect, useState } from "react";
import type { LegalConsent, PrivacyRequest } from "@/src/domain/legal";
import { LEGAL_VERSION } from "@/src/lib/legalConfig";
import { legalPrivacyService } from "@/src/services/legalPrivacyService";

export function useLegalPrivacy(userId: string | null) {
  const [consents, setConsents] = useState<LegalConsent[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = async () => {
    if (!userId) { setConsents([]); setRequests([]); setLoading(false); return; }
    setLoading(true);
    const [nextConsents, nextRequests] = await Promise.all([legalPrivacyService.listConsents(userId), legalPrivacyService.listRequests(userId)]);
    setConsents(nextConsents); setRequests(nextRequests); setLoading(false);
  };

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };
    void Promise.all([legalPrivacyService.listConsents(userId), legalPrivacyService.listRequests(userId)]).then(([nextConsents, nextRequests]) => {
      if (!active) return;
      setConsents(nextConsents); setRequests(nextRequests); setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const recordConsent = async (input: Omit<Parameters<typeof legalPrivacyService.recordConsent>[0], "userId" | "documentVersion"> & { documentVersion?: string }) => {
    if (!userId) throw new Error("AUTHENTICATION_REQUIRED");
    const saved = await legalPrivacyService.recordConsent({ ...input, userId, documentVersion: input.documentVersion ?? LEGAL_VERSION });
    setConsents((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); return saved;
  };

  const createRequest = async (input: Omit<Parameters<typeof legalPrivacyService.createRequest>[0], "userId">) => {
    if (!userId) throw new Error("AUTHENTICATION_REQUIRED");
    const saved = await legalPrivacyService.createRequest({ ...input, userId });
    setRequests((current) => [saved, ...current]); return saved;
  };

  const hasConsent = (type: LegalConsent["consentType"]) => consents.some((item) => item.consentType === type && item.status === "granted" && item.documentVersion === LEGAL_VERSION);

  return { consents, requests, loading, refresh, recordConsent, createRequest, hasConsent };
}
