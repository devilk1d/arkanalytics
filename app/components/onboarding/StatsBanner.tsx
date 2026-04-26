'use client';

const stats = [
  { value: '32%', label: 'Churn Prediction', sub: 'Average improvement' },
  { value: '1.2B+', label: 'Data Scale', sub: 'Signals processed' },
  { value: '$4.5M', label: 'Revenue Saved', sub: 'Total client ARR' },
  { value: '98.4%', label: 'Prediction Accuracy', sub: 'Verified models' },
];

export default function StatsBanner() {
  return (
    <section className="bg-black py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="text-center group cursor-default"
          >
            <p
              className="font-display text-3xl lg:text-4xl font-bold text-white mb-1 transition-all duration-300 group-hover:scale-110 group-hover:text-gray-300 inline-block"
            >
              {stat.value}
            </p>
            <p className="font-display text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1 transition-colors duration-300 group-hover:text-gray-200">
              {stat.label}
            </p>
            <p className="text-xs text-gray-600 transition-colors duration-300 group-hover:text-gray-400">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
