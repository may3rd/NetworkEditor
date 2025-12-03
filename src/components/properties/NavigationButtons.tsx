import React from "react";
import { IconButton, IconButtonProps } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

const glassStyle = {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    color: "text.primary",
    "&:hover": {
        background: "rgba(255, 255, 255, 0.2)",
    },
    "&:disabled": {
        background: "rgba(255, 255, 255, 0.05)",
        color: "text.disabled",
    },
};

export const BackButtonPanel = (props: IconButtonProps) => {
    return (
        <IconButton sx={glassStyle} {...props}>
            <ArrowBack />
        </IconButton>
    );
};

export const ForwardButtonPanel = (props: IconButtonProps) => {
    return (
        <IconButton sx={glassStyle} {...props}>
            <ArrowForward />
        </IconButton>
    );
};
