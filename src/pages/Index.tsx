import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { InteractiveRoi } from "@/components/landing/InteractiveRoi";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer, Header } from "@/components/landing/Footer";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { TargetAudienceSection } from "@/components/landing/TargetAudienceSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <Header />
      <main>
        <HeroSection />
        <TestimonialsSection />
        <FeaturesBento />
        <ComparisonSection />
        <InteractiveRoi />
        <TargetAudienceSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
