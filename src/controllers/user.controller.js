import asyncHandler from "../utils/asyncHandler.js";
import apiError from '../utils/apiError.js';
import { User } from "../models/user.model.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import apiResponse from '../utils/apiResponse.js';
import req from "express/lib/request.js";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

// access and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }
    catch (err) {
        throw new apiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler( async(req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create usesr object, create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // get user details from frontend
    const { fullName, username, email, password } = req.body;
    // console.log("email: ", email);

    // validation - not empty
    if (
        [fullName, username, email, password].some((field) => 
        field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required")
    }

    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }
    // console.log(req.files)

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required")
    }

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
    }

    // create usesr object, create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering the user")
    }

    // return res
    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Successfully")
    )


})

const loginUser = asyncHandler( async(req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token 
    // send cookie

    // req body -> data
    const { email, username, password } = req.body;
    console.log(email);

    // username or email
    if ( !username && !email ) {
        throw new apiError(400, "username or email is required")
    }

    // find the user
    const user = await User.findOne({
        $or: [{username}, {email}]      // $or is a mongodb operator
    })

    if (!user) {
        throw new apiError(404, "user does not exist")
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid user credentials")
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // send cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1   // this remove the field from document $unset: mongodb operator
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(
            200,
            {},
            "User logged Out"
        )
    )


})

// For sending new Refresh Token
const refreshAccessToken = asyncHandler( async(req, res) => {
    
    const inComingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!inComingRefreshToken) {
        throw new apiError(401, "unauthorized request");
    }

    try {
        // for verify
        const decodedToken = jwt.verify(
            inComingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        // for user access 
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new apiError(401, "Invalid refresh token");
        }
    
        // check if userRefreshToken and inComingRefreshToken vary
        if (inComingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or used")
        }
    
        // then create new refreshToken for send to user
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Refresh Token");
    }

})

const changeCurrentPassword = asyncHandler( async(req, res) => {

    const { oldPassword, newPassword } = req.body;

    // find user by auth.middleware
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(400, "Invalid old password")
    }

    // for create new password
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password change successfully"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler( async(req, res) => {

    const { fullName, email } = req.body

    if ( !fullName || !email ) {
        throw new apiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")    // .select() mean "except this"

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"))
})

// for file updation by using multer.middleware
const updateUserAvatar = asyncHandler( async(req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing")
    }

    // then upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apiError(400, "Error while uploading on avatar")
    }

    // for avatar updation
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar updated successfully")
    )
})

// for file updation by using multer.middleware
const updateUserCoverImage = asyncHandler( async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover Image file is missing")
    }

    // then upload on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading on cover image")
    }

    // for avatar updation
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Cover image updated successfully")
    )
})

// mongodb aggregation pipeline
const getUserChannelProfile = asyncHandler( async(req, res) => {

    // it's like get username from url
    const { username } = req.params

    if (!username?.trim()) {
        throw new apiError(400, "username is missing")
    }

    // get aggregate: a method that pass Array, pipeline: like $lookup etc.
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",  // get from model
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"   // name of pipeline
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"   // for count $ itself field
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},  // $in operator for calc in arr,obj
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,   // 1 means it's exist
                username: 1,
                email: 1,
                coverImage: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new apiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, channel[0], "User channel fetched successfully")
    )
})

// mongodb aggregation sub pipeline
const getWatchHistory = asyncHandler( async(req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id) // get id by using 'new' keyword for object | get user access
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // for nested $lookup(pipeline) for 'owner' in video model
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // like sub pipeline
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    // for frontend ease, override owner
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json( new apiResponse(200, user[0].watchHistory, "Watch history fetched successfully") )

})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory 
}