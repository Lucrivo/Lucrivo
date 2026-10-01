"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { BusinessPathsSection } from "@/components/landing/business-paths-section";
import { DiagnosisOverviewSection } from "@/components/landing/diagnosis-overview-section";
import { DiagnosisPreviewSection } from "@/components/landing/diagnosis-preview-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { ResultColorsSection } from "@/components/landing/result-colors-section";
import type { ActiveBillingPrice } from "@/modules/billing/types";

import "./landing-experience.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function LandingExperience({
  prices,
}: {
  prices: ActiveBillingPrice[];
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) return;

      gsap
        .timeline()
        .from(".hero-copy-reveal", {
          y: 28,
          opacity: 0,
          duration: 0.78,
          stagger: 0.08,
          ease: "power3.out",
        })
        .from(
          ".hero-visual-reveal",
          {
            x: 44,
            y: 18,
            scale: 0.96,
            rotate: 1.5,
            opacity: 0,
            duration: 1.05,
            ease: "power3.out",
          },
          "-=0.52",
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".problem-section",
            start: "top 76%",
            once: true,
          },
        })
        .from(".problem-reveal", {
          y: 18,
          opacity: 0,
          duration: 0.48,
          stagger: 0.08,
          ease: "power2.out",
        });

      gsap.utils.toArray<HTMLElement>("[data-problem-card]").forEach((card) => {
        const content = Array.from(card.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement,
        );

        const setWillChange = () => {
          content.forEach((element) => {
            element.style.willChange = "transform, opacity";
          });
        };
        const clearWillChange = () => {
          content.forEach((element) => {
            element.style.willChange = "auto";
          });
        };

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            end: "bottom 8%",
            scrub: 0.55,
            onEnter: setWillChange,
            onEnterBack: setWillChange,
            onLeave: clearWillChange,
            onLeaveBack: clearWillChange,
          },
        });

        timeline
          .fromTo(
            card,
            { "--problem-scroll-progress": 0 },
            {
              "--problem-scroll-progress": 1,
              duration: 0.5,
              ease: "none",
            },
          )
          .to(card, {
            "--problem-scroll-progress": 0,
            duration: 0.5,
            ease: "none",
          });

        timeline
          .fromTo(
            content,
            { y: 28, opacity: 0.24 },
            { y: 0, opacity: 1, duration: 0.5, ease: "none" },
            0,
          )
          .to(
            content,
            { y: -24, opacity: 0.34, duration: 0.5, ease: "none" },
            0.5,
          );
      });

      gsap.set("[data-reveal]", { y: 26, opacity: 0 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (elements) => {
          gsap.to(elements, {
            y: 0,
            opacity: 1,
            duration: 0.62,
            stagger: 0.09,
            ease: "power2.out",
            overwrite: true,
          });
        },
      });

      gsap.utils.toArray<HTMLElement>(".scroll-visual").forEach((visual) => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: visual,
              start: "top 92%",
              end: "bottom 8%",
              scrub: 1.1,
            },
          })
          .fromTo(
            visual,
            { scale: 0.8, opacity: 0.38 },
            { scale: 1, opacity: 1, ease: "none", duration: 0.55 },
          )
          .to(visual, {
            scale: 0.96,
            opacity: 0.4,
            ease: "none",
            duration: 0.45,
          });
      });
    },
    { scope: root },
  );

  return (
    <main
      ref={root}
      className="landing-experience page-shell w-full max-w-full overflow-x-hidden"
    >
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <BusinessPathsSection />
      <DiagnosisOverviewSection />
      <DiagnosisPreviewSection />
      <ResultColorsSection />
      <HowItWorksSection />
      <PricingSection prices={prices} />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
