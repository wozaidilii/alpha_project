import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_HASH_SCHEME = "scrypt";
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return `${PASSWORD_HASH_SCHEME}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string | null,
) {
  if (!storedHash) return false;

  const [scheme, salt, expectedHex] = storedHash.split(":");
  if (
    scheme !== PASSWORD_HASH_SCHEME ||
    !salt ||
    !expectedHex ||
    !/^[0-9a-f]+$/i.test(expectedHex)
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
