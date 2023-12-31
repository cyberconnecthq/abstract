import { z } from "zod";
import {
  type Hex,
  type Hash,
  type Address,
  type Client,
  type Chain,
  type HttpTransport,
  type Account,
} from "viem";

const { object, string, number, bigint } = z;

const hexString = z.custom<Hex>((val) => {
  return /^0x.*$/.test(val as string);
});

const hashString = z.custom<Hex>((val) => {
  return /^0x.*$/.test(val as string);
});

const UserOperationSchema = object({
  sender: hexString,
  nonce: number(),
  initCode: hexString,
  callData: hexString,
  callGasLimit: bigint(),
  verificationGasLimit: bigint(),
  preVerificationGas: bigint(),
  maxFeePerGas: bigint(),
  maxPriorityFeePerGas: bigint(),
  paymasterAndData: hexString,
  signature: hashString,
}).required();

const RpcContextSchema = object({
  chainId: number(),
  owner: hashString,
});

const UnsignedUserOperationSchema = UserOperationSchema.omit({
  signature: true,
});

const EstimatedUserOperationSchema = object({
  chainId: number(),
  totalGasLimit: bigint(),
  totalGasFee: bigint(),
  credits: number(),
  fast: object({
    maxFeePerGas: bigint(),
    maxPriorityFeePerGas: bigint(),
  }),
  medium: object({
    maxFeePerGas: bigint(),
    maxPriorityFeePerGas: bigint(),
  }),
  slow: object({
    maxFeePerGas: bigint(),
    maxPriorityFeePerGas: bigint(),
  }),
});

export type EstimateUserOperationReturn = z.infer<
  typeof EstimatedUserOperationSchema
>;

export type SponsorUserOperationReturn = {
  userOperation: UnsignedUserOperation;
  userOperationHash: Hash;
};

export type SendUserOperationReturn = Hash;

export type UnsignedUserOperation = z.infer<typeof UnsignedUserOperationSchema>;
export type UserOperation = z.infer<typeof UserOperationSchema>;
export type RpcContext = z.infer<typeof RpcContextSchema>;

export type UserOperationTransaction = {
  transactionHash: Hash;
  blockNumber: number;
  blockHash: Hash;
  entryPoint: Address;
  userOperation: UserOperation;
};

export interface BaseContractCall {
  sender: Address;
  to: Address;
  callData: Hex;
  value?: string;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
}

export interface EstimateContractCall extends BaseContractCall {
  value: string;
  nonce: number | null;
  ep: Address;
  maxFeePerGas: null;
}

export interface SponsorContractCall extends BaseContractCall {
  value: string;
  nonce: number | null;
  ep: Address;
  maxFeePerGas: bigint;
}

export type CyberConnectRpcSchema = [
  {
    Method: "cc_estimateUserOperation";
    Parameters: [EstimateContractCall, RpcContext];
    ReturnType: EstimateUserOperationReturn;
  },
  {
    Method: "cc_sponsorUserOperation";
    parameters: [SponsorContractCall, RpcContext];
    ReturnType: SponsorUserOperationReturn;
  },
  {
    Method: "eth_sendUserOperation";
    parameters: [UserOperation, Address, RpcContext];
    ReturnType: SendUserOperationReturn;
  },
  {
    Method: "eth_getUserOperationByHash";
    Parameters: [Hash, Omit<RpcContext, "owner">];
    ReturnType: UserOperationTransaction;
  }
];

export type CyberConnectClient = Client<
  HttpTransport,
  Chain,
  Account | undefined,
  CyberConnectRpcSchema,
  CyberConnectActions
>;

export type CyberConnectActions = {
  estimateTransaction: (
    contractCall: Omit<EstimateContractCall, "ep">,
    ctx: RpcContext
  ) => Promise<EstimateUserOperationReturn>;

  sponsorUserOperation: (
    contractCall: Omit<SponsorContractCall, "ep">,
    ctx: RpcContext
  ) => Promise<SponsorUserOperationReturn>;

  sendUserOperation: (
    userOperation: UserOperation,
    ctx: RpcContext
  ) => Promise<SendUserOperationReturn>;

  getUserOperationByHash: (
    userOperationHash: Hash,
    ctx: RpcContext
  ) => Promise<UserOperationTransaction>;
};

export { UserOperationSchema, UnsignedUserOperationSchema };
