import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import apiError from "../utils/ApiError.js"
import apiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const video = await Video.findById(videoId)

    if ( !video ) {
        throw new apiError(400, "video does not exist")
    }

    const commentsAggregate = await User.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)  // get comments for a video
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerBio"
            }
        },
        {
            $project: {
                content: 1,
                created: 1,
                ownerBio: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(commentsAggregate,options);

    if ( !comments ) {
        throw new apiError(404, "comments not found")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, comments, "all comments found successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { videoId } = req.params;
    const { content } = req.body;

    if ( !content ) {
        throw new apiError(400, "content is requireed");
    }

    const video = await Video.findById(videoId);

    if ( !video ) {
        throw new apiError(404, "video not found");
    }

    const comment = new Comment.create({
        content,
        owner: req.user._id,
        video: videoId
    })

    if ( !comment ) {
    throw new apiError(500, "comment not added successfully");
    }

    return res
    .status(201)
    .json(
        new apiResponse(201, comment, "comment added successfully")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    // find id of the comment
    const { commentId } = req.params;
    const { content } = req.body;

    if ( !content ) {
        throw new apiError(400, "content is required");
    }

    // find the comment
    const comment = await Comment.findById(commentId);

    if ( !comment ) {
        throw new apiError(404, "comment not found");
    }

    // check if the user is the owner of the comment
    if ( comment.owner.toString() !== req.user._id.toString() ) {
        throw new apiError(403, "you are not allowed to update the comment");
    }

    // now update the comment
    const updatedComment = await Commment.findbyIdandUpdate({
        _id: commentId,
        content,
        new: true
    })

    if ( !updatedComment ) {
        throw new apiError(500, "comment not updated successfully");
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, updatedComment, "comment updated successfully")
    )
    
    })

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    // find id of the comment
    const { commentId } = req.params;

    // find the comment
    const comment = await Comment.findById(commentId);

    if ( !comment ) {
        throw new apiError(404, "comment not found to delete");
    }

    // check if the user is the owner of the comment
    if (comment?.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "you are not allowed to delete the comment");
    }

    // now delete the comment
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    await Comment.deleteOne({ _id: commentId });

    if ( !deletedComment ) {
        throw new apiError(500, "comment not deleted successfully");
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, deletedComment, "comment deleted successfully")
    )

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }