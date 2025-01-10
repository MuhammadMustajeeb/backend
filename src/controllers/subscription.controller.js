import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    // check if it's valid channelId
    if ( !isValidObjectId(channelId) ) {
        throw new ApiError(400, "Invalid channelId")
    }

    // check if already subscribed
    const alreadySubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    })
    
    if ( alreadySubscribed ) {
        await alreadySubscribed.remove();

        return res.status(200).json(
            new ApiResponse(200, null, "unSubscribed Successfully")
        )
    }

    // new subscribe
    const newSubscriber = await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, newSubscriber, "Subscribed successfully")
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    
    // check if valid channel Id
    if ( !isValidObjectId(channelId) ) {
        throw new ApiError(400, "Invalid channelId");
    }

    // check if channel found
    const channel = await User.findById(channelId);
    if ( !channel ) {
        throw new ApiError(404, "channel not found");
    }

    // check subscriber
    const subscribers = await Subscription.find({
        channel: channelId
    }).populate('subscriber', 'username fullName email avatar')

    if ( !subscribers.length ) {
        throw new ApiError(404, "No subscribers on this channel")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribers, "All subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    // check if valid subscriber Id
    if ( !isValidObjectId(subscriberId) ) {
        throw new ApiError(400, "Invalid subscriber Id")
    }

    // check if subscriber found
    const subscriber = await User.findById(subscriberId);
    if ( !subscriber ) {
        throw new ApiError(400, "subscriber not found")
    }

    // check channels
    const subscribedChannels = await Subscription.find({
        subscriber: subscriberId
    }).populate('channel', 'username fullName email avatar')

    if ( !subscribedChannels ) {
        throw new ApiError(404, "No subscribed channels found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}