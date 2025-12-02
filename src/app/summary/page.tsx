"use client";

import { useEffect, useState } from "react";
import { SummaryTable } from "@/components/SummaryTable";
import { Box, CircularProgress } from "@mui/material";
import { useNetworkStore } from "@/store/useNetworkStore";

export default function SummarySnapshotPage() {
    const { setNetwork, network } = useNetworkStore();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedNetwork = localStorage.getItem("networkSnapshot");
            if (storedNetwork) {
                setNetwork(JSON.parse(storedNetwork));
            }
            setLoaded(true);
        } catch (error) {
            console.error("Failed to load network snapshot:", error);
            setLoaded(true);
        }
    }, [setNetwork]);

    if (!loaded) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!network.nodes.length && !network.pipes.length) {
        // Handle case where load failed or empty
        // But maybe network was empty.
        // Let's just show table, it will be empty.
    }

    return (
        <Box sx={{ width: "100%", height: "100vh", p: 2, overflow: "auto" }}>
            <SummaryTable isSnapshot={true} />
        </Box>
    );
}
