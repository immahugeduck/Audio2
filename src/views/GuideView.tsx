import React from 'react';
import { AcousticGuide } from '../components/AcousticGuide';
import { PageHeader } from '../components/ui';

export const GuideView: React.FC = () => (
  <div className="flex flex-col gap-5 animate-fadeIn">
    <PageHeader
      eyebrow="Guide"
      title="Read the spectrum."
      subtitle="What to look for, where instruments live in frequency, and how to fix common noise problems."
    />
    <AcousticGuide embedded />
  </div>
);
