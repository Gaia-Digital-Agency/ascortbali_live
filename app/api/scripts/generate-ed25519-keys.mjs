import { generateKeyPairSync } from "crypto";
import fs from "fs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

fs.writeFileSync("ed25519-private.pem", privateKey);
fs.writeFileSync("ed25519-public.pem", publicKey);
console.log("Wrote ed25519-private.pem and ed25519-public.pem in current directory.");
