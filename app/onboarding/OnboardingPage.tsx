'use client';

import Navbar from '../components/onboarding/Navbar';
import HeroSection from '../components/onboarding/HeroSection';
import StatsBanner from '../components/onboarding/StatsBanner';
import ProblemsSection from '../components/onboarding/ProblemsSection';
import FeaturesSection from '../components/onboarding/FeaturesSection';
import ProcessSection from '../components/onboarding/ProcessSection';
import TestimonialsSection from '../components/onboarding/TestimonialsSection';
import CTASection from '../components/onboarding/CTASection';
import Footer from '../components/onboarding/Footer';

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsBanner />
      <ProblemsSection />
      <FeaturesSection />
      <ProcessSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
