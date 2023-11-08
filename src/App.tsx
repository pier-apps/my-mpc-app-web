import { KeyShare, SessionKind, PierMpcVaultSdk } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { useEffect, useState } from "react";

import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { ethers } from "ethers";

import {
  PierMpcBitcoinWallet,
  PierMpcBitcoinWalletNetwork,
} from "@pier-wallet/mpc-lib/bitcoin";

// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://ethereum-sepolia.publicnode.com",
);

const pierMpc = new PierMpcVaultSdk(createPierMpcSdkWasm());
export default function Mpc() {
  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateKeyShare = async () => {
    setIsLoading(true);
    try {
      console.log("generating local key share...");
      const localKeyShare = await pierMpc.generateKeyShare();

      console.log("local key share generated.", localKeyShare.publicKey);
      setKeyShare(localKeyShare);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null,
  );
  useEffect(() => {
    if (!keyShare) return;
    (async () => {
      const signConnection = await pierMpc.establishConnection(
        SessionKind.SIGN,
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpc,
        ethereumProvider,
      );
      setEthWallet(ethWallet);
    })();
  }, [keyShare]);

  const sendEthereumTransaction = async () => {
    if (!ethWallet) return;

    setIsLoading(true);
    try {
      // send 1/10 of the balance to a zero address
      const receiver = ethers.constants.AddressZero;
      const balance = await ethWallet.getBalance();
      const amountToSend = balance.div(10);

      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await ethWallet.sendTransaction({
        to: receiver,
        value: amountToSend,
      });
      console.log("tx", tx.hash);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [btcWallet, setBtcWallet] = useState<PierMpcBitcoinWallet | null>(null);
  useEffect(() => {
    if (!keyShare) return;
    (async () => {
      const signConnection = await pierMpc.establishConnection(
        SessionKind.SIGN,
      );
      const btcWallet = new PierMpcBitcoinWallet(
        keyShare,
        PierMpcBitcoinWalletNetwork.Testnet,
        signConnection,
        pierMpc,
      );
      setBtcWallet(btcWallet);
    })();
  }, [keyShare]);
  const sendBitcoinTransaction = async () => {
    if (!btcWallet) return;

    setIsLoading(true);
    try {
      const receiver = "tb1qw2c3lxufxqe2x9s4rdzh65tpf4d7fssjgh8nv6"; // testnet faucet
      const amountToSend = 800n; // 0.00000800 BTC = 800 satoshi
      const feePerByte = 1n; // use a fee provider to get a more accurate fee estimate - otherwise check minimum fee manually

      // create a transaction request
      const txRequest = await btcWallet.populateTransaction({
        to: receiver,
        value: amountToSend,
        feePerByte,
      });

      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await btcWallet.sendTransaction(txRequest);
      console.log("tx", tx.hash);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true);
          try {
            await pierMpc.auth.signInWithPassword({
              email: "mpc-lib-test@example.com",
              password: "123456",
            });
          } finally {
            setIsLoading(false);
          }

          console.log("signed in as test user");
        }}
      >
        Sign in as Test User
      </button>
      <button onClick={generateKeyShare} disabled={isLoading}>
        Generate Key Share
      </button>
      <button onClick={sendEthereumTransaction} disabled={isLoading}>
        Send Ethereum
      </button>
      <button onClick={sendBitcoinTransaction} disabled={isLoading}>
        Send Bitcoin
      </button>
      <div>PublicKey: {keyShare?.publicKey.join(",")}</div>
      <div>ETH Address: {ethWallet?.address}</div>
      <div>BTC Address: {btcWallet?.address}</div>
    </div>
  );
}
