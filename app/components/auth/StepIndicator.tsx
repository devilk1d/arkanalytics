interface Step {
  label: string;
  status: 'done' | 'active' | 'pending';
}

export default function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${step.status === 'done' ? 'bg-green-500 text-white' :
                  step.status === 'active' ? 'bg-black text-white' :
                  'border-2 border-gray-200 text-gray-400 bg-white'}
              `}
            >
              {step.status === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="font-display text-xs">{i + 1}</span>
              )}
            </div>
            <span className={`text-sm font-medium ${
              step.status === 'pending' ? 'text-gray-400' : 'text-black'
            }`}>
              {step.label}
            </span>
          </div>
          {/* Connector */}
          {i < steps.length - 1 && (
            <div className="w-12 h-px bg-gray-200" />
          )}
        </div>
      ))}
    </div>
  );
}
