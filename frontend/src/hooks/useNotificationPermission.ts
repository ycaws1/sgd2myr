"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function useNotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermissionState>("default");
    const [isLoading, setIsLoading] = useState(false);

    // Check initial permission state
    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!("Notification" in window)) {
            setPermission("unsupported");
            return;
        }

        setPermission(Notification.permission as NotificationPermissionState);
    }, []);

    // Request permission function
    const requestPermission = useCallback(async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return "unsupported";
        }

        // If already granted or denied, don't request again
        if (Notification.permission === "granted" || Notification.permission === "denied") {
            setPermission(Notification.permission as NotificationPermissionState);
            return Notification.permission;
        }

        setIsLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result as NotificationPermissionState);
            return result;
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return "default";
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        permission,
        isLoading,
        requestPermission,
        isGranted: permission === "granted",
        isDenied: permission === "denied",
        isDefault: permission === "default",
        isSupported: permission !== "unsupported",
    };
}
