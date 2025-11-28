"use client";

import { useEffect, useState } from "react";
import { SummaryTable } from "@/components/SummaryTable";
import { NetworkState } from "@/lib/types";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function SummarySnapshotPage() {
    const [network, setNetwork] = useState<NetworkState | null>(null);

    useEffect(() => {
        try {
            const storedNetwork = localStorage.getItem("networkSnapshot");
            if (storedNetwork) {
                setNetwork(JSON.parse(storedNetwork));
            }
        } catch (error) {
            console.error("Failed to load network snapshot:", error);
        }
    }, []);

    if (!network) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%", height: "100vh", p: 2, overflow: "auto" }}>
            <SummaryTable network={network} isSnapshot={true} onNetworkChange={setNetwork} />
        </Box>
    );
}
