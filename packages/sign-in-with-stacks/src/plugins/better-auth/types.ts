export interface WalletAddress {
  id: string;
  userId: string;
  address: string;
  chainId: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface SIWSVerifyMessageArgs {
  message: string;
  signature: string;
  address: string;
  chainId: number;
}

export interface ResolveProfileArgs {
  walletAddress: string;
}

export interface ResolveProfileResult {
  name: string;
  avatar: string;
}
