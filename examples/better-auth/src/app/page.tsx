"use client";

import { connect, disconnect, request } from "@stacks/connect";
import { STACKS_MAINNET } from "@stacks/network";
import { createSiwsMessage } from "sign-in-with-stacks";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = authClient.useSession();

  async function handleConnect() {
    const connectResult = await connect();

    const stxAddress = connectResult.addresses.find(
      (address) => address.symbol === "STX",
    );
    if (!stxAddress) {
      throw new Error("No STX address found");
    }

    const { data: nonceResult, error: nonceError } =
      await authClient.siws.nonce({
        walletAddress: stxAddress.address,
        chainId: STACKS_MAINNET.chainId,
      });

    if (nonceError) {
      throw new Error(`Error getting nonce: ${nonceError.message}`);
    }

    const message = createSiwsMessage({
      address: stxAddress.address,
      chainId: STACKS_MAINNET.chainId,
      domain: "localhost:3000",
      nonce: nonceResult.nonce,
      uri: "http://localhost:3000",
      version: "1",
    });

    const signResult = await request("stx_signMessage", {
      message,
    });

    const { data, error } = await authClient.siws.verify({
      message,
      signature: signResult.signature,
      walletAddress: stxAddress.address,
      chainId: STACKS_MAINNET.chainId,
    });

    if (error) {
      throw new Error(`Error verifying SIWS message: ${error.message}`);
    }

    console.log("data", data);
  }

  async function handleDisconnect() {
    disconnect();
    await authClient.signOut();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            sign-in-with-stacks + better-auth Example
          </h1>
          {session ? (
            <p>better-auth session: {JSON.stringify(session)}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            onClick={handleConnect}
          >
            Connect wallet
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            onClick={handleDisconnect}
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
