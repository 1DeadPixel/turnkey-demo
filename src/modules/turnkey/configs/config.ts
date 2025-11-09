import {TURNKEY_API_URL} from "@/constants/turnkey";

export const turnkeyConfig = {
  apiBaseUrl: TURNKEY_API_URL,
  defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
};

