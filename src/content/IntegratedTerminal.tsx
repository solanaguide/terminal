import React, { useEffect, useState } from 'react'
import {Connection, PublicKey} from "@solana/web3.js";
import {getPlatformFeeAccounts} from "@jup-ag/core";
const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/ZT3c4pYf1inIrB0GVDNR7nx4LwyED5Ci', 'confirmed');

const feeAccounts = await getPlatformFeeAccounts(
    connection,
    new PublicKey('BUX7s2ef2htTGb2KKoPHWkmzxPj4nTWMWRgs5CSbQxf9') // The platform fee account owner
);

const IntegratedTerminal = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;
    if (!isLoaded) {
      intervalId = setInterval(() => {
        setIsLoaded(Boolean(window.Jupiter))
      }, 500)

// Jupiter Core provides a helper function that returns all your feeAccounts
      const platformFeeAndAccounts = {
        feeBps: 50,
        feeAccounts: feeAccounts // map of mint to token account pubkey
      }
      console.log('using fees', platformFeeAndAccounts)

      window.Jupiter.init({
        mode: 'default',
        displayMode: 'integrated',
        integratedTargetId: 'integrated-terminal',
        endpoint: "https://solana-mainnet.g.alchemy.com/v2/ZT3c4pYf1inIrB0GVDNR7nx4LwyED5Ci",
        platformFeeAndAccounts: platformFeeAndAccounts,
      });
    }

    if (intervalId) {
      return () => clearInterval(intervalId);
    }
  }, [])

  return (
    <div className='min-h-[600px] h-[600px] w-full bg-[#282830] rounded-2xl text-white flex flex-col items-center p-2 lg:p-4 mb-4 overflow-hidden'>
      <div className='flex flex-col lg:flex-row h-full w-full overflow-auto'>
        <div className='w-full h-full rounded-xl overflow-hidden flex justify-center'>
          {/* Loading state */}
          {!isLoaded ? (
            <div className='h-full w-full animate-pulse bg-white/10 mt-4 lg:mt-0 lg:ml-4 flex items-center justify-center rounded-xl'>
              <p className=''>Loading...</p>
            </div>
          ) : null}

          <div id="integrated-terminal" className={`flex h-full w-full max-w-[384px] overflow-auto justify-center ${!isLoaded ? 'hidden' : ''}`} />
        </div>
      </div>
    </div>
  )
}

export default IntegratedTerminal