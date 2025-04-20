import { asyncHandler } from "../utils/asyncHandler.js";
import { API } from "../utils/Apierrors.js";
import {user} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/Apiresponse.js";

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

export {
    registerUser,
}
 