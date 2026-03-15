import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mammo Global — FL Admin Dashboard',
  description: 'Global Federated Learning Dashboard for National Mammogram AI Detection System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#f5f7fa', margin: 0 }}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
