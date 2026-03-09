import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LetPay — AI Agent Payment Layer',
  description: 'Let your AI agent pay. Fund with your card. Set limits. Done.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
