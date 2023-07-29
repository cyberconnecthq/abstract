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

const { object, string, number } = z;

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
  callGasLimit: number(),
  verificationGasLimit: number(),
  preVerificationGas: number(),
  maxFeePerGas: number(),
  maxPriorityFeePerGas: number(),
  paymasterAndData: hexString,
  signature: hashString,
}).required();

const UnsignedUserOperationSchema = UserOperationSchema.omit({
  signature: true,
});

export type UnsignedUserOperation = z.infer<typeof UnsignedUserOperationSchema>;
export type UserOperation = z.infer<typeof UserOperationSchema>;

export type CyberConnectRpcSchema = [
  {
    Method: "cc_estimateUserOperation";
    Parameters: [number, Hex];
    ReturnType: number;
  },
  {
    Method: "cc_sponsorUserOperation";
    parameters: [number, Hex, number, Address, Address];
    ReturnType: { userOperation: UnsignedUserOperation; hash: Hash };
  },
  {
    Method: "eth_sendUserOperation";
    parameters: [number, UserOperation, Address, Address];
    ReturnType: Hash;
  },
  {
    Method: "eth_getUserOperationByHash";
    Parameters: [Hash];
    ReturnType: UserOperation;
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
  estimateUserOperation: (
    chainId: Chain["id"],
    callData: Hex
  ) => Promise<number>;

  getUnsignedUserOperation: (
    chainId: Chain["id"],
    callData: Hex,
    gasPrice: number,
    sender: Address,
    to: Address
  ) => Promise<{
    userOperation: UnsignedUserOperation;
    hash: Hash;
  }>;

  sendUserOperation: (
    chainId: Chain["id"],
    userOperation: UserOperation,
    sender: Address
  ) => Promise<Hash>;

  getUserOperationByHash: (hash: Hash) => Promise<UserOperation>;
};

export { UserOperationSchema, UnsignedUserOperationSchema };
