import mongoose, {isValidObjectId} from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if ( !name || !description ) {
        throw new ApiError(400, "name and description are required");
    }

    //TODO: create playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if ( !playlist ) {
        throw new ApiError(500, "Failed to create playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist created sucessfully")
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    if ( !isValidObjectId(userId) ) {
        throw new ApiError(400, "Invaid user id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $addFields: {
                $totalVideos: {
                    $size: "$videos"
                },
                $totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
                updatedAt: 1,
            }
        }
    ])

    if ( !playlist.length ) {
        return res.status(200).json( new ApiResponse(200, [], "No playlist found for user"))
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "User Playlist fetched successfully")
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if ( !isValidObjectId(playlistId) ) {
        throw new ApiError(400, "Invalid playlistId")
    }

    // check if playlist exists
    const playlistExists = await Playlist.findById(playlistId);

    if ( !playlistExists ) {
        throw new ApiError(404, "Playlist not found")
    }

    // now getPlaylistById
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                $totalVideos: {
                    $size: "$videos"
                },
                $totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1,
                updatedAt: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                },
                owner: {
                    fullName: 1,
                    username: 1,
                    "avatar.url": 1,
                }
            }
        }
    ])

    if ( !playlist.length ) {
        return res.status(200).json( new ApiResponse(200, [], "No playlist found"))
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    // check if playlistId & videoId is valid
    if ( !isValidObjectId(playlistId) || !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid playlistId or videoId")
    }

    // if video exists
    const video = await Video.findById(videoId);
    if ( !video ) {
        throw new ApiError(404, "Video not found")
    }

    // if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if ( !playlist ) {
        throw new ApiError(404, "Playlist not found")
    }

    // add video in playlist
    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        { new: true }
    )

    if ( !addVideoToPlaylist ) {
        throw new ApiError(500, "Failed to add video in your playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, addVideoToPlaylist, "Video added in playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    // check if playlistId & videoId is valid
    if ( !isValidObjectId(playlistId) || !isValidObjectId(videoId) ) {
        throw new ApiError(400, "Invalid playlistId or videoId")
    }

    // if video exists
    const video = await Video.findById(videoId);
    if ( !video ) {
        throw new ApiError(404, "Video not found")
    }

    // if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if ( !playlist ) {
        throw new ApiError(404, "Playlist not found")
    }

    // remove video from playlist
    const removeVideoPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            }
        },
        { new: true }
    )

    if ( !removeVideoPlaylist ) {
        throw new ApiError(500, "Failed to remove video from your playlist")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, removeVideoPlaylist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    // check if playlistId is valid
    if ( !isValidObjectId(playlistId) ) {
        throw new ApiError(400, "Invalid playlistId")
    }

    // if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if ( !playlist ) {
        throw new ApiError(404, "Playlist not found")
    }

    // check if user authorizesd
    if ( playlist.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(400, "You are not authorized to delete playlist")
    }

    // for playlist delete
    const removePlaylist = await Playlist.findByIdAndDelete(playlistId)
    
    if ( !removePlaylist ) {
        throw new ApiError(500, "Failed to delete playlist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, removePlaylist, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if ( !name || !description ) {
        throw new ApiError(400, "name and description are required");
    }

    // check if playlistId is valid
    if ( !isValidObjectId(playlistId) ) {
        throw new ApiError(400, "Invalid playlistId")
    }

    // if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if ( !playlist ) {
        throw new ApiError(404, "Playlist not found")
    }

    // check if user authorizesd
    if ( playlist.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError(400, "You are not authorized to update playlist")
    }

    // for updation
    const playlistUpdate = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlistUpdate, "Playlist updated successfully")
    )

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}