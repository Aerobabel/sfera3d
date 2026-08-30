'use client';

import { useEffect } from "react";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function MarketingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const parallaxElements = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const interactiveElements = Array.from(document.querySelectorAll<HTMLElement>("[data-interactive]"));

    const revealObserver = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            });
          },
          { rootMargin: "0px 0px -8%", threshold: 0.12 },
        );

    revealElements.forEach((element) => {
      if (reducedMotion) element.classList.add("is-visible");
      else revealObserver?.observe(element);
    });

    let animationFrame = 0;
    const updateScrollMotion = () => {
      animationFrame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = clamp(window.scrollY / scrollRange, 0, 1);
      root.style.setProperty("--marketing-scroll-progress", progress.toFixed(4));
      document.body.toggleAttribute("data-marketing-scrolled", window.scrollY > 20);

      if (!reducedMotion) {
        parallaxElements.forEach((element) => {
          const speed = Number(element.dataset.parallax ?? "0.06");
          const rect = element.getBoundingClientRect();
          const distanceFromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
          const offset = clamp(distanceFromCenter * -speed, -72, 72);
          element.style.setProperty("--marketing-parallax", `${offset.toFixed(2)}px`);
        });
      }
    };

    const requestScrollMotion = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateScrollMotion);
    };

    const pointerHandlers = interactiveElements.map((element) => {
      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
        element.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      };

      const handlePointerLeave = () => {
        element.style.removeProperty("--pointer-x");
        element.style.removeProperty("--pointer-y");
      };

      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("pointerleave", handlePointerLeave);
      return { element, handlePointerMove, handlePointerLeave };
    });

    window.addEventListener("scroll", requestScrollMotion, { passive: true });
    window.addEventListener("resize", requestScrollMotion, { passive: true });
    updateScrollMotion();

    return () => {
      revealObserver?.disconnect();
      window.removeEventListener("scroll", requestScrollMotion);
      window.removeEventListener("resize", requestScrollMotion);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      document.body.removeAttribute("data-marketing-scrolled");
      root.style.removeProperty("--marketing-scroll-progress");
      pointerHandlers.forEach(({ element, handlePointerMove, handlePointerLeave }) => {
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerleave", handlePointerLeave);
      });
    };
  }, []);

  return (
    <div className="marketing-scroll-progress" aria-hidden="true">
      <span />
    </div>
  );
}
