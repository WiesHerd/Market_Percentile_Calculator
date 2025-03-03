'use client';

import { SurveyProvider } from '@/context/SurveyContext';

export default function SurveyManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurveyProvider>{children}</SurveyProvider>;
} 