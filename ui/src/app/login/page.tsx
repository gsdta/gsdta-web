"use client";
import React, {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

export default function LoginPage() {
    const {user} = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect to signin page which has the proper Firebase auth UI
        if (AUTH_MODE === "firebase") {
            router.replace("/signin");
        } else if (user) {
            router.replace("/dashboard");
        }
    }, [user, router]);

    // If in mock mode and no user, redirect to signin
    useEffect(() => {
        if (AUTH_MODE === "mock" && !user) {
            router.replace("/signin");
        }
    }, [user, router]);

    return (
        <div className="prose">
            <p>Redirecting to sign in...</p>
        </div>
    );
}
