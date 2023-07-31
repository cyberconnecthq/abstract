import {
  createClient,
  http,
  type Hex,
  type Address,
  type Hash,
  SignMessageReturnType,
} from "viem";
import { mainnet } from "viem/chains";
import {
  type UserOperation,
  type CyberConnectActions,
  type CyberConnectClient,
  type RpcContext,
  type EstimateContractCall,
  type SponsorContractCall,
  type BaseContractCall,
} from "./schema";

const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

function CyberAbstract(
  signMessage: (message: string) => Promise<SignMessageReturnType | undefined>,
  rpcUrl: string,
  options?: { entryPoint: Address }
) {
  const entryPoint = options?.entryPoint || ENTRY_POINT;
  const value = "0";
  const nonce = null;

  const transport = http(rpcUrl);

  const cyberConnectActions = (): CyberConnectActions => ({
    estimateTransaction,
    sponsorUserOperation,
    sendUserOperation,
    getUserOperationByHash,
  });

  const client: CyberConnectClient = createClient({
    chain: mainnet,
    transport,
  }).extend(cyberConnectActions);

  async function estimateTransaction(
    contractCall: BaseContractCall,
    ctx: RpcContext
  ) {
    return await client.request({
      method: "cc_estimateUserOperation",
      params: [
        { ...contractCall, value, nonce, maxFeePerGas: null, ep: entryPoint },
        ctx,
      ],
    });
  }

  async function sponsorUserOperation(
    contractCall: Omit<SponsorContractCall, "ep">,
    ctx: RpcContext
  ) {
    return await client.request({
      method: "cc_sponsorUserOperation",
      params: [{ ...contractCall, ep: entryPoint }, ctx],
    });
  }

  async function sendUserOperation(
    userOperation: UserOperation,
    ctx: RpcContext
  ) {
    return await client.request({
      method: "eth_sendUserOperation",
      params: [userOperation, entryPoint, ctx],
    });
  }

  async function getUserOperationByHash(
    userOperationHash: Hash,
    ctx: RpcContext
  ) {
    return await client.request({
      method: "eth_getUserOperationByHash",
      params: [userOperationHash, { chainId: ctx.chainId }],
    });
  }

  async function sendTransaction(
    contractCall: BaseContractCall,
    ctx: RpcContext
  ) {
    const estimatedGas = await estimateTransaction(contractCall, ctx);

    const sponsorContractCall = {
      ...contractCall,
      value,
      nonce,
      maxFeePerGas: estimatedGas.gasPriceFast,
    };

    const sponsoredUserOperation = await sponsorUserOperation(
      sponsorContractCall,
      ctx
    );

    const signature = await signMessage(
      sponsoredUserOperation.userOperationHash
    );

    if (!signature) {
      return;
    }

    const userOperation = {
      ...sponsoredUserOperation.userOperation,
      signature,
    };

    const userOperationHash = await sendUserOperation(userOperation, ctx);

    const userOperationTransaction = await getUserOperationByHash(
      userOperationHash,
      ctx
    );

    return userOperationTransaction;
  }

  return {
    estimateTransaction,
    sponsorUserOperation,
    sendUserOperation,
    getUserOperationByHash,
    sendTransaction,
  };
}

export default CyberAbstract;
