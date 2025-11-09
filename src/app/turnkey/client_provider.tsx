'use client';

import { TurnkeyProvider } from '@turnkey/sdk-react';
import {turnkeyConfig} from "@/modules/turnkey/configs/config";


export function TurnkeyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TurnkeyProvider config={turnkeyConfig}>{children}</TurnkeyProvider>;
}