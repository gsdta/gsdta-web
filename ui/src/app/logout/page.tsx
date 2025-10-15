"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";

export default function LogoutPage() {
    const {logout} = useAuth();
    const router = useRouter();

    useEffect(() => {
        (async () => {
            await logout();
            router.replace("/login");
        })();
    }, [logout, router]);

    return <p>Signing you out…</p>;
}
