import mongoose from 'mongoose';
import { Video } from '../models/video.model.js';
import { Subscription } from "../models/subscription.model.js";
import { Like } from '../models/like.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const { channelId } = req.params;

    // get the user id
    const user = req.user?._id;

    if ( !user ) {
        throw new ApiError(404, "Channel not found");
    }

    // get the total subscribers
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                subscribersCount: { $sum: 1 }
            }
        }
    ]);
    
    // check if the channel has any subscribers
    const totalSubscribersCount = totalSubscribers[0]?.subscribersCount || 0;
    
    // get the total videos 
    const totalVideos = await Video.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                videosCount: { $sum: 1 }
            }
        }
    ])

    // check if the channel has any videos
    const totalVideosCount = totalVideos[0]?.videosCount || 0;

    // get the total views
    const totalViews = await Video.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                viewsCount: { $sum: "$views" }
            }
        }
    ])

    // check if the channel has any views
    const totalViewsCount = totalViews[0]?.viewsCount || 0;

    // get the total likes
    const totalLikes = await Like.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                likesCount: { $sum: "$likes" }
            }
        }
    ])

    // check if the channel has the likes
    const totalLikesCount = totalLikes[0]?.likesCount || 0;

    return res
    .status(200)
    .json(
        new ApiResponse(200, 
            {
                totalSubscribersCount,
                totalVideosCount,
                totalViewsCount,
                totalLikesCount
            }, 
            "Channel stats found successfully"
        )
    )

});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { channelId } = req.params;

    // get the user id
    const user = req.user?._id;

    if ( !user ) {
        throw new ApiError(404, "Channel not found");
    }

    // get all the videos
    const videos = await Video.find({ channel: channelId });

    // check if the channel has any videos
    if ( videos.length === 0 ) {
        return res
        .status(200)
        .json(
            new ApiResponse(200, [], "No videos uploaded by the channel")
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, "All videos found successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }