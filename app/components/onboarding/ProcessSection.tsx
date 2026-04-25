'use client';

import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

const steps = [
  {
    num: '01',
    title: 'Connect your data',
    desc: 'Integrate with your CRM, payment processors, and existing data stack in minutes.',
  },
  {
    num: '02',
    title: 'Analyze behavior',
    desc: 'Our AI engine scans for patterns and identifies high-risk customers automatically.',
  },
  {
    num: '03',
    title: 'Take Action',
    desc: 'Deploy targeted retention campaigns and bridge the gap with unified team context.',
  },
];

export default function ProcessSection() {
  return (
    <section id="process" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className={`${spaceGrotesk.className} text-4xl lg:text-5xl font-bold text-black mb-4`}>
            The Arka Method
          </h2>
          <p className={`${inter.className} text-base text-gray-400`}>
            Scale your retention efforts in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="group cursor-default relative"
            >
              {/* Step number — turns black on hover */}
              <p
                className={`${spaceGrotesk.className} text-8xl font-bold leading-none mb-4 select-none
                  transition-all duration-400 ease-out
                  text-gray-100 group-hover:text-black
                  group-hover:-translate-y-1
                `}
                style={{ transitionDuration: '350ms' }}
              >
                {step.num}
              </p>

              {/* Animated underline accent */}
              <div className="h-0.5 w-0 bg-black transition-all duration-400 mb-4 group-hover:w-12" style={{ transitionDuration: '350ms' }} />

              <h3 className={`${spaceGrotesk.className} text-xl font-semibold text-black mb-3 transition-all duration-300 group-hover:translate-x-1`}>
                {step.title}
              </h3>
              <p className={`${inter.className} text-sm text-gray-500 leading-relaxed transition-colors duration-300 group-hover:text-gray-700`}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
