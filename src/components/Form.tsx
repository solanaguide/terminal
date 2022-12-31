import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';


import { useAccounts } from '../contexts/accounts';

import { MINIMUM_SOL_BALANCE } from '../misc/constants';

import CoinBalance from './Coinbalance';
import FormError from './FormError';
import JupButton from './JupButton';

import TokenIcon from './TokenIcon';

import { WRAPPED_SOL_MINT } from '../constants';
import { useSwapContext } from 'src/contexts/SwapContext';
import useTimeDiff from './useTimeDiff/useTimeDiff';
import { useWalletPassThrough } from 'src/contexts/WalletPassthroughProvider';
import WalletIcon from 'src/icons/WalletIcon';
import ChevronDownIcon from 'src/icons/ChevronDownIcon';
import PriceInfo from './PriceInfo/index';
import { RoutesSVG } from 'src/icons/RoutesSVG';
import SexyChameleonText from './SexyChameleonText/SexyChameleonText';
import SwitchPairButton from './SwitchPairButton';

const Form: React.FC<{
  onSubmit: () => void;
  isDisabled: boolean;
  setSelectPairSelector: React.Dispatch<React.SetStateAction<"fromMint" | "toMint" | null>>;
  setIsWalletModalOpen(toggle: boolean): void
  setShowRouteSelector(toggle: boolean): void
}> = ({
  onSubmit,
  isDisabled,
  setSelectPairSelector,
  setIsWalletModalOpen,
  setShowRouteSelector,
}) => {
    const { connect, wallet } = useWalletPassThrough();
    const { accounts } = useAccounts();
    const {
      form,
      setForm,
      priority,
      setPriority,
      computeEstimate,
      errors,
      fromTokenInfo,
      toTokenInfo,
      selectedSwapRoute,
      setSelectedSwapRoute,
      mode,
      jupiter: {
        routes,
        loading,
        refresh,
      }
    } = useSwapContext();
    const [hasExpired, timeDiff] = useTimeDiff();

    useEffect(() => {
      if (hasExpired) {
        refresh();
      }
    }, [hasExpired])


    const onConnectWallet = () => {
      if (wallet) connect();
      else {
        setIsWalletModalOpen(true);
      }
    };

    const walletPublicKey = useMemo(() => wallet?.adapter.publicKey?.toString(), [
      wallet?.adapter.publicKey,
    ]);

    const onChangeFromValue = (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const isInvalid = Number.isNaN(Number(e.target.value));
      if (isInvalid) return;

      setForm((form) => ({ ...form, fromValue: e.target.value }));
    };

    const balance = useMemo(() => {
      return fromTokenInfo ? accounts[fromTokenInfo.address]?.balance || 0 : 0;
    }, [accounts, fromTokenInfo]);

    const onClickMax = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();

        if (!balance) return;

        if (fromTokenInfo?.address === WRAPPED_SOL_MINT.toBase58()) {
          setForm((prev) => ({
            ...prev,
            fromValue: String(
              balance > MINIMUM_SOL_BALANCE ? (balance - MINIMUM_SOL_BALANCE).toFixed(6) : 0,
            ),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            fromValue: String(balance),
          }));
        }
      },
      [balance, fromTokenInfo],
    );

    const onClickSwitchPair = () => {
      if (mode === 'default') {
        setForm((prev) => ({
          ...prev,
          fromValue: '',
          toValue: '',
          fromMint: prev.toMint,
          toMint: prev.fromMint,
        }));
      }
    }

    const marketRoutes = selectedSwapRoute ? selectedSwapRoute.marketInfos.map(({ label }) => label).join(', ') : '';
    var priorityStep = 0

    const onChangePriority = (e: ChangeEvent<HTMLInputElement>) => {
        // let steps = [1, 5000, 25000, 50000, 250000, 500000, 2500000, 5_000_000, 25_000_000, 100_000_000, 500_000_000 ]
        // let index = Number(e.target.value)
        // priorityStep = index
        let p =Number(e.target.value)
        setPriority(p)
        // update fee on selectedRouteInfo
        let newSelectedRouteInfo = selectedSwapRoute
        newSelectedRouteInfo.fees.signatureFee = ((computeEstimate || 1400000) * 0.000001 * priority) + 5000,
        setSelectedSwapRoute(newSelectedRouteInfo)
    }

    return (
      <div className="h-full flex flex-col items-center justify-center pb-4">
        <div className="w-full mt-2 rounded-xl flex flex-col px-2">
          <div className="flex-col">
            <div className="border-b border-transparent bg-[#212128] rounded-xl">
              <div className="px-x border-transparent rounded-xl">
                <div>
                  <div className="py-5 px-4 flex flex-col dark:text-white">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        className="py-2 px-3 rounded-2xl flex items-center bg-[#36373E] hover:bg-white/20 text-white"
                        onClick={() => setSelectPairSelector('fromMint')}
                      >
                        <div className='h-5 w-5'>
                          <TokenIcon tokenInfo={fromTokenInfo} width={20} height={20} />
                        </div>
                        <div className="ml-4 mr-2 font-semibold" translate="no">
                          {fromTokenInfo?.symbol}
                        </div>

                        <span className='text-white/25 fill-current'>
                          <ChevronDownIcon />
                        </span>
                      </button>

                      <div className="text-right">
                        <input
                          placeholder="0.00"
                          className="h-full w-full bg-transparent disabled:opacity-100 disabled:text-black text-white text-right font-semibold dark:placeholder:text-white/25 text-2xl !outline-none"
                          value={form.fromValue}
                          onChange={(e) => onChangeFromValue(e)}
                        />
                      </div>
                    </div>

                    {fromTokenInfo?.address ? (
                      <div
                        className="flex mt-3 cursor-pointer space-x-1 text-xs items-center text-white/30 fill-current"
                        onClick={onClickMax}
                      >
                        <WalletIcon width={10} height={10} />
                        <CoinBalance mintAddress={fromTokenInfo.address} />
                        <span>{fromTokenInfo.symbol}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className='my-2'>
              {mode === 'default' ? (
                <SwitchPairButton onClick={onClickSwitchPair} />
              ) : null}
            </div>

            <div className="border-b border-transparent bg-[#212128] rounded-xl">
              <div className="px-x border-transparent rounded-xl">
                <div>
                  <div className="py-5 px-4 flex flex-col dark:text-white">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        className="py-2 px-3 rounded-2xl flex items-center bg-[#36373E] hover:bg-white/20 disabled:hover:bg-[#36373E] text-white"
                        disabled={mode === 'outputOnly'}
                        onClick={mode === 'default' ? () => setSelectPairSelector('toMint') : () => { }}
                      >
                        <div className='h-5 w-5'>
                          <TokenIcon tokenInfo={toTokenInfo} width={20} height={20} />
                        </div>
                        <div className="ml-4 mr-2 font-semibold" translate="no">
                          {toTokenInfo?.symbol}
                        </div>

                        {mode === 'default' ? (
                          <span className='text-white/25 fill-current'>
                            <ChevronDownIcon />
                          </span>
                        ) : null}
                      </button>

                      <div className="text-right">
                        <input
                          className="h-full w-full bg-transparent text-white text-right font-semibold dark:placeholder:text-white/25 text-lg"
                          value={form.toValue}
                          disabled
                        />
                      </div>
                    </div>

                    {toTokenInfo?.address ? (
                      <div
                        className="flex mt-3 space-x-1 text-xs items-center text-white/30 fill-current"
                      >
                        <WalletIcon width={10} height={10} />
                        <CoinBalance mintAddress={toTokenInfo.address} />
                        <span>{toTokenInfo.symbol}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {routes
              ? (
                <div className='flex items-center mt-2 text-xs space-x-1'>
                  <div className='bg-black/20 rounded-xl px-2 py-1 cursor-pointer text-white/50 flex items-center space-x-1' onClick={() => setShowRouteSelector(true)}>
                    <span>{routes?.length}</span>
                    <RoutesSVG width={7} height={9} />
                  </div>
                  <span className='text-white/30'>using</span>
                  <span className='text-white/50'>{marketRoutes}</span>
                </div>
              ) : null}

              <div className='flex items-center mt-2 text-xs space-x-1'>
                <div className='bg-black/20 rounded-xl px-2 py-1 cursor-pointer text-white/50 flex items-center space-x-1 w-full' >
                    <span>Priority:</span>
                    <input type="range" value={priority} min={0} max={1_000_000} step={5_000} onInput={onChangePriority} className='w-full mx-2' />
                    <p>
                        <span>Estimated Fee: { (( ((computeEstimate || 1400000) * 0.000001 * priority) +5000) / 1e9 ).toFixed(9)}</span>
                    </p>
                </div>
              </div>
          </div>
        </div>

        {walletPublicKey ? <FormError errors={errors} /> : null}

        <div className='w-full px-2'>
          {!walletPublicKey ? (
            <JupButton
              size="lg"
              className="w-full mt-4"
              type="button"
              onClick={onConnectWallet}
            >
              Connect Wallet
            </JupButton>
          ) : (
            <JupButton
              size="lg"
              className="w-full mt-4 disabled:opacity-50"
              type="button"
              onClick={onSubmit}
              disabled={isDisabled || loading}
            >
              {loading ? <span className='text-sm'>Loading...</span> : <SexyChameleonText>Swap</SexyChameleonText>}
            </JupButton>
          )}

          {routes && selectedSwapRoute && fromTokenInfo && toTokenInfo ? (
            <PriceInfo
              routes={routes}
              selectedSwapRoute={selectedSwapRoute}
              fromTokenInfo={fromTokenInfo}
              toTokenInfo={toTokenInfo}
              loading={loading}
            />
          ) : null}
        </div>
      </div>
    );
  };

export default Form;
