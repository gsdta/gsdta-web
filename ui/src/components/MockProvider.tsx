"use client";
import {ReactNode, useEffect} from "react";

declare global {
    interface Window {
        __mswReady?: Promise<void>;
        __mswActive?: boolean;
    }
}

export function MockProvider({children}: { children: ReactNode }) {
    useEffect(() => {
        const useMsw = process.env.NEXT_PUBLIC_USE_MSW !== "false";

        if (typeof window !== "undefined") {
            window.__mswActive = false;
            if (useMsw) {
                import("@/mocks/browser").then(({worker}) => {
                    const p = worker.start({
                        onUnhandledRequest: "bypass",
                    }) as Promise<void>;

                    window.__mswReady = p;
                    window.__mswActive = true;
                    console.info("[MockProvider] MSW started (NEXT_PUBLIC_USE_MSW)");
                });
            } else {
                console.info("[MockProvider] MSW disabled (NEXT_PUBLIC_USE_MSW=false)");
            }
        }
    }, []);

    return <>{children}</>;
}
