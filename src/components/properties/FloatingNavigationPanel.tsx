import React from "react";
import { createPortal } from "react-dom";
import { Stack, Box } from "@mui/material";
import { BackButtonPanel, ForwardButtonPanel } from "./NavigationButtons";

type Props = {
    footerNode: HTMLDivElement | null;
    onBack?: () => void;
    onForward?: () => void;
    backDisabled?: boolean;
    forwardDisabled?: boolean;
};

export const FloatingNavigationPanel = ({
    footerNode,
    onBack,
    onForward,
    backDisabled = false,
    forwardDisabled = false,
}: Props) => {
    if (!footerNode) return null;

    return createPortal(
        <Stack
            direction="row"
            spacing={2}
            sx={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1200,
                pointerEvents: "auto",
            }}
        >
            <BackButtonPanel
                disabled={backDisabled}
                onClick={onBack}
            />
            <ForwardButtonPanel
                disabled={forwardDisabled}
                onClick={onForward}
            />
        </Stack>,
        footerNode
    );
};
