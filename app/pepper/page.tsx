"use client";

import { useRouter } from "next/navigation";
import ChatView from "../components/ChatView";
import { useTableNavigation } from "../hooks/useTableNavigation";

export default function PepperPage() {
  const { navigateWithTable, goBack } = useTableNavigation();
  const router = useRouter();

  const handleBack = () => {
    //navigateWithTable("/menu");
    router.back();
  };

  return <ChatView onBack={handleBack} />;
}
