import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import _nacl from "tweetnacl";
import _naclUtil from "tweetnacl-util";
import dotenv from "dotenv";

const nacl = _nacl.default || _nacl;
const naclUtil = _naclUtil.default || _naclUtil;

dotenv.config({ path: ".env.local" });

const SECRET_KEY_STRING = process.env.GAME_MASTER_SECRET_KEY;

if (!SECRET_KEY_STRING) {
	console.error("❌ Error: GAME_MASTER_SECRET_KEY not set in .env.local");
	process.exit(1);
}

console.log("Debug: Reading Key...");
const secretKeyBytes = naclUtil.decodeBase64(SECRET_KEY_STRING);
console.log("Debug: Secret Key Bytes Length:", secretKeyBytes.length);

const encryptionKeyPair = nacl.box.keyPair.fromSecretKey(secretKeyBytes);
console.log("Debug: Generated KeyPair:", encryptionKeyPair);

if (!encryptionKeyPair || !encryptionKeyPair.publicKey) {
	throw new Error(
		"CRITICAL FAILURE: nacl.box.keyPair returned an empty object! The library import is likely broken.",
	);
}

const gameMasterPublicKey = new PublicKey(encryptionKeyPair.publicKey);

console.log("==========================================");
console.log("👁️  CABAL GAME ENGINE ONLINE");
console.log(
	"Listening for Sealed Envelopes on:",
	gameMasterPublicKey.toBase58(),
);
console.log("==========================================\n");

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

function decryptPayload(memoString) {
	try {
		const [ephemPubKeyStr, nonceStr, cipherTextStr] = memoString.split(":");

		const ephemPubKey = naclUtil.decodeBase64(ephemPubKeyStr);
		const nonce = naclUtil.decodeBase64(nonceStr);
		const cipherText = naclUtil.decodeBase64(cipherTextStr);

		const decryptedBytes = nacl.box.open(
			cipherText,
			nonce,
			ephemPubKey, //sender's ephem pub key
			encryptionKeyPair.secretKey,
		);

		if (!decryptedBytes) return null;

		const jsonString = naclUtil.encodeUTF8(decryptedBytes);
		return JSON.parse(jsonString);
	} catch (err) {
		console.error("Decryption Error:", err.message);
		return null;
	}
}

// subscribing to logs for our address
connection.onLogs(
	gameMasterPublicKey,
	async (logs, ctx) => {
		const memoLog = logs.logs.find((l) => l.includes("Memo"));
		if (memoLog) {
			//extract text inside the memo instead of parsing transaciton, its faster for demo purposes

			//Remember, onLogs gives an event but the full memo is truncated so its better to fetch the full transaction
			const signature = logs.signature;
			console.log(`\n🔔 New transaction detected: ${signature.slice(0, 8)}`);

			const tx = await connection.getTransaction(signature, {
				maxSupportedTransactionVersion: 0,
			});
			if (tx && tx.meta && tx.meta.logMessages) {
				//find memo instructions in log messages
				//the spl memo program logs data directly
				const rawLog = tx.meta.logMessages.find((msg) => msg.includes("Memo"));
				if (rawLog) {
					const rawContent = rawLog.split(/: (.*)/s)[1];

					//attempt decrypt
					if (rawContent) {
						const cleanContent = rawContent.replace(/^"|"$/g, "").trim();
						const data = decryptPayload(cleanContent);
						if (data) {
							console.log("🔓 Decrypted Order:");
							console.table(data);
						} else {
							console.log("⚠️ Could not decrypt (Message might not be for us)");
						}
					}
				}
			}
		}
	},
	"confirmed",
);
