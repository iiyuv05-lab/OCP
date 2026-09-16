"use client";
import { useEffect, useRef } from "react";
import "../../public/ocp-studio/style.css";

type StudioModule = {
  mount: (
    host: HTMLElement,
    options: { api: string },
  ) => Promise<{ destroy: () => void }>;
};
export default function StudioClient() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let active = true,
      dispose: (() => void) | undefined;
    const url = new URL("/ocp-studio/app.mjs", window.location.origin).href;
    import(/* @vite-ignore */ url)
      .then(async (module: StudioModule) => {
        if (!active) return;
        const instance = await module.mount(host, { api: "/api/studio" });
        if (!active) instance.destroy();
        else dispose = instance.destroy;
      })
      .catch(() => {
        if (active)
          host.textContent =
            "OCP 표현 엔진을 불러오지 못했습니다. 새로고침해 주세요.";
      });
    return () => {
      active = false;
      dispose?.();
    };
  }, []);
  return (
    <div ref={ref} aria-label="OCP v8 통합 작업공간">
      OCP 표현 엔진을 불러오는 중입니다.
    </div>
  );
}
