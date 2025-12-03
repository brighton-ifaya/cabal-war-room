"use client";

import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const WalletButton: React.FC = () => {
	return (
		<div className="p-4">
			<WalletMultiButton />
		</div>
	);
};
