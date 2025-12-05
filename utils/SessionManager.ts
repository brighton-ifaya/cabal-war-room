import { PublicKey, Keypair, Transaction, Connection, sendAndConfirmRawTransaction } from "@solana/web3.js";
import * as naclUtil from "tweetnacl-util";
import * as nacl from "tweetnacl";

const SESSION_STORAGE_KEY = 'cabal_session_key';
const SESSION_SIGNATURE_KEY = 'cabal_session_sig';
const SESSION_EXPIRY_KEY = 'cabal_session_expiry';

export class SessionManager {
    //check session validity
    static getSession() {
        if (typeof window === 'undefined') return null;

        const secretKeyStr = localStorage.getItem(SESSION_STORAGE_KEY);
        const signature = localStorage.getItem(SESSION_SIGNATURE_KEY);
        const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);

        if (!secretKeyStr || !signature || !expiry) return null;

        if (Date.now() > parseInt(expiry)) {
            this.clearSession();
            return null;
        }

        const secretKey = naclUtil.decodeBase64(secretKeyStr);
        const keypair = Keypair.fromSecretKey(secretKey);

        return { keypair, signature, expiry };
    }

    static async createSession(signMessageFN: (msg: Uint8Array) => Promise<Uint8Array>) {
        const sessionKeypair = Keypair.generate();
        const expiry = Date.now() + 3600 * 1000; //1hr
        const message = `Authorize Cabal Session:\nKey: ${sessionKeypair.publicKey.toBase58()}\nExpiry: ${expiry}`;
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = await signMessageFN(messageBytes);
        const signatureBase64 = naclUtil.encodeBase64(signatureBytes);

        localStorage.setItem(SESSION_STORAGE_KEY, naclUtil.encodeBase64(sessionKeypair.secretKey));
        localStorage.setItem(SESSION_SIGNATURE_KEY, signatureBase64);
        localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());

        return sessionKeypair;
    }

    static async sendSessionTransaction(
        connection: Connection,
        transaction: Transaction
    ): Promise<string> { // Returns transaction signature
        const session = this.getSession();
        if (!session) {
            throw new Error("No active session! Please login first.");
        }

        transaction.feePayer = session.keypair.publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        transaction.sign(session.keypair);

        const txId = await connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: false } //skipPreflight: true makes it faster but risks failing silently
        );

        return txId;
    }
    static clearSession() {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(SESSION_SIGNATURE_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
    }
}