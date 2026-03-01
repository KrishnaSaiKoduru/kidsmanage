import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

const tabContent = {
  'center-management': {
    label: 'Center Management',
    title: 'Centralized Center Management',
    description: "Consolidate administrative tasks, reduce manual paperwork, and focus on what matters most—child development. Get a bird's-eye view of your entire operation from a single dashboard.",
    features: ['Staff Scheduling & Ratios', 'Comprehensive Child Profiles', 'Automated Compliance Reporting'],
    colorTheme: 'blue',
    image: '/images/landing_dashboard.png'
  },
  'billing': {
    label: 'Billing',
    title: 'Automated Billing & Invoicing',
    description: 'Say goodbye to disorganized billing and delayed payments. Automate your invoicing process and give parents secure, convenient ways to pay online.',
    features: ['Auto-generate Invoices', 'Secure Payment Options (Credit Card/ACH)', 'Late Fee Automation & Reminders'],
    colorTheme: 'green',
    image: '/images/landing_learning.png'
  },
  'attendance': {
    label: 'Attendance',
    title: 'Real-Time Attendance Tracking',
    description: 'Ensure safety and accuracy with digital check-in systems. Monitor staff-to-child ratios in real-time to maintain compliance effortlessly.',
    features: ['PIN or QR-Based Check-in/out', 'Live Staff-to-Child Ratios', 'Daily Attendance Reports'],
    colorTheme: 'purple',
    image: '/images/landing_attendance.png'
  },
  'enrollment': {
    label: 'Enrollment',
    title: 'Stress-Free Digital Enrollment',
    description: 'Move away from paper packets. Streamline your onboarding process with customizable digital enrollment forms and waitlist management.',
    features: ['Custom Online Registration Forms', 'Waitlist & Lead Management', 'Digital Document Storage & e-Signatures'],
    colorTheme: 'yellow',
    image: '/images/landing_enrollment.png'
  },
  'parent-engagement': {
    label: 'Parent Engagement',
    title: 'Enhanced Parent Engagement',
    description: 'Keep parents connected and informed. Share daily moments, developmental milestones, and important announcements instantly.',
    features: ['Instant Two-way Messaging', 'Daily Activity Logs (Meals, Naps, Lessons)', 'Photo & Video Sharing'],
    colorTheme: 'pink',
    image: '/images/landing_activities.png'
  },
  'marketing': {
    label: 'Marketing',
    title: 'Growth & Marketing Tools',
    description: 'Grow your business and reach more families online. Use our built-in tools to establish a strong online presence for your center.',
    features: ['AI-Powered Website Builder', 'SEO Optimization & Lead Gen', 'Marketing Analytics Dashboard'],
    colorTheme: 'indigo',
    image: '/images/landing_marketing.png'
  }
};

const LandingPage = () => {
  const { signIn, signUp, signUpUser } = useAuth();
  const [activeTab, setActiveTab] = useState('center-management');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', centerName: '', directorName: '', phone: '', role: 'PARENT', joinCode: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const activeData = tabContent[activeTab];

  const openLogin = () => { setAuthMode('login'); setAuthError(''); setShowAuthModal(true); };
  const openSignup = () => { setAuthMode('signup'); setAuthError(''); setShowAuthModal(true); };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await signIn({ email: authForm.email, password: authForm.password });
      } else {
        await signUpUser({
          name: authForm.directorName,
          email: authForm.email,
          password: authForm.password,
          phone: authForm.phone,
          role: authForm.role,
          joinCode: authForm.joinCode,
        });
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">KidsManage</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Features</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Pricing</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Resources</a>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={openLogin} className="text-gray-600 hover:text-blue-600 font-medium hidden sm:block active:scale-95 transition-transform">Log in</button>
              <button onClick={openSignup} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 active:scale-95 transition-all">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            All-in-One Childcare Management Software
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10">
            Streamline operations, automate billing, and engage parents—all from one centralized platform designed for daycare centers and preschools.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button onClick={openSignup} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg">
              Start Free Trial
            </button>
            <button className="bg-white text-blue-600 border border-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section with Tabs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Powerful Features for Your Center</h2>
            <p className="mt-4 text-lg text-gray-600">Everything you need to run your childcare business efficiently.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex overflow-x-auto border-b border-gray-200 mb-8 pb-px justify-start md:justify-center no-scrollbar">
            {Object.entries(tabContent).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-200 ${
                  activeTab === key
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {data.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 min-h-[400px] flex flex-col md:flex-row items-center gap-12 transition-all duration-500">
            <div className="w-full md:w-1/2">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{activeData.title}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed text-lg">{activeData.description}</p>
              <ul className="space-y-4">
                {activeData.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-700 text-lg">
                    <svg className="w-6 h-6 text-blue-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature Illustration */}
            <div className={`w-full md:w-1/2 rounded-xl overflow-hidden border shadow-inner bg-${activeData.colorTheme}-50 border-${activeData.colorTheme}-100 h-80 flex items-center justify-center`}>
              <img
                src={activeData.image}
                alt={`${activeData.label} illustration`}
                className="w-full h-full object-contain p-4 transition-all duration-500"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500">
        <p>&copy; 2026 KidsManage. All rights reserved.</p>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative animate-fade-slide">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {authMode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-gray-500 mb-6">
              {authMode === 'login' ? 'Sign in to your KidsManage account.' : 'Start your free trial today.'}
            </p>

            {authError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{authError}</div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                    <select
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="PARENT">Parent</option>
                      <option value="CARETAKER">Caretaker</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    required
                    value={authForm.directorName}
                    onChange={(e) => setAuthForm({ ...authForm, directorName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Center Join Code"
                    required
                    value={authForm.joinCode}
                    onChange={(e) => setAuthForm({ ...authForm, joinCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tracking-widest font-mono"
                  />
                </>
              )}
              <input
                type="email"
                placeholder="Email Address"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                required
                minLength={8}
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {authMode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className="text-blue-600 font-medium hover:underline">Sign up</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-blue-600 font-medium hover:underline">Log in</button>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
