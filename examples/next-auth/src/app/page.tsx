"use client";

import { connect, disconnect } from "@stacks/connect";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  function handleConnect() {
    connect();
  }

  function handleDisconnect() {
    disconnect();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            sign-in-with-stacks + NextAuth.js Example
          </h1>
          <p>next-auth status: {status}</p>
          {session ? <p>next-auth session: {JSON.stringify(session)}</p> : null}
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
