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
