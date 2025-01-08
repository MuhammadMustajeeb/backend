import mongoose, {isValidObjectId} from "mongoose"
import { Like } from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id;
    //TODO: toggle like on video
    
    // check if valid id
    if ( !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid videoId")
    }

    // check if video found
    const video = await Video.findById(videoId);
    if ( !video ) {
        throw new ApiError(404, "Video not found")
    }

    // check if like already done so remove it
    const beforeLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    }) 

    if ( beforeLike ) {
        await beforeLike.remove();

        return res.status(200).json(
            new ApiResponse(200, null, "Like removed from video successfully")
        )
    }

    // create new like
    const afterLike = await Like.create({
        video: videoId,
        likedBy: userId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, afterLike, "New like has been done on video successfully")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    // check if valid commentId
    if ( !isValidObjectId(commentId) ) {
        throw new ApiError(400, "Invalid CommentId");
    }

    // check if comment found
    const comment = await Comment.findById(commentId);
    if ( !comment ) {
        throw new ApiError(404, "Comment not found")
    }

    // check if like already done so remove it
    const beforeLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if ( beforeLike ) {
        await beforeLike.remove();

        return res.status(200).json(
            new ApiResponse(200, null, "like remove from comment successfully")
        )
    }

    // create new like
    const afterLike = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, afterLike, "New like has been done on comment successfully")
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    // check if valid tweetId
    if ( !isValidObjectId(tweetId) ) {
        throw new ApiError(400, "Invalid tweetId");
    }

    // check if comment found
    const tweet = await Tweet.findById(tweetId);
    if ( !tweet ) {
        throw new ApiError(404, "Tweet not found")
    }

    // check if like already done so remove it
    const beforeLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if ( beforeLike ) {
        await beforeLike.remove();

        return res.status(200).json(
            new ApiResponse(200, null, "like remove from tweet successfully")
        )
    }

    // create new like
    const afterLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, afterLike, "New like has been done on tweet successfully")
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideoAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
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
                    }
                ]
            }
        },
        {
            $unwind: "videoDetails"
        },
        {
            $sort: {
                [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $project: {
                _id: 0,
                videoDetails: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, likedVideoAggregate, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}