import { JUPITER_PROGRAM_ID, CHAINWORKS_PROGRAM_ID } from "@/constants/tokens";
import jupiterIdl from "@/modules/turnkey/idl/jupiter_idl.json";
import chainworksIdl from "@/modules/turnkey/idl/chainworks_idl.json";
import { TurnkeyIndexedDbClient } from "@turnkey/sdk-browser";

// Export the IDLs for use in client-side code
export const JUPITER_IDL = jupiterIdl;
export const CHAINWORKS_IDL = chainworksIdl;

/**
 * Lists all smart contract interfaces in a sub-organization
 */
export async function listSmartContractInterfaces(client: TurnkeyIndexedDbClient, subOrgId: string) {
  const result = await client.getSmartContractInterfaces({
    organizationId: subOrgId,
  });

  return result.smartContractInterfaces ?? [];
}

/**
 * Removes all smart contract interfaces from a sub-organization
 */
export async function removeAllSmartContractInterfaces(
  client: TurnkeyIndexedDbClient,
  subOrgId: string
): Promise<{ removed: string[] }> {
  const interfaces = await listSmartContractInterfaces(client, subOrgId);
  const removed: string[] = [];

  for (const iface of interfaces) {
    try {
      await client.deleteSmartContractInterface({
        organizationId: subOrgId,
        smartContractInterfaceId: iface.smartContractInterfaceId,
      });
      removed.push(iface.smartContractInterfaceId);
      console.log(`Removed smart contract interface: ${iface.smartContractInterfaceId} (${iface.label})`);
    } catch (error) {
      console.error(`Failed to remove interface ${iface.smartContractInterfaceId}:`, error);
    }
  }

  return { removed };
}

/**
 * Adds the Jupiter Aggregator smart contract interface to a sub-organization.
 * This enables the policy engine to parse Jupiter swap instructions.
 */
export async function addJupiterSmartContractInterface(
  client: TurnkeyIndexedDbClient,
  orgId: string
): Promise<{ interfaceId: string }> {
  console.log("LOADING THE IDL @", orgId)
  const result = await client.createSmartContractInterface({
    organizationId: orgId,
    smartContractAddress: JUPITER_PROGRAM_ID,
    smartContractInterface: JSON.stringify(jupiterIdl),
    type: "SMART_CONTRACT_INTERFACE_TYPE_SOLANA",
    label: "Jupiter Aggregator",
    notes: "Jupiter swap program IDL for policy validation",
  });

  console.log(`Added Jupiter smart contract interface: ${result.smartContractInterfaceId}`);
  return { interfaceId: result.smartContractInterfaceId };
}

/**
 * Sets up the Jupiter smart contract interface for a sub-organization.
 * This removes any existing interfaces first, then adds the Jupiter IDL.
 */
export async function setupJupiterInterface(
  client: TurnkeyIndexedDbClient,
  subOrgId: string
): Promise<{ interfaceId: string }> {
  // First, remove all existing smart contract interfaces
  console.log("Removing existing smart contract interfaces...");
  await removeAllSmartContractInterfaces(client, subOrgId);

  // Then add the Jupiter interface
  console.log("Adding Jupiter smart contract interface...");
  const result = await addJupiterSmartContractInterface(client, subOrgId);

  // Confirm the interface was added by fetching it
  await confirmJupiterInterfaceAdded(client, subOrgId);

  return result;
}

/**
 * Confirms that the Jupiter smart contract interface was successfully added
 * by listing all interfaces and checking for its presence.
 */
export async function confirmJupiterInterfaceAdded(
  client: TurnkeyIndexedDbClient,
  subOrgId: string
): Promise<boolean> {
  console.log("Confirming Jupiter smart contract interface was added...");

  const interfaces = await listSmartContractInterfaces(client, subOrgId);

  console.log(`Found ${interfaces.length} smart contract interface(s):`);

  let jupiterFound = false;
  for (const iface of interfaces) {
    const isJupiter = iface.label === "Jupiter Aggregator";
    console.log(`  ----------------------------------------`);
    console.log(`  ID: ${iface.smartContractInterfaceId}`);
    console.log(`  Label: ${iface.label || 'No label'}`);
    console.log(`  Address: ${iface.smartContractAddress || 'N/A'}`);
    console.log(`  Type: ${iface.type || 'N/A'}`);
    console.log(`  Notes: ${iface.notes || 'N/A'}`);
    console.log(`  Created: ${iface.createdAt?.seconds ? new Date(Number(iface.createdAt.seconds) * 1000).toISOString() : 'N/A'}`);
    if (iface.smartContractInterface) {
      try {
        const idl = JSON.parse(iface.smartContractInterface);
        console.log(`  IDL Name: ${idl.name || 'N/A'}`);
        console.log(`  IDL Version: ${idl.version || 'N/A'}`);
        console.log(`  IDL Instructions: ${idl.instructions?.length || 0}`);
        console.log(`  IDL Accounts: ${idl.accounts?.length || 0}`);
        console.log(`  IDL Types: ${idl.types?.length || 0}`);
        console.log(`  IDL (full):`, idl);
      } catch {
        console.log(`  IDL: ${iface.smartContractInterface.substring(0, 200)}...`);
      }
    } else {
      console.log(`  IDL: N/A`);
    }
    if (isJupiter) {
      console.log(`  ✅ This is the Jupiter IDL`);
      jupiterFound = true;
    }
  }
  console.log(`  ----------------------------------------`);

  if (jupiterFound) {
    console.log("✅ Jupiter smart contract interface confirmed!");
  } else {
    console.warn("⚠️ Jupiter smart contract interface NOT found!");
  }

  return jupiterFound;
}

/**
 * Adds the ChainWorks smart contract interface to a sub-organization.
 * This enables the policy engine to parse ChainWorks swap instructions.
 */
export async function addChainworksSmartContractInterface(
  client: TurnkeyIndexedDbClient,
  orgId: string
): Promise<{ interfaceId: string }> {
  console.log("LOADING THE CHAINWORKS IDL @", orgId);
  const result = await client.createSmartContractInterface({
    organizationId: orgId,
    smartContractAddress: CHAINWORKS_PROGRAM_ID,
    smartContractInterface: JSON.stringify(chainworksIdl),
    type: "SMART_CONTRACT_INTERFACE_TYPE_SOLANA",
    label: "ChainWorks Swap",
    notes: "ChainWorks swap program IDL for policy validation",
  });

  console.log(`Added ChainWorks smart contract interface: ${result.smartContractInterfaceId}`);
  return { interfaceId: result.smartContractInterfaceId };
}

/**
 * Sets up the ChainWorks smart contract interface for a sub-organization.
 * This removes any existing interfaces first, then adds the ChainWorks IDL.
 */
export async function setupChainworksInterface(
  client: TurnkeyIndexedDbClient,
  subOrgId: string
): Promise<{ interfaceId: string }> {
  // First, remove all existing smart contract interfaces
  console.log("Removing existing smart contract interfaces...");
  await removeAllSmartContractInterfaces(client, subOrgId);

  // Then add the ChainWorks interface
  console.log("Adding ChainWorks smart contract interface...");
  const result = await addChainworksSmartContractInterface(client, subOrgId);

  // Confirm the interface was added
  await confirmChainworksInterfaceAdded(client, subOrgId);

  return result;
}

/**
 * Confirms that the ChainWorks smart contract interface was successfully added
 */
export async function confirmChainworksInterfaceAdded(
  client: TurnkeyIndexedDbClient,
  subOrgId: string
): Promise<boolean> {
  console.log("Confirming ChainWorks smart contract interface was added...");

  const interfaces = await listSmartContractInterfaces(client, subOrgId);

  let chainworksFound = false;
  for (const iface of interfaces) {
    if (iface.label === "ChainWorks Swap") {
      console.log(`  ✅ ChainWorks IDL found: ${iface.smartContractInterfaceId}`);
      chainworksFound = true;
    }
  }

  if (chainworksFound) {
    console.log("✅ ChainWorks smart contract interface confirmed!");
  } else {
    console.warn("⚠️ ChainWorks smart contract interface NOT found!");
  }

  return chainworksFound;
}
