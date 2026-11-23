export const accounts = [
  {
    address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    privateKey:
      "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601",
  },
  {
    address: "ST8K2RZGHWTRF29B7DPZFN0FB65R0DSKHTK5Z4R0",
    privateKey:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  // Its hash starts with the byte 0x01, so c32check encodes it in 39
  // characters, like about 1 in 256 addresses
  {
    address: "STX4E0VZD1M4TKS53P5D8XPTQC6152KTTX9K68C",
    privateKey:
      "c9184ab8c4f87ce2ceed798ef71b6db6c03f1ccd7a898acb7d71bd252ed7ab4601",
  },
] as const;
