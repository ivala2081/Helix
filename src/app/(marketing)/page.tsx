import { HeroScene } from "@/components/ui/HeroScene";
import { LandingDashboard } from "@/components/landing/LandingDashboard";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fixed 3D background — confined to viewport so the hero is animated
          but downstream sections sit on a calm dark surface. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/40 via-[var(--color-bg)]/85 to-[var(--color-bg)]" />
      </div>

      <LandingDashboard />
    </div>
  );
}
