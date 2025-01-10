import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;

    if ( !content ) {
        throw new ApiError(400, "content is required");
    }

    // tweet creation
    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if ( !tweet ) {
        throw new ApiError(500, "Failed to create tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweets created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params

    if ( !isValidObjectId(userId) ) {
        throw new ApiError(400, "Invaid user id");
    }

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $sort: {
                [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                ownerDetails: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ])

    if ( !userTweets.length ) {
        return res.status(200).json( new ApiResponse(200, [], "No tweets found for user"))
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, userTweets, "All tweets of user fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;

    // check if playlistId is valid
    if ( !isValidObjectId(tweetId) ) {
        throw new ApiError(400, "Invalid tweetId")
    }

    if ( !content ) {
        throw new ApiError(400, "content is required");
    }

    // check if tweet already exist
    const tweet = await Tweet.findById(tweetId);
    if ( !tweet ) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if user authorizesd
    if ( tweet.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(400, "You are not authorized to update tweet")
    }

    // update Tweet
    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if ( !newTweet ) {
        throw new ApiError(400, "Tweet can't update successfully");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, newTweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    // check if playlistId is valid
    if ( !isValidObjectId(tweetId) ) {
        throw new ApiError(400, "Invalid tweetId")
    }

    // check if tweet already exist
    const tweet = await Tweet.findById(tweetId);
    if ( !tweet ) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if user authorizesd
    if ( tweet.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(400, "You are not authorized to delete tweet")
    }

    const tweetDeletion = await Tweet.findByIdAndDelete(tweetId);
    
    if ( !tweetDeletion ) {
        throw new ApiError(400, "Failed to delete this tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweetDeletion, "Tweet deleted successfully")
    )

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}