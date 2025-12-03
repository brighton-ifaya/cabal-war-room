import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

const keyPair = nacl.box.keyPair();

const publicKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);
const secretKeyBase64 = naclUtil.encodeBase64(keyPair.secretKey);

console.log("==========================================");
console.log("⚔️  CABAL GAME MASTER KEYS GENERATED  ⚔️");
console.log("==========================================\n");

console.log("PUBLIC KEY (Copy this to your Frontend later):");
console.log(publicKeyBase64);
console.log("\n------------------------------------------\n");

console.log("SECRET KEY (Copy this to .env.local NOW):");
console.log(secretKeyBase64);

console.log("\n==========================================");
