"use client";
import { useEffect } from "react";
import { setLocalTenantId } from "@/lib/tenant-local";

export default function SetTenantLocal({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    setLocalTenantId(tenantId);
  }, [tenantId]);
  return null;
}
