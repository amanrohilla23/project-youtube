import { user } from "../models/user.models.js";
import { API } from "../utils/Apierrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT= asyncHandler(async(req,res,next)=>{
    try {
        const token=req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new API(401,"No token provided")
        }
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const newuser=await user.findById(decodedToken?._id).select("-password -refreshToken")
        if(!newuser){
            throw new API(401,"invalid Access Token")
        }
        req.newuser=newuser;
        next()
    } catch (error) {
        throw new API(401,error?.message || "invalid access token")
        
    }


})
