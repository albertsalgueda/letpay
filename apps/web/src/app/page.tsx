import Link from 'next/link';

const features = [
  { icon: '💳', title: 'Fund with any card', desc: 'Credit, debit, or bank transfer — top up your agent wallet instantly.' },
  { icon: '🌍', title: 'EU + US coverage', desc: 'Powered by Stripe Issuing. Works across Europe and the United States.' },
  { icon: '🔒', title: 'Human-in-the-loop', desc: 'Approve big purchases from Telegram before your agent spends.' },
  { icon: '📊', title: 'Live dashboard', desc: 'Every transaction in real-time. Full visibility into agent spending.' },
  { icon: '⚡', title: 'Instant alerts', desc: 'Telegram and email notifications on every spend, instantly.' },
  { icon: '🛑', title: 'Kill switch', desc: 'Freeze everything in one click. Full control, always.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold">LetPay</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black transition">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Let your AI agent pay
        </h1>
        <p className="mt-6 text-xl text-gray-600 leading-relaxed">
          Fund with your card. Set limits. Done.<br />
          Your agent gets a virtual Visa, funded by your regular card, with spending controls you set.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup" className="rounded-lg bg-black px-6 py-3 text-base font-medium text-white hover:bg-gray-800 transition">
            Create Free Account
          </Link>
          <Link href="#features" className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium hover:bg-gray-50 transition">
            Learn More
          </Link>
        </div>
      </section>

      <section id="features" className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold">Everything you need</h2>
          <p className="mt-3 text-center text-gray-600">Full control over your AI agent&apos;s spending.</p>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-gray-600">Start free. Scale as you grow.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold">Free</h3>
              <p className="mt-2 text-3xl font-bold">€0</p>
              <p className="mt-1 text-sm text-gray-500">1 wallet, €50/mo limit</p>
            </div>
            <div className="rounded-xl border-2 border-black p-6">
              <h3 className="font-semibold">Pro</h3>
              <p className="mt-2 text-3xl font-bold">€9.99<span className="text-base font-normal text-gray-500">/mo</span></p>
              <p className="mt-1 text-sm text-gray-500">5 wallets, €500/mo limit</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold">Business</h3>
              <p className="mt-2 text-3xl font-bold">€29.99<span className="text-base font-normal text-gray-500">/mo</span></p>
              <p className="mt-1 text-sm text-gray-500">Unlimited wallets & limits</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-black py-16 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold">Ready to let your agent pay?</h2>
          <p className="mt-3 text-gray-400">Set up in under 2 minutes. No crypto. No complexity.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-medium text-black hover:bg-gray-100 transition">
            Get Started Free
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between text-sm text-gray-500">
          <span>LetPay &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-black transition">Privacy</Link>
            <Link href="#" className="hover:text-black transition">Terms</Link>
            <Link href="https://github.com/albertsalgueda" className="hover:text-black transition">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
