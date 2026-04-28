import { HelpChat } from "@/components/help-chat";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HelpChat />
    </>
  );
}
