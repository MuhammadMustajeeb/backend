import asyncHandler from "../utils/asyncHandler.js";
import apiError from '../utils/apiError.js';
import { User } from "../models/user.model.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import apiResponse from '../utils/apiResponse.js';

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
    const { email, username, password } = req.body

    // username or email
    if (!username || !email) {
        throw new apiError(400, "username or email is required")
    }

    // find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]      // $or is a mongodb operator
    })

    if (!user) {
        throw new apiError(404, "user does not exist")
    }

    // password check
    const isPasswordInvalid = await user.isPasswordCorrect(password);

    if (!isPasswordInvalid) {
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
            $set: {
                refreshToken: undefined   // for update value $set: mongodb operator
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

export { registerUser, loginUser, logoutUser }