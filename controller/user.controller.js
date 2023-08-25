import AppError from "../utils/apperror.js";
import User from '../model/user.schema.js';
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import emailValidator from 'email-validator';
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
import sendEmail from "../utils/sendmail.js";


const cookieOption = {
    maxAge:7*24*60*60*1000, ///7 days
    httpOnly:true,
}

const register = async (req,res,next)=>{
    try {
        const {name,email,password} = req.body;

        if(!name || !email || !password){
            return next(new AppError("All Fields are required",400));
        }
        

        if(!emailValidator.validate(email)){
            return next(new AppError("Invalid Email id",400));
        }

        const userExist = await User.findOne({email});
        if(userExist){
            return next(new AppError("Already user Registered ",500));
        }

        const user = await User.create({
            name,
            email,
            password,
            profilePic:{
                public_id:"#",
                secure_url:"https://res.cloudinary.com/dkkaj165g/image/upload/v1691595963/blog/pngtree-business-people-avatar-icon-user-profile-free-vector-png-image_1527664_zflele.jpg",
            },
        });

        await user.save();

        user.password=undefined;

        const token = await user.genertateJWTToken();

        res.cookie('token',token,cookieOption);


        const subject = `Registration Successful! Welcome to Our Website`;
        const html = `<!DOCTYPE html>
        <html>
        <head>
            <title>Registration Successful! Welcome to Our Website</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
        
            <div style="background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border: 1px solid #e4e4e4;">
                    <h2 style="color: #333333;">Registration Successful! Welcome to Our Website</h2>
                   
                   <h3 style="background:black;color:white">
                   Dear ${user.name}

We're thrilled to introduce you to QuizPro, your one-stop destination for exciting quizzes that challenge your knowledge and keep you engaged! Get ready to embark on a journey of learning and fun while testing your expertise on a wide range of topics.

Here at QuizPro, we offer a dynamic and user-friendly platform where you can access a diverse collection of quizzes designed to cater to various interests and levels of expertise. Whether you're a trivia enthusiast, a history buff, a pop culture guru, or simply looking to expand your general knowledge, we've got something for everyone.

Registering on QuizPro is quick, easy, and comes with a plethora of benefits:

Access to an Extensive Quiz Library: Choose from a wide range of categories and dive into quizzes that match your interests. Our constantly updated library ensures there's always something new to explore.

Track Your Progress: Create your personalized profile and keep track of your quiz history and achievements. Challenge yourself to improve your scores and climb the leaderboards.

Compete and Compare: Engage in friendly competition with friends, family, and other users. Compare your scores, challenge each other, and celebrate your accomplishments together.

Educational and Enjoyable: QuizPro is not just about fun; it's about learning too! Expand your knowledge while having a great time with our thoughtfully crafted quizzes.</h3>
                </div>
            </div>
        
        </body>
        </html>
        `
        await sendEmail(user.email,subject,html);


        res.status(200).json({
            success:true,
            message:"Registration succsessfull",
            user
        }
        );

    } catch (error) {
        return next(new AppError(error.message,400));
    }    

}

const login = async (req,res,next)=>{

    try {
        const {email,password} = req.body;

        if(!email||!password){
            return next(new AppError("All fields are mandatoty",400));
        }

        if(!emailValidator.validate(email)){
            return next(new AppError("Invalid Email id",400));
        }

        const user = await User.findOne({email}).select('+password');
    
        if(!user || !await user.comparePassword(password)){
            return next(new AppError("Invalid Credentials",400));
        }

        const token = await user.genertateJWTToken();

        res.cookie("token",token,cookieOption);
        user.password=undefined;
        res.status(200).json({
            success:true,
            message:"Logged in Successfully",
            user
        })
    } catch (error) {
        return next(new AppError(error.message,400));
    }
}

const getUser = async (req,res,next)=>{
        try{
            if(!req.user){
                return next(new AppError("Authentication Failed",400));
            }
           
            const {id} = req.user;

            const user = await User.findById(id);

            if(!user){
                return next(new AppError("User Does not Exist",400));
            }

            user.password=undefined;
            res.status(200).json({
                success:true,
                message:"User Fetched Succsessfully",
                user
            });

        }catch(error){
            return next(new AppError(error.message,400));
        }
} 

const updateUser = async(req,res,next)=>{
    try{
        const {id} = req.user;

        const user = await User.findById(id);


        const {name,description,whatsapp,linkedin,instagram,facebook} = req.body;

        /// Updating other user details
        user.name=name;
        user.description=description;
        user.socialLinks = {
            whatsapp,
            linkedin,
            instagram,
            facebook,
        }

        ///Updating the profile picture
        if(req.file){
            await cloudinary.v2.uploader.destroy(user.profilePic.public_id);
            console.log(req.file.path);
            const result = await cloudinary.v2.uploader.upload(req.file.path,{
                folder:'blog',
                width:250,
                height:250,
                gravity:'faces',
                crop:'fill'
            });
            if(result){
                user.profilePic.public_id= result.public_id
                user.profilePic.secure_url=result.secure_url;

                  /// Removing the File From the server
                // fs.rm( `uploads/${req.file.filename}`);
            }
            console.log("Completed")
          
          
        }
        
        await user.save();
        /// Making the password undefined
        user.password=undefined;

        res.status(200).json({
            success:true,
            message:"User Updated Succsessfully",
            user,
        })
    }catch(error){
        return next(new AppError(error.message,400));
    }
}

const resetPassword = async(req,res,next)=>{
    try {
        const {email} = req.body;

        if(!email){
            return next(new AppError("Email is Required",400));
        }


        const user = await User.findOne({email});


        if(!user){
            return next(new AppError("User Does not Exist",400));
        }

    
        const forgotPasswordToken = await user.generatePasswordResetToken();

        await user.save();

        const subject = `Password Reset Request for ${email}`;
        const message = `<!DOCTYPE html>
        <html>
        <head>
            <title>Password Reset Request for [Hello World]</title>
        </head>
        <body>
            <h1>Password Reset Request for [Hello World]</h1>
            <p>Dear [${user.name}],</p>
            <p><a href="">[${forgotPasswordToken}]</a><br>
            <p>We have received a request to reset the password for your account on [Hello World]. If you did not initiate this request, please ignore this email.</p>
        
            <p>If you did request a password reset, please follow the instructions below to reset your password:</p>
        
            <ol>
                <li>Click on the following link to go to the password reset page: <a href="[Password Reset Link]">Password Reset Link</a></li>
                <li>Once on the reset page, enter your new password in the designated field.</li>
                <li>Re-enter the new password to confirm.</li>
                <li>Click on the "Reset Password" button to complete the process.</li>
            </ol>
        
            <p>Please note that for security reasons, the password reset link will expire in [expiration time, e.g., 15 minute]. If you do not reset your password within this time frame, you will need to initiate the reset process again.</p>
        
            <p>If you encounter any issues or need further assistance, please do not hesitate to contact our support team at <a href="mailto:[Support Email Address]">[Support Email Address]</a> or <a href="tel:[Support Phone Number]">[Support Phone Number]</a>.</p>
        
            <p>Thank you for using [Website Name].</p>
        
            <p>Best regards,<br>
            The [Website Name] Team</p>
        
          
            Contact: <a href="mailto:[Contact Email Address]">[Contact Email Address]</a> | Phone: <a href="tel:[Contact Phone Number]">[Contact Phone Number]</a></p>
        </body>
        </html>
        `

        await sendEmail(email,subject,message);

        res.status(200).json({
            success:true,
            message:`You Received an Email to reset password in ${email}`,
        });

    } catch (error) {
       
        return next(new AppError(error.message,400));
    }
}

const changePassword = async (req,res,next)=>{
    
    try {
        const {newPassword} = req.body;
        const {resetToken} = req.params;

        console.log(resetToken)

        if(!newPassword){
            return next(new AppError("Password is Required",400));
        }

        if(!resetToken){
            return next(new AppError("Unauthorized Request",400));
        }

        const user = await User.findOne({forgotPasswordToken:resetToken});

        if(!user){
            return next(new AppError("User Does Not exist",400));
        }

        user.password=newPassword;
        user.forgotPasswordToken =undefined;

        await user.save();


        res.status(200).json({
            success:true,
            message:"Password Updated Successfully"
        });

    } catch (error) {
        return next(new AppError(error.message,400));
    }


}

const deleteUser = async(req,res,next)=>{
    try {
            const {id} = req.user;

            const user = await User.findByIdAndDelete(id);

            if(!user){
                return next(new AppError("something went wrong",400));
            }
 
            res.status(200).json({
                success:true,
                message:"User Deleted Succsessfully",
            });

    } catch (error) {
        return next(new AppError(error.message,400));
    }
}

const logout = async(req,res,next)=>{
    try {
        res.cookie('token',null);
        res.status(200).json({
            success:true,
            message:"Logout Successfully",
        })
    } catch (error) {
        return next(new AppError("Invalid Request",500));
    }
}

export {
    register,
    login,
    getUser,
    updateUser,
    changePassword,
    resetPassword,
    deleteUser,
    logout
}