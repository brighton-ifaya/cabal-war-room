"use client";

import { useState, useEffect } from "react";
import { VoteAction } from "@/components/VoteAction";
import { WalletButton } from "@/components/WalletButton";

export default function Home() {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		const raf = requestAnimationFrame(() => setIsMounted(true));
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950 text-white relative overflow-hidden">
			<div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black z-0 pointer-events-none opacity-50"></div>

			<h1 className="text-5xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
				CABAL: WAR ROOM
			</h1>

			<p className="text-lg text-gray-400 mb-10 text-center max-w-xl font-light tracking-wide border-b border-gray-800 pb-8">
				Secure, encrypted strategic voting on the Solana Blockchain.
				<br />
				<span className="text-yellow-500/80 text-sm">
					{" "}
					Target: NORTH_CASTLE | Status: ACTIVE
				</span>
			</p>

			<div className="mb-8 scale-110">
				<WalletButton />
			</div>

			{isMounted && (
				<div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
					<VoteAction />
				</div>
			)}
		</main>
	);
}
