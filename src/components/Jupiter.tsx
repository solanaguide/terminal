import { JupiterProvider } from '@jup-ag/react-hook';

import { useConnection } from '@solana/wallet-adapter-react';

import React, { useMemo, useState } from 'react';
import { WRAPPED_SOL_MINT } from '../constants';

import Footer from '../components/Footer';
import Header from '../components/Header';
import { AccountsProvider } from '../contexts/accounts';
import { useScreenState } from 'src/contexts/ScreenProvider';
import InitialScreen from './screens/InitialScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import { SwapContextProvider } from 'src/contexts/SwapContext';
import { ROUTE_CACHE_DURATION } from 'src/misc/constants';
import SwappingScreen from './screens/SwappingScreen';
import { useWalletPassThrough } from 'src/contexts/WalletPassthroughProvider';
import { IInit } from 'src/types';


const Content = ({ containerStyles }: { containerStyles: IInit['containerStyles'] }) => {
  const { screen } = useScreenState();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const onClose = () => {
    window.Jupiter.close();
  }

  const zIndex = containerStyles?.zIndex || 50; // Default to 50, tailwind default max is 50.
  return (
    <div>
      <div style={{ zIndex }} className="flex flex-col h-screen max-h-[90vh] md:max-h-[600px] max-w-[448px] overflow-auto text-black relative bg-[#F3F5F6] rounded-lg">
        {/* Header */}
        <Header setIsWalletModalOpen={setIsWalletModalOpen} />

        {screen === 'Initial' ? (
          // TODO: Read from init function
          <InitialScreen mint={WRAPPED_SOL_MINT} isWalletModalOpen={isWalletModalOpen} setIsWalletModalOpen={setIsWalletModalOpen} />
        ) : null}

        {screen === 'Confirmation' ? (<ConfirmationScreen />) : null}
        {screen === 'Swapping' ? (<SwappingScreen />) : null}

        {/* Footer */}
        <div className="mt-auto rounded-b-xl">
          <Footer />
        </div>
      </div>

      <div onClick={onClose} className="absolute w-screen h-screen top-0 left-0" />
    </div>
  )
}

const JupiterApp = ({ containerStyles }: { containerStyles: IInit['containerStyles'] }) => {
  const { wallet } = useWalletPassThrough();
  const { connection } = useConnection();

  const walletPublicKey = useMemo(() => wallet?.adapter.publicKey, [
    wallet?.adapter.publicKey,
  ]);

  return (
    <AccountsProvider>
      <JupiterProvider
        connection={connection}
        cluster={'mainnet-beta'}
        routeCacheDuration={ROUTE_CACHE_DURATION}
        wrapUnwrapSOL={false}
        userPublicKey={walletPublicKey || undefined}
      >
        <SwapContextProvider>
          <Content containerStyles={containerStyles} />
        </SwapContextProvider>
      </JupiterProvider>
    </AccountsProvider>
  );
};

export default JupiterApp;