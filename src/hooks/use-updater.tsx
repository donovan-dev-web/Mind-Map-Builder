
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { checkUpdate, downloadUpdate, installUpdate, CheckResult, UpdateManifest } from "@/services/updater.service";

type UpdateStatus = 'IDLE' | 'CHECKING' | 'PENDING' | 'DOWNLOADING' | 'READY_TO_INSTALL' | 'ERROR';

interface UpdaterContextType {
    status: UpdateStatus;
    updateAvailable: boolean;
    updateManifest: UpdateManifest | null;
    downloadProgress: number;
    error: string | null;
    
    // Actions
    checkForUpdate: () => Promise<void>;
    startDownload: () => Promise<void>;
    restartAndInstall: () => Promise<void>;
}

const UpdaterContext = createContext<UpdaterContextType | undefined>(undefined);

export const useUpdater = (): UpdaterContextType => {
    const context = useContext(UpdaterContext);
    if (!context) {
        throw new Error("useUpdater must be used within an UpdaterProvider");
    }
    return context;
};

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<UpdateStatus>('IDLE');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Silent check on startup
    useEffect(() => {
        const initialCheck = async () => {
            try {
                const result = await checkUpdate();
                if (result.shouldUpdate && result.manifest) {
                    setUpdateAvailable(true);
                    setUpdateManifest(result.manifest);
                    setStatus('PENDING');
                }
            } catch (e) {
                // Fail silently on initial check
                console.error("Initial update check failed:", e);
            }
        };
        initialCheck();
    }, []);

    const checkForUpdate = useCallback(async () => {
        setStatus('CHECKING');
        setError(null);
        try {
            const result = await checkUpdate();
            if (result.shouldUpdate && result.manifest) {
                setUpdateAvailable(true);
                setUpdateManifest(result.manifest);
                setStatus('PENDING');
            } else {
                setUpdateAvailable(false);
                setUpdateManifest(null);
                setStatus('IDLE');
            }
        } catch (e: any) {
            setError(e.message || "Failed to check for updates.");
            setStatus('ERROR');
        }
    }, []);

    const startDownload = useCallback(async () => {
        if (status !== 'PENDING') return;

        setStatus('DOWNLOADING');
        setError(null);
        setDownloadProgress(0);
        try {
            await downloadUpdate((progress) => {
                setDownloadProgress(progress);
            });
            setStatus('READY_TO_INSTALL');
        } catch (e: any) {
            setError(e.message || "Failed to download update.");
            setStatus('ERROR');
        }
    }, [status]);

    const restartAndInstall = useCallback(async () => {
        if (status !== 'READY_TO_INSTALL') return;

        try {
            await installUpdate();
            // The app will restart, so no need to reset state here.
        } catch (e: any) {
            setError(e.message || "Failed to install update.");
            setStatus('ERROR');
        }
    }, [status]);

    const value = {
        status,
        updateAvailable,
        updateManifest,
        downloadProgress,
        error,
        checkForUpdate,
        startDownload,
        restartAndInstall,
    };

    return (
        <UpdaterContext.Provider value={value}>
            {children}
        </UpdaterContext.Provider>
    );
};