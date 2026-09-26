import type { ExactPartial, Prettify, SiwsMessage } from "./types.js";

const siwsDateTimeRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isValidSiwsDateTime(value: string): boolean {
  if (!siwsDateTimeRegex.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function parseSiwsDateTime(value: string): Date {
  // Reject non-RFC-3339 datetime strings before Date coercion
  // (JS Date accepts many non-SIWS forms that would otherwise look "valid").
  if (!isValidSiwsDateTime(value)) return new Date(Number.NaN);
  return new Date(value);
}

/**
 * @description Parses SIP-X formatted message into message fields object.
 *
 * @see https://github.com/stacksgov/sips/pull/70
 *
 * @returns SIP-X fields object
 */
export function parseSiwsMessage(
  message: string,
): Prettify<ExactPartial<SiwsMessage>> {
  const { scheme, statement, ...prefix } = (message.match(prefixRegex)
    ?.groups ?? {}) as {
    address: string;
    domain: string;
    scheme?: string;
    statement?: string;
  };
  const {
    chainId,
    expirationTime,
    issuedAt,
    notBefore,
    requestId,
    resources: resources_,
    ...suffix
  } = (message.match(suffixRegex)?.groups ?? {}) as {
    chainId: string;
    expirationTime?: string;
    issuedAt?: string;
    nonce: string;
    notBefore?: string;
    requestId?: string;
    resources?: string;
    uri: string;
    version: "1";
  };
  const resources = resources_?.split("\n- ").slice(1);
  return {
    ...prefix,
    ...suffix,
    ...(chainId ? { chainId: Number(chainId) } : {}),
    ...(expirationTime
      ? { expirationTime: parseSiwsDateTime(expirationTime) }
      : {}),
    ...(issuedAt ? { issuedAt: parseSiwsDateTime(issuedAt) } : {}),
    ...(notBefore ? { notBefore: parseSiwsDateTime(notBefore) } : {}),
    ...(requestId ? { requestId } : {}),
    ...(resources ? { resources } : {}),
    ...(scheme ? { scheme } : {}),
    ...(statement ? { statement } : {}),
  };
}

// https://regexr.com/80gdj
const prefixRegex =
  /^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+\-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Stacks account:\n)(?<address>S[A-Z0-9]{39,40})\n\n(?:(?<statement>.*)\n\n)?/;

// https://regexr.com/80gf9
const suffixRegex =
  /(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.*))?(?:\nResources:(?<resources>(?:\n- .+)*))?/;
