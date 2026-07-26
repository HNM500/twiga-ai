import { Metadata } from "next";

const title = "Twiga AI Voice";
const description = "Have a voice conversation with Twiga AI. Ask questions, search the web, and get real-time responses with our advanced voice AI assistant.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://twiga.ai/voice",
    siteName: "Twiga AI",
    type: "website",
    images: [
      {
        url: "https://twiga.ai/voice/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Twiga AI Voice - AI Voice Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://twiga.ai/voice/twitter-image.png"],
    creator: "@sciraai",
  },
  alternates: {
    canonical: "https://twiga.ai/voice",
  },
};

export default function VoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
