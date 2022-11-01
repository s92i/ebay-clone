import React, { useState, useEffect } from 'react'
import { MediaRenderer, useContract, useListing, useNetwork, useNetworkMismatch, useMakeBid, useOffers, useMakeOffer, useBuyNow, useAddress, useAcceptDirectListingOffer } from '@thirdweb-dev/react'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import { UserCircleIcon } from '@heroicons/react/24/solid'
import { ListingType, NATIVE_TOKENS } from '@thirdweb-dev/sdk'
import Countdown from 'react-countdown'
import network from '../../utils/network'
import { ethers } from 'ethers'

function ListingPage() {
    const router = useRouter()
    const address = useAddress()
    const { listingId } = router.query as { listingId: string }
    const [bidAmount, setBidAmount] = useState('')
    const [, switchNetowrk] = useNetwork()
    const networkMismatch = useNetworkMismatch()

    const [minNextBid, setMinNextBid] = useState<{
        displayValue: string
        symbol: string
    }>()

    const { contract } = useContract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT, 'marketplace')

    const { mutate: makeBid } = useMakeBid(contract)

    const { data: offers } = useOffers(contract, listingId)

    const { mutate: makeOffer } = useMakeOffer(contract)

    const { mutate: buyNow } = useBuyNow(contract)

    const { data: listing, isLoading, error } = useListing(contract, listingId)

    const { mutate: acceptOffer } = useAcceptDirectListingOffer(contract)

    useEffect(() => {
        if (!listingId || !contract || !listing) return

        if (listing.type === ListingType.Auction) {
            fetchMinNextBid()
        }
    }, [listingId, listing, contract])

    const fetchMinNextBid = async () => {
        if (!listingId || !contract) return

        const { displayValue, symbol } = await contract.auction.getMinimumNextBid(listingId)

        setMinNextBid({
            displayValue: displayValue,
            symbol: symbol,
        })
    }

    const formatPlaceholder = () => {
        if (!listing) return

        if (listing.type === ListingType.Direct) {
            return 'Enter offer amount'
        }

        if (listing.type === ListingType.Auction) {
            return Number(minNextBid?.displayValue) === 0 ? 'Enter bid amount' : `${minNextBid?.displayValue} ${minNextBid?.symbol} or more`
        }
    }

    const buyNft = async () => {
        if (!listingId || !contract || !listing) return

        await buyNow({
            id: listingId,
            buyAmount: 1,
            type: listing.type,
        }, {
            onSuccess(data, variables, context) {
                alert('NFT bought successfully')
                console.log('Success', data, variables, context)
                router.replace('/')
            },
            onError(error, variables, context) {
                alert('Error')
                console.log('Error', error, variables, context)
            }
        })
    }

    const createBidOrOffer = async () => {
        try {
            if (networkMismatch) {
                switchNetowrk && switchNetowrk(network)
                return
            }

            if (listing?.type === ListingType.Direct) {
                if (listing.buyoutPrice.toString() === ethers.utils.parseEther(bidAmount).toString()) {
                    console.log('Buyout price met, buying NFT...')
                    buyNft()
                    return
                }
                console.log('Buyout price not met, making offer...')
                await makeOffer(
                    {
                        quantity: 1,
                        listingId,
                        pricePerToken: bidAmount,
                    },
                    {
                        onSuccess(data, variables, context) {
                            alert('Offer made successfully')
                            console.log('Success', data, variables, context)
                            setBidAmount('')
                        },
                        onError(error, variables, context) {
                            alert('Error')
                            console.log('Error', error, variables, context)
                        }
                    }
                )
            }

            if (listing?.type === ListingType.Auction) {
                console.log('Making bid...')

                await makeBid(
                    {
                        listingId,
                        bid: bidAmount,
                    },
                    {
                        onSuccess(data, variables, context) {
                            alert('Bid made successfully')
                            console.log('Success', data, variables, context)
                            setBidAmount('')
                        },
                        onError(error, variables, context) {
                            alert('Error')
                            console.log('Error', error, variables, context)
                        }
                    }
                )
            }
        } catch (error) {
            console.log(error)
        }
    }

    if (isLoading) return (
        <div>
            <Header />
            <div className='text-center animate-pulse text-blue-500'>
                <p>Loading Item</p>
            </div>
        </div>
    )

    if (!listing) {
        return <div>Listing not found</div>
    }

    return (
        <div>
            <Header />
            <main className='max-w-6xl mx-auto p-2 flex flex-col lg:flex-row space-y-10 space-x-5 pr-10'>
                <div className='p-10 mx-auto border lg:mx-0 max-w-md lg:max-w-xl'>
                    <MediaRenderer src={listing?.asset.image} />
                </div>
                <section>
                    <div>
                        <h1 className='text-xl font-bold'>{listing.asset.name}</h1>
                        <p className='text-gray-600'>{listing.asset.description}</p>
                        <p className='flex items-center text-xs sm:text-base'>
                            <UserCircleIcon className='h-5' />
                            <span className='font-bold pr-1'>Seller: </span> {listing.sellerAddress}
                        </p>
                    </div>
                    <div className='grid grid-cols-2 items-center py-2'>
                        <p className='font-bold'>Listing Type:</p>
                        <p>{listing.type === ListingType.Direct ? 'Direct Listing' : 'Auction Listing'}</p>
                        <p className='font-bold'>But it Now Price:</p>
                        <p className='text-4xl font-bold'>{listing.buyoutCurrencyValuePerToken.displayValue}{' '}
                            {listing.buyoutCurrencyValuePerToken.symbol}
                        </p>
                        <button className='col-start-2 mt-2 bg-blue-600 font-bold text-white rounded-full w-44 py-4 px-10' onClick={buyNft}>Buy Now</button>
                    </div>
                    {listing.type === ListingType.Direct && offers && (
                        <div className='grid grid-cols-2 gap-y-2'>
                            <p className='font-bold'>Offers: </p>
                            <p className='font-bold'>{offers.length > 0 ? offers.length : 0}</p>
                            {offers.map((offer) => (
                                <>
                                    <p className='flex items-center ml-5 text-sm italic'>
                                        <UserCircleIcon className='h-3 mr-2' />
                                        {offer.offeror.slice(0, 5) + '...' + offer.offeror.slice(-5)}
                                    </p>
                                    <div>
                                        <p className='text-sm italic' key={offer.listingId + offer.offeror + offer.totalOfferAmount.toString()}>
                                            {ethers.utils.formatEther(offer.totalOfferAmount)}{' '}
                                            {NATIVE_TOKENS[network].symbol}
                                        </p>
                                        {listing.sellerAddress === address && (
                                            <button className='p-2 w-32 bg-red-500/50 rounded-lg font-bold text-xs cursor-pointer' onClick={() => {
                                                acceptOffer({ listingId, addressOfOfferor: offer.offeror }, {
                                                    onSuccess(data, variables, context) {
                                                        alert('Offer accepted successfully')
                                                        console.log('Success', data, variables, context)
                                                        router.replace('/')
                                                    },
                                                    onError(error, variables, context) {
                                                        alert('Error')
                                                        console.log('Error', error, variables, context)
                                                    }
                                                })
                                            }}>Accept Offer</button>
                                        )}
                                    </div>
                                </>
                            ))}
                        </div>
                    )}
                    <div className='grid grid-cols-2 space-y-2 items-center justify-end'>
                        <hr className='col-span-2' />
                        <p className='col-span-2 font-bold'>{listing.type === ListingType.Direct ? 'Make an offer' : 'Bid on this auction'}</p>
                        {listing.type === ListingType.Auction && (
                            <>
                                <p>Current minimum bid:</p>
                                <p className='font-bold'>{minNextBid?.displayValue} {minNextBid?.symbol}</p>

                                <p>Time remaining:</p>
                                <Countdown date={Number(listing.endTimeInEpochSeconds.toString()) * 1000} />
                            </>
                        )}
                        <input type='text' placeholder={formatPlaceholder()} className='border p-2 rounded-lg mr-5' onChange={e => setBidAmount(e.target.value)} />
                        <button className='bg-red-600 font-bold text-white rounded-full w-44 py-4 px-10' onClick={createBidOrOffer}>{listing.type === ListingType.Direct ? 'Offer' : 'Bid'}</button>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default ListingPage