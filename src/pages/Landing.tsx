import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { InteractiveCharts } from "@/components/landing/InteractiveCharts";
import { Pricing } from "@/components/landing/Pricing";
import { LeadCapture } from "@/components/landing/LeadCapture";
import { Integrations } from "@/components/landing/Integrations";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  useEffect(() => {
    document.title = "Unifique SaaS — Ads, Leads e Metas em um só fluxo";

    const metaDescription = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );

    const descriptionText =
      "Unifique SaaS conecta Ads, CRM e Metas em um só sistema para squads B2B crescerem com previsibilidade.";

    if (metaDescription) {
      metaDescription.content = descriptionText;
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "description";
      newMeta.content = descriptionText;
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className="bg-neutral-950 text-white">
      <Header />
      <main>
        <Hero />
        <FeatureGrid />
        <InteractiveCharts />
        <Pricing />
        <LeadCapture />
        <Integrations />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
