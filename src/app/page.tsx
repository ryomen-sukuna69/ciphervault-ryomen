import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { LenisProvider } from "@/components/LenisProvider";

export default function Home() {
  return (
    <LenisProvider>
      <div className="relative min-h-screen overflow-x-hidden">
        <HeroScene />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="font-semibold tracking-tight">CipherVault</div>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Link className="hover:text-white" href="/auth">
              Auth
            </Link>
            <Link
              className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30"
              href="/send"
            >
              Launch app
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pb-20 pt-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              AES-GCM + RSA-OAEP hybrid encryption • Client-side keys
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight">
              End-to-end encrypted file transfer, built to showcase security.
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              CipherVault encrypts your files in the browser. The server stores
              ciphertext only. Recipients unwrap a per-transfer AES session key
              with their private key kept in a local vault.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
              >
                Create account
              </Link>
              <Link
                href="/vault"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-semibold text-white hover:border-white/30"
              >
                Set up your vault
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Confidentiality</div>
            <p className="mt-2 text-sm text-zinc-300">
              Your file data is encrypted with AES-GCM before upload. The server
              never sees plaintext.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Integrity</div>
            <p className="mt-2 text-sm text-zinc-300">
              AES-GCM authentication tags protect against tampering; ciphertext
              hashes are recorded for verification.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Authenticity</div>
            <p className="mt-2 text-sm text-zinc-300">
              Sender signs canonical metadata with RSA-PSS. Receiver verifies
              before decrypting.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8">
            <div className="text-sm font-semibold">Ready to try it?</div>
            <p className="mt-2 text-sm text-zinc-300">
              Create an account, generate your keys, then send an encrypted file
              to another user ID.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/send"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
              >
                Send a file
              </Link>
              <Link
                href="/history"
                className="rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-semibold text-white hover:border-white/30"
              >
                View history
              </Link>
            </div>
          </div>
        </section>
      </div>
    </LenisProvider>
  );
}
