"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

export default function LogoutPage() {
    const {logout} = useAuth();
    const router = useRouter();

    useEffect(() => {
        (async () => {
            await logout();
            router.replace(AUTH_MODE === "firebase" ? "/signin" : "/login");
        })();
    }, [logout, router]);

    return <p>Signing you out…</p>;
}
