'use client';

import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import StatsBanner from './components/StatsBanner';
import ProblemsSection from './components/ProblemsSection';
import FeaturesSection from './components/FeaturesSection';
import ProcessSection from './components/ProcessSection';
import TestimonialsSection from './components/TestimonialsSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';

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
