import Nav from "./components/Nav";
import { WalletProvider } from "./lib/WalletContext";
import HowItWorks from "./components/HowItWorks";
import Hero from "./components/Hero";
import Manifesto from "./components/Manifesto";
import Diagram from "./components/Diagram";
import Courtroom from "./components/Courtroom";
import Deploy from "./components/Deploy";
import Footer from "./components/Footer";

export default function App() {
  return (
    <WalletProvider>
      <div className="relative min-h-screen bg-ink-950 font-sans text-white antialiased selection:bg-gilt-400/30">
        <div className="noise-layer" aria-hidden />
        <Nav />
        <main className="relative">
          <Hero />
          <Manifesto />
          <Diagram />
          <Courtroom />
          <HowItWorks />
          <Deploy />
        </main>
        <Footer />
      </div>
    </WalletProvider>
  );
}
