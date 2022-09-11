/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {transact} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import React, {useCallback, useEffect, useState} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import {Colors, Header} from 'react-native/Libraries/NewAppScreen';
import {Camera, CameraType} from 'react-native-camera-kit';
import {toByteArray} from 'react-native-quick-base64';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  // Store details about the currently connected wallet.
  const [currentAccount, setCurrentAccount] = useState<{
    authToken: string;
    pubkey: PublicKey;
  } | null>(null);
  const [currentAccountBalance, setCurrentAccountBalance] = useState(0);
  async function refreshBalance(accountPubkey: PublicKey) {
    const connection = new Connection(clusterApiUrl('testnet'));
    setCurrentAccountBalance(
      await connection.getBalance(accountPubkey, 'processed'),
    );
  }

  // When the application boots up, check to see if we have a prior authorization.
  useEffect(() => {
    (async () => {
      const [cachedAuthToken, cachedBase64Address] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('base64Address'),
      ]);
      if (cachedBase64Address && cachedAuthToken) {
        const pubkeyAsByteArray = toByteArray(cachedBase64Address);
        const cachedCurrentAccount = {
          authToken: cachedAuthToken,
          pubkey: new PublicKey(pubkeyAsByteArray),
        };
        setCurrentAccount(cachedCurrentAccount);
        refreshBalance(cachedCurrentAccount.pubkey);
      }
    })();
  }, []);

  // Pressing the connect button should authorize this app with the wallet,
  // cache the resulting auth token, and fetch the wallet's balance.
  const handleConnectPress = useCallback(() => {
    transact(async wallet => {
      const {accounts, auth_token} = await wallet.authorize({
        cluster: 'testnet',
        identity: {
          name: 'My amazing app',
        },
      });
      const firstAccount = accounts[0];
      AsyncStorage.setItem('authToken', auth_token);
      AsyncStorage.setItem('base64Address', firstAccount.address);
      const pubkeyAsByteArray = toByteArray(firstAccount.address);
      const nextCurrentAccount = {
        authToken: auth_token,
        pubkey: new PublicKey(pubkeyAsByteArray),
      };
      setCurrentAccount(nextCurrentAccount);
      refreshBalance(nextCurrentAccount.pubkey);
    });
  }, []);

  // Store the destination address for the transfer, and the transfer amount.
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Create a flag that determines whether to show the QR code scanner.
  const [showScanner, setShowScanner] = useState(false);

  // Pressing the send button computes the number of lamports to send,
  // creates the transaction and the transfer instruction, asks the
  // wallet to sign and send the transaction, and updates the sender's balance.
  const handleSendPress = useCallback(() => {
    const lamports = Math.floor(parseFloat(transferAmount) * 10 ** 9);
    transact(async wallet => {
      if (currentAccount == null) {
        throw new Error("Can't send without a current account");
      }
      try {
        await wallet.reauthorize({
          auth_token: currentAccount.authToken,
        });
      } catch (e: any) {
        console.error(e.message);
        setCurrentAccount(null);
      }
      const connection = new Connection(clusterApiUrl('testnet'));
      const latestBlockhash = await connection.getLatestBlockhash('processed');
      const sendTokensTransaction = new Transaction({
        feePayer: currentAccount.pubkey,
        ...latestBlockhash,
      });
      sendTokensTransaction.add(
        SystemProgram.transfer({
          fromPubkey: currentAccount.pubkey,
          toPubkey: new PublicKey(recipientAddress),
          lamports,
        }),
      );
      setRecipientAddress('');
      setTransferAmount('');
      const [signature] = await wallet.signAndSendTransactions({
        transactions: [sendTokensTransaction],
      });
      await connection.confirmTransaction(signature, 'processed');
      console.log(
        `https://explorer.solana.com/tx/${signature}?cluster=testnet`,
      );
      refreshBalance(currentAccount.pubkey);
    });
  }, [currentAccount, recipientAddress, transferAmount]);

  // Pressing the airdrop button requests an airdrop for the currently
  // authorized wallet, then updates the balance.
  const handleAirdropPress = useCallback(async () => {
    const connection = new Connection(clusterApiUrl('testnet'));
    await connection.confirmTransaction(
      await connection.requestAirdrop(currentAccount!.pubkey, 1 * 10 ** 9),
      'processed',
    );
    refreshBalance(currentAccount!.pubkey);
  }, [currentAccount]);

  // Pressing disconnect deauthorizes this app with the wallet, and clears
  // all cached account information.
  const handleDisconnectPress = useCallback(() => {
    transact(async wallet => {
      if (currentAccount == null) {
        throw new Error('There is no current account to deauthorize');
      }
      await wallet.deauthorize({auth_token: currentAccount.authToken});
      AsyncStorage.clear();
      setCurrentAccount(null);
      setCurrentAccountBalance(0);
    });
  }, [currentAccount]);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      {showScanner ? (
        <View style={styles.cameraContainer}>
          <Camera
            cameraType={CameraType.Back}
            scanBarcode
            onReadCode={(event: any) => {
              setRecipientAddress(event.nativeEvent.codeStringValue);
              setShowScanner(false);
            }}
            style={styles.camera}
          />
          <Button
            title="Cancel"
            onPress={() => {
              setShowScanner(false);
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={backgroundStyle}>
          <Header />
          <View
            style={{
              backgroundColor: isDarkMode ? Colors.black : Colors.white,
              ...styles.mainContainer,
            }}>
            {currentAccount ? (
              <>
                <Text style={styles.header}>
                  My wallet ({currentAccount.pubkey.toBase58().slice(0, 6)}
                  &hellip;)
                </Text>
                <Text style={styles.balance}>
                  Current balance: {currentAccountBalance / 10 ** 9} SOL
                </Text>
                <Button title="Airdrop SOL" onPress={handleAirdropPress} />
                <Button
                  color="darkred"
                  title="Disconnect"
                  onPress={handleDisconnectPress}
                />
                <Text style={styles.header}>Recipient wallet address</Text>
                <TextInput
                  style={styles.input}
                  value={recipientAddress}
                  onChangeText={newText => {
                    setRecipientAddress(newText);
                  }}
                  keyboardType="visible-password"
                />
                <Button
                  title="Scan QR Code"
                  onPress={() => {
                    setShowScanner(true);
                  }}
                />
                <Text style={styles.header}>Amount to transfer (SOL)</Text>
                <TextInput
                  style={styles.input}
                  onChangeText={newText => {
                    setTransferAmount(newText);
                  }}
                  value={transferAmount}
                  keyboardType="numeric"
                />
                <Button title="Send" onPress={handleSendPress} />
              </>
            ) : (
              <>
                <Button title="Connect" onPress={handleConnectPress} />
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  balance: {
    marginBottom: 12,
  },
  camera: {
    flexGrow: 1,
  },
  cameraContainer: {
    height: '100%',
  },
  header: {
    marginVertical: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    padding: 10,
    borderWidth: 1,
    backgroundColor: 'white',
    color: 'black',
  },
  mainContainer: {
    padding: 16,
  },
});

export default App;
