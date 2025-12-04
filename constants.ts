import * as naclUtil from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';

const GAME_MASTER_PUBLIC_KEY_BASE64 = "";
export const GAME_MASTER_PUBLIC_KEY = naclUtil.decodeBase64(GAME_MASTER_PUBLIC_KEY_BASE64);
export const GAME_MASTER_ADDRESS = new PublicKey(GAME_MASTER_PUBLIC_KEY);