'use client';

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'Customer Segmentation',
    desc: 'Group customers by behavior, usage, and health scores automatically.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Churn Prediction',
    desc: 'AI-powered insights that predict which customers are at risk before they leave.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Team Chat & Collaboration',
    desc: 'Built-in chat to discuss and take action on customer insights directly.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Retention Actions',
    desc: 'Automated workflows to engage at-risk customers at the right time.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-black mb-4">
            Everything you need to retrain
          </h2>
          <p className="text-base text-gray-400">
            Powerful features that work together seamlessly to drive growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="flex items-start gap-5 bg-gray-50 rounded-3xl p-8 border border-gray-100 cursor-default group transition-all duration-300 hover:border-black/20 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:rounded-xl">
                {feat.icon}
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-black mb-2 transition-colors duration-200">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed transition-colors duration-200 group-hover:text-gray-700">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
