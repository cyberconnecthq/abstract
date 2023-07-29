import {
  createClient,
  http,
  type Hex,
  type Address,
  type Hash,
  SignMessageReturnType,
} from "viem";
import { mainnet, type Chain } from "viem/chains";
import {
  type UserOperation,
  type CyberConnectActions,
  type CyberConnectClient,
} from "./schema";

function CyberAbstract(
  signMessage: (message: string) => Promise<SignMessageReturnType>,
  rpcUrl?: string
) {
  const transport = http(rpcUrl);
  const cyberConnectActions = (): CyberConnectActions => ({
    estimateUserOperation,
    getUnsignedUserOperation,
    sendUserOperation,
    getUserOperationByHash,
  });

  const client: CyberConnectClient = createClient({
    chain: mainnet,
    transport,
  }).extend(cyberConnectActions);

  async function estimateUserOperation(chainId: Chain["id"], callData: Hex) {
    return await client.request({
      method: "cc_estimateUserOperation",
      params: [chainId, callData],
    });
  }

  async function getUnsignedUserOperation(
    chainId: Chain["id"],
    callData: Hex,
    gasPrice: number,
    sender: Address,
    to: Address
  ) {
    return await client.request({
      method: "cc_sponsorUserOperation",
      params: [chainId, callData, gasPrice, sender, to],
    });
  }

  async function getUnsignedUserOperationHash(
    chainId: Chain["id"],
    callData: Hex,
    gasPrice: number,
    sender: Address,
    to: Address
  ) {
    const response = await getUnsignedUserOperation(
      chainId,
      callData,
      gasPrice,
      sender,
      to
    );

    return response.hash;
  }

  async function sendUserOperation(
    chainId: Chain["id"],
    userOperation: UserOperation,
    sender: Address
  ): Promise<Hash> {
    return await client.request({
      method: "eth_sendUserOperation",
      params: [chainId, userOperation, sender],
    });
  }

  async function getUserOperationByHash(hash: Hash): Promise<UserOperation> {
    return await client.request({
      method: "eth_getUserOperationByHash",
      params: [hash],
    });
  }

  async function sendTransaction(
    chainId: Chain["id"],
    callData: Hex,
    sender: Address,
    to: Address
  ) {
    const estimatedGas = await estimateUserOperation(chainId, callData);

    console.log("---------- Send Transaction: estimatedGas----------");
    console.log(estimatedGas);

    const res = await getUnsignedUserOperation(
      chainId,
      callData,
      estimatedGas,
      sender,
      to
    );

    console.log(
      "---------- Send Transaction: getUnsignedUserOperation----------"
    );
    console.log(res);

    const signature = await signMessage(res.hash);
    console.log("---------- Send Transaction: signature ----------");
    console.log(signature);

    const userOperation = { ...res.userOperation, signature };

    const userOperationHash = await sendUserOperation(
      chainId,
      userOperation,
      sender
    );

    console.log("---------- Send Transaction: userOperationHash ----------");
    console.log(userOperationHash);

    const userOperationResult = await getUserOperationByHash(userOperationHash);

    console.log("---------- Send Transaction: Success ----------");
    console.log("userOperationResult: ", userOperationResult);

    return userOperationResult;
  }

  return {
    estimateUserOperation,
    getUnsignedUserOperation,
    getUnsignedUserOperationHash,
    sendUserOperation,
    getUserOperationByHash,
    sendTransaction,
  };
}

export default CyberAbstract;
