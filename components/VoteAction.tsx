"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import { createMemoInstruction } from "@solana/spl-memo";
import {
	SystemProgram,
	Transaction,
	PublicKey,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { GAME_MASTER_PUBLIC_KEY, GAME_MASTER_ADDRESS } from "@/constants";
import { SessionManager } from "@/utils/SessionManager";

interface VotePayload {
	a: "ATTACK" | "DEFEND" | "INVEST";
	t: string;
	v: "YES" | "NO";
	ts: number;
	l: "SWORD" | "SHIELD";
}

export const VoteAction: React.FC = () => {
	const { publicKey, connected, sendTransaction, signMessage } = useWallet();
	const { connection } = useConnection();
	const [voteChoice, setVoteChoice] = useState<"YES" | "NO">("YES");
	const [isLoading, setIsLoading] = useState(false);
	const [loadout, setLoadout] = useState<"SWORD" | "SHIELD">("SWORD");
	const [sessionBalance, setSessionBalance] = useState<number | null>(null);

	const refreshBalance = useCallback(async () => {
		const session = SessionManager.getSession();
		if (session && connection) {
			try {
				const bal = await connection.getBalance(session.keypair.publicKey);
				setSessionBalance(bal / LAMPORTS_PER_SOL);
			} catch (e) {
				console.error("Failed to fetch session balance:", e);
			}
		} else {
			setSessionBalance(null);
		}
	}, [connection]);

	useEffect(() => {
		refreshBalance();
		const interval = setInterval(refreshBalance, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, [refreshBalance]);

	const handleSendVote = async () => {
		const session = SessionManager.getSession();
		if (!session) {
			alert("No active session! Please login first.");
			return;
		}
		const { keypair: sessionKeypair } = session;

		//funds check
		if (sessionBalance !== null && sessionBalance < 0.005) {
			alert("Session account has insufficient funds. Please restart session.");
			return;
		}

		if (!publicKey || !connection || isLoading) return;

		setIsLoading(true);

		try {
			const currentProposalTarget = "NORTH_CASTLE";
			const proposalAction = "ATTACK";

			const payload: VotePayload = {
				a: proposalAction as "ATTACK" | "DEFEND" | "INVEST",
				t: currentProposalTarget,
				v: voteChoice,
				ts: Date.now(),
				l: loadout,
			};

			const jsonString = JSON.stringify(payload);
			const messageBytes = naclUtil.decodeUTF8(jsonString);

			const ephemeralKeyPair = nacl.box.keyPair();
			const nonce = nacl.randomBytes(nacl.box.nonceLength);

			const encryptedMessage = nacl.box(
				messageBytes,
				nonce,
				GAME_MASTER_PUBLIC_KEY,
				ephemeralKeyPair.secretKey,
			);

			const memoContent = [
				naclUtil.encodeBase64(ephemeralKeyPair.publicKey),
				naclUtil.encodeBase64(nonce),
				naclUtil.encodeBase64(encryptedMessage),
			].join(":");

			const transaction = new Transaction();

			//the vote
			transaction.add(
				createMemoInstruction(memoContent, [sessionKeypair.publicKey]),
			);

			//auto signer
			console.log("Sending vote via Session Key...");
			const txId = await SessionManager.sendSessionTransaction(
				connection,
				transaction,
			);

			console.log("Vote Cast! Tx Hash:", txId);
			alert("Vote Sent! (Check console for hash)");
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			console.error("Auto-sign failed:", err);
			if (err.logs) {
				console.error("Transaction Logs:", err.logs);
			}
			alert(`Vote Failed: ${err.message ? err.message : "Unknown error"}`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleStartSession = async () => {
		if (!signMessage || !publicKey || !sendTransaction) return;
		setIsLoading(true);
		try {
			const sessionKeypair = await SessionManager.createSession(signMessage);
			const transferTx = new Transaction().add(
				SystemProgram.transfer({
					fromPubkey: publicKey,
					toPubkey: sessionKeypair.publicKey,
					lamports: 0.02 * LAMPORTS_PER_SOL, // Fund session with 0.02 SOL
				}),
			);

			console.log("Funding session account...");
			const signature = await sendTransaction(transferTx, connection);

			await connection.confirmTransaction(signature, "confirmed");
			alert(
				"Session active and funded! You can now vote without signing each time.",
			);

			await refreshBalance();
		} catch (err) {
			console.error("Session failed to start:", err);
			alert("Failed to start session. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mt-10 p-6 border border-gray-700 rounded-lg bg-gray-900 shadow-2xl text-white max-w-md w-full relative">
			{sessionBalance !== null && (
				<div
					className={`absolute top-4 right-4 text-xs font-mono px-2 py-1 rounded border ${
						sessionBalance < 0.005
							? "bg-red-900/50 border-red-500 text-red-200"
							: "bg-green-900/50 border-green-500 text-green-200"
					}`}>
					⛽️ {sessionBalance.toFixed(4)} SOL
				</div>
			)}
			<h2 className="text-2xl font-bold mb-6 text-center text-yellow-500">
				CAST VOTE
			</h2>
			{/* State 1: Wallet not connected */}
			{!connected && (
				<div className="text-center p-4 bg-red-900/30 rounded border border-red-500/50">
					<p className="text-red-200 font-mono"> ⚠️ System Offline</p>
					<p className="text-sm text-gray-400 mt-2">
						Connect main wallet to access the terminal
					</p>
				</div>
			)}

			{/* State 2: Connected but no active session */}
			{connected && (
				<div className="flex flex-col gap-4">
					<button
						onClick={handleStartSession}
						className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded font-bold transition-all shadow-lg hover:shadow-purple-500/50">
						{sessionBalance !== null ? "♻️ Top up session" : "🔑 Start Session"}
					</button>

					<p className="text-xs text-center text-gray-500">
						(Authorize background signing + funds 0.02 SOL gas)
					</p>
					<hr className="border-gray-700 my-4" />

					{/* State 3: Active session - voting options */}
					<div>
						<p className="text-sm text-gray-400 mb-3 uppercase tracking-widest font-semibold">
							Select Loadout
						</p>
						{/* Equipment buttons */}
						<div className="grid grid-cols-2 gap-4 mb-6">
							<button
								onClick={() => setLoadout("SWORD")}
								className={`p-4 rounded border transition-all ${
									loadout === "SWORD"
										? "bg-red-600 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
										: "bg-gray-800 border-gray-700 opacity-50 hover:opacity-100"
								}`}>
								<div className="text-2xl mb-1">🗡️</div>
								<div className="font-bold">STR +5</div>
							</button>

							<button
								onClick={() => setLoadout("SHIELD")}
								className={`p-4 rounded border transition-all ${
									loadout === "SHIELD"
										? "bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
										: "bg-gray-800 border-gray-700 opacity-50 hover:opacity-100"
								}`}>
								<div className="text-2xl mb-1">🛡️</div>
								<div className="font-bold">DEF +5</div>
							</button>
						</div>
						{/* Vote buttons */}
						<button
							onClick={handleSendVote}
							disabled={isLoading}
							className={`w-full py-4 text-xl font-black rounded tracking-widest uppercase transition-all ${
								isLoading
									? "bg-gray-600 cursor-not-allowed"
									: "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.6)]"
							}`}>
							{isLoading ? "ENCRYPTING..." : "CONFIRM ATTACK"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
