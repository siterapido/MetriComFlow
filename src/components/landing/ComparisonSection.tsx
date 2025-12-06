import { useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { FileSpreadsheet, LayoutDashboard, X, Check } from "lucide-react";

export function ComparisonSection() {
  const [sliderValue, setSliderValue] = useState(50);

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            A diferença é <span className="text-gradient">clara</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Abandone o caos das planilhas e assuma o controle da sua operação.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
          
            {/* Image Container */}
            <div className="relative w-full h-full">
                
                {/* AFTER Image (Bottom Layer, fully visible initially but masked by container width) */}
                <div 
                    className="absolute inset-0 w-full h-full bg-background"
                >
                     {/* Mockup for "With InsightFy" */}
                    <div className="w-full h-full bg-gradient-to-br from-background to-secondary/10 flex flex-col items-center justify-center p-8 relative">
                         <div className="absolute top-8 right-8 flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20 backdrop-blur-md">
                            <Check className="w-4 h-4" />
                            <span className="font-bold text-sm">Organizado & Automatizado</span>
                         </div>
                         
                         {/* Abstract Dashboard UI Representation */}
                         <div className="w-3/4 h-3/4 grid grid-cols-3 gap-4 opacity-80">
                            <div className="col-span-2 row-span-2 bg-card/50 rounded-xl border border-primary/30 p-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent"></div>
                                <div className="h-4 w-1/3 bg-primary/20 rounded mb-4"></div>
                                <div className="h-32 w-full bg-gradient-to-t from-primary/20 to-transparent rounded-lg bottom-0 absolute"></div>
                            </div>
                            <div className="bg-card/50 rounded-xl border border-white/10 p-4">
                                <div className="h-8 w-8 rounded-full bg-secondary/20 mb-2"></div>
                                <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                            </div>
                            <div className="bg-card/50 rounded-xl border border-white/10 p-4">
                                 <div className="h-8 w-8 rounded-full bg-green-500/20 mb-2"></div>
                                 <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                            </div>
                            <div className="col-span-3 bg-card/50 rounded-xl border border-white/10 p-4 flex items-center gap-4">
                                <div className="h-8 w-8 rounded bg-primary/20"></div>
                                <div className="h-2 w-full bg-white/5 rounded"></div>
                            </div>
                         </div>
                         <div className="absolute bottom-10 text-primary font-bold text-xl tracking-widest uppercase opacity-20">Com InsightFy</div>
                    </div>
                </div>

                {/* BEFORE Image (Top Layer, clipped) */}
                <div 
                    className="absolute inset-0 w-full h-full bg-zinc-900 border-r border-white/20"
                    style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                >
                    {/* Mockup for "Without InsightFy" */}
                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-8 relative grayscale opacity-60">
                         <div className="absolute top-8 left-8 flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-full border border-red-500/20">
                            <X className="w-4 h-4" />
                            <span className="font-bold text-sm">Caos & Manual</span>
                         </div>

                        {/* Abstract Spreadsheet UI Representation */}
                        <div className="w-3/4 h-3/4 bg-white/5 rounded-none border border-white/10 p-4 grid grid-rows-6 gap-2">
                             {[1,2,3,4,5,6].map(i => (
                                 <div key={i} className="grid grid-cols-4 gap-2 border-b border-white/5 pb-2">
                                     <div className="h-2 bg-white/10 rounded w-full"></div>
                                     <div className="h-2 bg-white/10 rounded w-full"></div>
                                     <div className="h-2 bg-white/10 rounded w-full"></div>
                                     <div className="h-2 bg-white/10 rounded w-full"></div>
                                 </div>
                             ))}
                        </div>
                        <div className="absolute bottom-10 text-white font-bold text-xl tracking-widest uppercase opacity-20">Sem InsightFy</div>
                    </div>
                </div>

                {/* Slider Handle */}
                <div 
                    className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 hover:shadow-[0_0_15px_white]"
                    style={{ left: `${sliderValue}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute rotate-180"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                </div>

                {/* Interactive Area for Dragging */}
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderValue} 
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                />
            </div>

        </div>
        
        <div className="flex justify-center mt-8 gap-12 text-sm text-muted-foreground">
             <div className="flex items-center gap-2">
                 <FileSpreadsheet className="w-4 h-4" />
                 <span>Planilhas Manuais</span>
             </div>
             <div className="flex items-center gap-2 text-primary">
                 <LayoutDashboard className="w-4 h-4" />
                 <span>Dashboard Automática</span>
             </div>
        </div>
      </div>
    </section>
  );
}




