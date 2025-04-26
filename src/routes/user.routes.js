import { Router } from "express";
import { loginUser, registerUser,logoutUser ,refreshAccesstoken, changeCurrenPassword, getCurrentUser, updateDetails, updateUserAvatar, updateUserCoverimage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getRounds } from "bcrypt";

const router=Router();
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverimage",
            maxCount:1

        },
        
    ]),
    registerUser 
) 
router.route("/login").post( loginUser)

//secured routes 
router.route("/logout").post(verifyJWT,logoutUser) 

router.route("/refresh-token").post(refreshAccesstoken)
router.route("/change-password").post(verifyJWT,changeCurrenPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverimage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)



export default router
