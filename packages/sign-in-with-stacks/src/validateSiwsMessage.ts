import type { ExactPartial, SiwsMessage } from "./types.js";
import { isAddress, isAddressEqual } from "./utils.js";

export type ValidateSiwsMessageParameters = {
  /**
   * Stacks address to check against.
   */
  address?: string | undefined;
  /**
   * [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) authority to check against.
   */
  domain?: string | undefined;
  /**
   * SIP-X message fields.
   */
  message: ExactPartial<SiwsMessage>;
  /**
   * Random string to check against.
   */
  nonce?: string | undefined;
  /**
   * [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986#section-3.1) URI scheme to check against.
   */
  scheme?: string | undefined;
  /**
   * Current time to check optional `expirationTime` and `notBefore` fields.
   *
   * @default new Date()
   */
  time?: Date | undefined;
};

export type ValidateSiwsMessageReturnType = boolean;

/**
 * @description Validates SIP-X message.
 *
 * @see https://github.com/stacksgov/sips/pull/70
 */
export function validateSiwsMessage(
  parameters: ValidateSiwsMessageParameters,
): ValidateSiwsMessageReturnType {
  const {
    address,
    domain,
    message,
    nonce,
    scheme,
    time = new Date(),
  } = parameters;

  if (domain && message.domain !== domain) return false;
  if (nonce && message.nonce !== nonce) return false;
  if (scheme && message.scheme !== scheme) return false;

  // Invalid `time` makes both lifetime comparisons false in JS; reject first.
  if (Number.isNaN(time.getTime())) return false;

  // Invalid Date (e.g. non-RFC-3339 SIWS timestamp coerced at parse) is truthy;
  // comparisons against it are always false and would otherwise skip the checks.
  if (message.expirationTime) {
    if (Number.isNaN(message.expirationTime.getTime())) return false;
    if (time >= message.expirationTime) return false;
  }
  if (message.notBefore) {
    if (Number.isNaN(message.notBefore.getTime())) return false;
    if (time < message.notBefore) return false;
  }

  try {
    if (!message.address) return false;
    if (!isAddress(message.address)) return false;
    if (address && !isAddressEqual(message.address, address)) return false;
  } catch {
    return false;
  }

  return true;
}
