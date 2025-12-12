export interface WalletAddress {
  id: string;
  userId: string;
  address: string;
  chainId: number;
  isPrimary: boolean;
  createdAt: Date;
}
