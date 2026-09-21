import { formatAbn, validateAbnField } from "@/lib/abn";
import { validateBusinessName } from "@/lib/company-pickup";

export type CompanyFieldErrors = {
  legalName?: string;
  abn?: string;
};

export type CompanySaveInput = {
  legalName: string;
  abn: string;
  /** When true, ABN must be present and pass checksum validation. */
  requireAbn?: boolean;
};

export type CompanySavePayload = {
  legalName: string;
  abn: string;
  formattedAbn: string;
};

/** Shared validation for Add company manual confirm and profile saves. */
export function validateCompanySave(input: CompanySaveInput): {
  ok: true;
  value: CompanySavePayload;
} | {
  ok: false;
  errors: CompanyFieldErrors;
} {
  const name = input.legalName.trim();
  const errors: CompanyFieldErrors = {};

  const nameErr = validateBusinessName(input.legalName);
  if (nameErr) errors.legalName = nameErr;

  const trimmedAbn = input.abn.trim();
  if (input.requireAbn && !trimmedAbn) {
    errors.abn = "Enter an ABN.";
  } else if (trimmedAbn) {
    const abnErr = validateAbnField(trimmedAbn, false);
    if (abnErr) errors.abn = abnErr;
  }

  if (errors.legalName || errors.abn) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      legalName: name,
      abn: trimmedAbn,
      formattedAbn: trimmedAbn ? formatAbn(trimmedAbn) : "",
    },
  };
}
