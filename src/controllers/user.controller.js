import { asyncHandler } from "../utils/asyncHandler.js";
import { API } from "../utils/Apierrors.js";
import {user} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

//making a seprate method for generating access and refresh token for reuseable code 
const generateAccessandRefreshToken= async(userId)=>{
    try {
        const newUser=await user.findById(userId)
        const accessToken=newUser.generateAccessToken()
        const refreshToken= newUser.generateRefreshToken()

        newUser.refreshToken=refreshToken
        newUser.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
        
        
    } catch (error) {
        throw new API(500,"something went worng while generating refresh and access token")
    }

}

const registerUser= asyncHandler( async (req,res)=>{
   // get user details from frontend
   // validation- not empty
   // check if user already exists -> username,email
   // check for images , check for avatar
   // create userobject - create entry in db 
   // remove password and refresh token fiels from response
   // check for user creation 
   //return res

   const {fullname,email,username,password}=req.body
   console.log("email",email)
   if([fullname,email,username,password].some((field)=>field?.trim()==="")){
        throw new API(400,"all fields are required");
   }

   const existeduser= await user.findOne({
    $or:[ { username },{ email } ]

   })
   if(existeduser){
    throw new API(409,"User with email or username already existed")
   }

   const avatarlocalpath=req.files?.avatar[0]?.path;
   const coverimagelocalpath=req.files?.coverimage[0]?.path;
   if(!avatarlocalpath) {
    throw new API(400,"avatar file is required")  
   }
    const avatar=await uploadOnCloudinary(avatarlocalpath);
    const coverimage=await uploadOnCloudinary(coverimagelocalpath);

    if (!avatar ) {
        throw new API(400,"Avatar is required ")
        
    }
   const newUser=await user.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    
    const createduser = await user.findById(newUser._id).select(
        "-password -refreshToken"
    )
    if(!createduser){
        throw new API(500,"something went wrong while registering the user ")
    }
    return res.status(201).json(
        new APIResponse(200,createduser,"user registeres successfully ")
    )


    

})
const loginUser=asyncHandler(async(req,res)=>{
    // take data from req.body
    //username or email
    // find the user
    //password check
    // access token and generate token
    // send cookie
    const {email,username,password}=req.body
    if(!username && !email) {
        throw new API(400,"please enter either username or email")
    }
    const newUser=await user.findOne({
        $or:[{username},{email}]
    })
    if(!newUser){
        throw new API(404,"User does not exist") 
    }
    const isPasswordValid=await newUser.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new API(401,"wrong password")
    }
    const {accessToken,refreshToken}=await generateAccessandRefreshToken(newUser._id)

    const logedInUser=await user.findById(newUser._id).select("-password -refreshToken")
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options).
    cookie("refreshToken",refreshToken,options).
    json(
        new APIResponse(200,
            {
                user:logedInUser,accessToken,refreshToken

            },
            "User logged in successfully"
        )
    )
    




})
const logoutUser=asyncHandler(async(req,res)=>{
    await user.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },

            {
                new:true
            }


    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
    .json(new APIResponse(200,{},"User logged out successfully"))
    
})

const refreshAccesstoken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new API(401,"unautharized req ")
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const founduser=await user.findById(decodedToken?._id)
        if(!founduser){
            throw new API(401,"invalid refresh token ")
        }
    
        if(incomingRefreshToken!=user?.refreshToken){
            throw new API(401,"Refresh token expired or used")
        }
        const options={
            httpOnly:true,
            secure:true
        }
         const {accessToken,NewrefreshToken}=await generateAccessandRefreshToken(user._id)
         return res.status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",NewrefreshToken,options)
         .json(
            new APIResponse(
                200,
                {accessToken,refreshToken:NewrefreshToken},
                "access token refreshed"
            
            )
         )
    } catch (error) {
        throw new API(401,error?.message || "invalid refresh token")
        
    }








})

const changeCurrenPassword=asyncHandler(async (req,res)=>{
    const{oldPassword,newPassword}=req.body

   const gotuser=await user.findById(req.newuser?._id)
   const isPasswordCorrect=await gotuser.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
    throw new API(400,"wrong old password")
   }
   gotuser.password=newPassword;
   await gotuser.save({validateBeforeSave:false})
   return res.status(200).json(new APIResponse(200,{},"password changes successfully "))



})
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new APIResponse(200,req.newuser,"current user fetched succesfully"))
})

const updateDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body
    if(!fullname || !email){
        throw new API(400,"All fields are mandatory")
    }
    const founduser=await user.findByIdAndUpdate(req.newuser?._id,
        {
            $set:{
                fullname:fullname,
                email:email
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new APIResponse(200,founduser,"acc details updated successfully"))

})
const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarlocalPath=req.file?.path;
    if(!avatarlocalPath){
        throw new API(400,"avatar file is missing ")
    }
    const avatar=await uploadOnCloudinary(avatarlocalPath);
    if(!avatar.url){
        throw new API(400,"Error while uploading on avatar");
    }
    const newuser=await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}

    ).select("-password")
    return res.status(200).json(new APIResponse(200,newuser,"Avatar successuly updated "))

})
const updateUserCoverimage=asyncHandler(async(req,res)=>{
    const coverimagelocalpath=req.file?.path;
    if(!coverimagelocalpath){
        throw new API(400,"avatar file is missing ")
    }
    const coverimage=await uploadOnCloudinary(coverimagelocalpath);
    if(!coverimage.url){
        throw new API(400,"Error while uploading on avatar");
    }
   const newuser= await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimage:coverimage.url
            }
        },
        {new:true}


    ).select("-password")
    return res.status(200).json(new APIResponse(200,newuser,"coverimage successuly updated "))





})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const{username}=req.params
    if(!username?.trim()){
        throw new API(400,"username is missing ")
    }
    const channel=await user.aggregate([
        {
            $match:{
                username:username?.toLowerCase(),

            }
        },
        {
            $lookup:{
                from:"subs",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subs",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers",

                },
                channelSubscribedTocount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $project:{
                fullname:1,
                username:1,
                subscriberCount:1,
                channelSubscribedTocount:1,
                isSubscribed:1,
                avatar:1,
                coverimage:1


        }
    }

    ])
    if(!channel?.length){
        throw new API(401,"Channel does not exists")

    }
    return res.status(200).json(new APIResponse(200,channel[0],"user channel fetched successfully"))
})

const getWatchHistory= asyncHandler( async(req,res)=>{
    const User=await user.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }

        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1

                                    }
                                }
                                
                            ]
                        }

                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    res.status(200).json(new APIResponse(
        200,
        User[0].watchHistory,"watch history fetched "
    ))
})
    



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    changeCurrenPassword,
    getCurrentUser,
    updateDetails,
    updateUserAvatar,
    updateUserCoverimage,
    getUserChannelProfile,
    getWatchHistory


}
 