/* global React, ReactDOM */
(function() {
// All shared components are attached to window by their source files.
// Babel transpiles each <script type="text/babel"> in its own scope, so
// we have to pick them up from window here.
const {
  Sidebar, TopBar, AppCtx,
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle,
  OverviewPage, AnalyticsPage, SegmentationPage,
  DataPage, ReportsPage, ChatPage, SettingsPage,
} = window;

const ACCENTS = {
  mint:  { dark: '#B4F3A8', darkD: '#8FE08D', darkBg: 'rgba(180, 243, 168, 0.10)',
           light: '#2F7A2A', lightD: '#1F5A1B', lightBg: 'rgba(47, 122, 42, 0.08)' },
  amber: { dark: '#E8C674', darkD: '#D4B062', darkBg: 'rgba(232, 198, 116, 0.10)',
           light: '#A8730E', lightD: '#86570B', lightBg: 'rgba(168, 115, 14, 0.08)' },
  sky:   { dark: '#8FB8E8', darkD: '#7AA0CC', darkBg: 'rgba(143, 184, 232, 0.10)',
           light: '#2A5A8A', lightD: '#1E4368', lightBg: 'rgba(42, 90, 138, 0.08)' },
  coral: { dark: '#F0A88E', darkD: '#D89070', darkBg: 'rgba(240, 168, 142, 0.10)',
           light: '#B14A2E', lightD: '#8B3621', lightBg: 'rgba(177, 74, 46, 0.08)' },
};

// TweakColor passes raw color strings back; map between key ↔ swatch hex
const ACCENT_SWATCH = { mint: '#b4f3a8', amber: '#e8c674', sky: '#8fb8e8', coral: '#f0a88e' };
const SWATCH_ACCENT = Object.fromEntries(Object.entries(ACCENT_SWATCH).map(([k, v]) => [v, k]));

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "mint",
  "sidebarCollapsed": false
}/*EDITMODE-END*/;

const TITLES = {
  overview: ['Insights', 'Overview'],
  analytics: ['Insights', 'Analytics'],
  segmentation: ['Insights', 'Segmentation'],
  data: ['Workspace', 'Data Management'],
  reports: ['Workspace', 'Reports'],
  chat: ['Workspace', 'Team Chat'],
  settings: ['Workspace', 'Settings'],
};

function applyThemeAndAccent(theme, accentKey) {
  document.documentElement.setAttribute('data-theme', theme);
  const a = ACCENTS[accentKey] || ACCENTS.mint;
  const root = document.documentElement.style;
  if (theme === 'light') {
    root.setProperty('--accent', a.light);
    root.setProperty('--accent-d', a.lightD);
    root.setProperty('--accent-bg', a.lightBg);
  } else {
    root.setProperty('--accent', a.dark);
    root.setProperty('--accent-d', a.darkD);
    root.setProperty('--accent-bg', a.darkBg);
  }
}

function App() {
  const [route, setRoute] = React.useState('overview');
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [collapsed, setCollapsed] = React.useState(tweaks.sidebarCollapsed);

  React.useEffect(() => {
    applyThemeAndAccent(tweaks.theme, tweaks.accent);
  }, [tweaks.theme, tweaks.accent]);

  React.useEffect(() => {
    setCollapsed(tweaks.sidebarCollapsed);
  }, [tweaks.sidebarCollapsed]);

  // Sync local collapse back to tweaks when user toggles from header
  const setCollapsedAndPersist = (v) => {
    const next = typeof v === 'function' ? v(collapsed) : v;
    setCollapsed(next);
    setTweak('sidebarCollapsed', next);
  };

  const ctx = { route, setRoute, collapsed, setCollapsed: setCollapsedAndPersist };
  const [crumbCat, crumbPage] = TITLES[route] || ['Workspace', 'Overview'];

  return (
    <AppCtx.Provider value={ctx}>
      <div className={`app ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar />
        <div className="main">
          <TopBar crumbs={['arkanalytics', crumbCat, crumbPage]} />
          {route === 'overview'     && <OverviewPage />}
          {route === 'analytics'    && <AnalyticsPage />}
          {route === 'segmentation' && <SegmentationPage />}
          {route === 'data'         && <DataPage />}
          {route === 'reports'      && <ReportsPage />}
          {route === 'chat'         && <ChatPage />}
          {route === 'settings'     && <SettingsPage />}
        </div>

        <TweaksPanel title="Tweaks">
          <TweakSection label="Appearance">
            <TweakRadio
              label="Theme"
              value={tweaks.theme}
              onChange={v => setTweak('theme', v)}
              options={[
                { value: 'dark',  label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
            <TweakColor
              label="Accent"
              value={ACCENT_SWATCH[tweaks.accent]}
              onChange={hex => setTweak('accent', SWATCH_ACCENT[hex] || 'mint')}
              options={Object.values(ACCENT_SWATCH)}
            />
          </TweakSection>
          <TweakSection label="Layout">
            <TweakToggle
              label="Collapse sidebar"
              value={tweaks.sidebarCollapsed}
              onChange={v => setTweak('sidebarCollapsed', v)}
            />
          </TweakSection>
        </TweaksPanel>
      </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

})();
