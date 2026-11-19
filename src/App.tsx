import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig, motion } from 'framer-motion';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { wagmiConfig } from './lib/wagmiConfig';
import { BrowseEventsPage } from './pages/BrowseEventsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { HomePage } from './pages/HomePage';
import { MyEventsPage } from './pages/MyEventsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const arenaRainbowTheme = lightTheme({
  accentColor: '#ffc83d',
  accentColorForeground: '#111111',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'none',
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<BrowseEventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/create" element={<CreateEventPage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
      </Routes>
    </motion.div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={arenaRainbowTheme}>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-[#ffffff] text-[#111111]">
                <Navbar />
                <main className="flex-1">
                  <AnimatedRoutes />
                </main>
                <Footer />
              </div>
            </BrowserRouter>
          </MotionConfig>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
