import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async(req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        const file = req.file;
        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: 'User already exist with this email.',
                success: false,
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: cloudResponse.secure_url,
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
    }
}
export const login = async(req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        };
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            })
        };
        // check role is correct or not
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            })
        };

        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        }

        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: 'strict' }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const logout = async(req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}

export const updateProfile = async(req, res) => {
        try {
            const { fullname, email, phoneNumber, bio, skills } = req.body;

            let cloudResponse;
            const file = req.file;
            if (file) {

                const fileUri = getDataUri(file);

                try {
                    // Determine resource type based on file mimetype
                    if (file.mimetype === 'application/pdf') {
                        console.log("4");
                        cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
                            resource_type: 'raw',
                            format: 'pdf',
                            type: 'upload'
                        });
                        console.log("5");
                    } else {
                        console.log("6");
                        // For images (profile photos)
                        cloudResponse = await cloudinary.uploader.upload(fileUri.content);
                        console.log("7");
                    }
                } catch (cloudinaryError) {
                    console.error("Cloudinary upload error:", cloudinaryError);
                    return res.status(400).json({
                        message: "File upload failed",
                        success: false
                    });
                }
            }

            let skillsArray;
            if (skills) {
                skillsArray = skills.split(",");
            }

            const userId = req.id; // middleware authentication
            let user = await User.findById(userId);

            if (!user) {
                return res.status(400).json({
                    message: "User not found.",
                    success: false
                });
            }

            // updating data
            if (fullname) user.fullname = fullname;
            if (email) user.email = email;
            if (phoneNumber) user.phoneNumber = phoneNumber;
            if (bio) user.profile.bio = bio;
            if (skills) user.profile.skills = skillsArray;

            // Handle file upload
            if (cloudResponse) {
                if (file.mimetype === 'application/pdf') {
                    user.profile.resume = cloudResponse.secure_url; // save the cloudinary url for PDF
                    user.profile.resumeOriginalName = file.originalname; // Save the original file name
                } else {
                    // For profile photo
                    user.profile.profilePhoto = cloudResponse.secure_url;
                }
            }

            await user.save();

            user = {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                profile: user.profile
            };

            return res.status(200).json({
                message: "Profile updated successfully.",
                user,
                success: true
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: "Error updating profile",
                success: false
            });
        }
    }
    // export const updateProfile = async(req, res) => {
    //     try {
    //         const { fullname, email, phoneNumber, bio, skills } = req.body;


//         let cloudResponse;
//         const file = req.file;
//         if (file) {
//             const fileUri = getDataUri(file);
//             // Check if the file is a PDF for resume upload                // Upload PDF with proper resource type for documents
//             cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
//                 resource_type: 'pdf',
//                 format: 'pdf',
//                 type: 'upload'
//             });

//         }

//         let skillsArray;
//         if (skills) {
//             skillsArray = skills.split(",");
//         }
//         const userId = req.id; // middleware authentication
//         let user = await User.findById(userId);

//         if (!user) {
//             return res.status(400).json({
//                 message: "User not found.",
//                 success: false
//             })
//         }
//         // updating data
//         if (fullname) user.fullname = fullname
//         if (email) user.email = email
//         if (phoneNumber) user.phoneNumber = phoneNumber
//         if (bio) user.profile.bio = bio
//         if (skills) user.profile.skills = skillsArray

//         // Handle resume upload
//         if (cloudResponse) {
//             if (file.mimetype === 'application/pdf') {
//                 user.profile.resume = cloudResponse.secure_url // save the cloudinary url for PDF
//                 user.profile.resumeOriginalName = file.originalname // Save the original file name
//             } else {
//                 // For profile photo
//                 user.profile.profilePhoto = cloudResponse.secure_url
//             }
//         }

//         await user.save();

//         user = {
//             _id: user._id,
//             fullname: user.fullname,
//             email: user.email,
//             phoneNumber: user.phoneNumber,
//             role: user.role,
//             profile: user.profile
//         }

//         return res.status(200).json({
//             message: "Profile updated successfully.",
//             user,
//             success: true
//         })
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             message: "Error updating profile",
//             success: false
//         });
//     }
// }