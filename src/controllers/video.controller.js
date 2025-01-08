import mongoose, { isValidObjectId }  from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import uploadOnCloudinary from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const user = isValidObjectId(userId) ? userId : null

    if ( !user ) {
        throw new ApiError(400, "Invalid user id");
    }

    const videoAggregate = await Video.aggregate([
        {
            $match: {
                // Filter based on query
                title: {
                    $regex: query || "",
                    $options: "i",
                },
                // Filter based on user
                owner: new mongoose.Types.ObjectId(user),
            }
        },
        {
            $lookup: {
                from : "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $sort: {
                [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
                isPublished: 1,
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videos = await Video.aggregatePaginate(videoAggregate, options)

    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, "Videos retrieved successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    // Get all details
    if (
        [ title, description ].some((field) => field?.trim() === "") 
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Get video file
    const videoFileLocalPath = req.files?.videoFile[0]?.path;

    if ( !videoFileLocalPath ) {
        throw new ApiError(400, "video file is missing");
    }

    // Get thumbnail file
    const thumbnailFileLocalPath = req.files?.thumbnail[0]?.path;

    if ( !thumbnailFileLocalPath ) {
        throw new ApiError(400, "thumbnial file is missing");
    }

    // Upload video to cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    if ( !videoFile ) {
        throw new ApiError(500, "Failed to upload video");
    }

    // upload thumbnail to cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);

    if ( !thumbnail ) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    // Create video
    const videoCreate = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        duration: req.body.duration || 0,
    })

    // 

    return res
    .status(201)
    .json(
        new ApiResponse(200, videoCreate, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if ( !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId).populate('owner', 'username avatar');

    if ( !video ) {
        throw new ApiError(404, "Video not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video retrieved successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if ( !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid video id");
    }

    // check if video exists
    const videoExists = await Video.findById(videoId);

    if ( !videoExists ) {
        throw new ApiError(404, "Video not found");
    }

    // check if user is the owner of the video
    if ( videoExists.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    // for updating video details
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            title: req.body.title,
            description: req.body.description,
            thumbnail: req.body.thumbnail,
        },
        { new: true }
    )

    if ( !video) {
        throw new ApiError(500, "Failed to update video");
    }

    return res
    .status(200)
    .update(
        new ApiResponse(200, video, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if ( !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid video id");
    }

    // check if video exists
    const videoExists = await Video.findById(videoId);

    if ( !videoExists ) {
        throw new ApiError(404, "Video not found");
    }

    // check if user is the owner of the video
    if ( videoExists.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(403, "You are not the owner of this video so you can't delete it")
    }

    // delete video from cloudinary
    await deleteVideoFromCloudinary(videoExists.videoFile);
    await deleteVideoFromCloudinary(videoExists.thumbnail);

    // delete video
    const video = await Video.findByIdAndDelete(videoId);

    if ( !video ) {
        throw new ApiError(500, "Failed to delete video");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if ( !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid video id");
    }

    // check if video exists
    const videoExists = await Video.findById(videoId);

    if ( !videoExists ) {
        throw new ApiError(404, "Video not found");
    }

    // check if the user is the owner of the video
    if ( videoExists.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(403, "You can't toggle the publish status of this video");
    }

    // toggle publish status
    const togglePublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !videoExists.isPublished
            }
        },
        { new: true }
    )

    if ( !togglePublishStatus ) {
        throw new ApiError(500, "Failed to toggle publish status");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, togglePublishStatus, "Publish status toggled successfully")
    )

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}