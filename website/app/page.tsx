import { InstallCTA } from "@/components/InstallCTA";
import { Footer } from "@/components/Footer";
import { Features } from "@/components/Features";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { SkillsCatalog } from "@/components/SkillsCatalog";
import { Testimonials } from "@/components/Testimonials";
import { TerminalDemo } from "@/components/TerminalDemo";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TerminalDemo />
        <Features />
        <SkillsCatalog />
        <Testimonials />
        <InstallCTA />
      </main>
      <Footer />
    </>
  );
}
